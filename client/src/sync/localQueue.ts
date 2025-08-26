import localforage from 'localforage';
import { v4 as uuidv4 } from 'uuid';
import { syncAPI } from '../api/sync';

export interface QueuedOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'task' | 'note' | 'project';
  data: any;
  tempId?: string;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

export interface SyncResult {
  success: boolean;
  serverData?: any;
  error?: string;
  conflicts?: any[];
}

class LocalSyncQueue {
  private queueKey = 'syncQueue';
  private lastSyncKey = 'lastSync';
  private isProcessing = false;
  private listeners: Array<(operations: QueuedOperation[]) => void> = [];
  
  constructor() {
    // Configure localforage
    localforage.config({
      name: 'TaskManagerSync',
      version: 1.0,
      storeName: 'syncQueue'
    });
  }
  
  // Add operation to queue
  async addOperation(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retries'>): Promise<string> {
    const queuedOp: QueuedOperation = {
      ...operation,
      id: uuidv4(),
      timestamp: Date.now(),
      retries: 0,
      maxRetries: operation.maxRetries || 3
    };
    
    const queue = await this.getQueue();
    queue.push(queuedOp);
    
    await localforage.setItem(this.queueKey, queue);
    this.notifyListeners(queue);
    
    // Try to process queue if online
    if (navigator.onLine) {
      this.processQueue();
    }
    
    return queuedOp.id;
  }
  
  // Get current queue
  async getQueue(): Promise<QueuedOperation[]> {
    const queue = await localforage.getItem<QueuedOperation[]>(this.queueKey);
    return queue || [];
  }
  
  // Clear specific operation from queue
  async removeOperation(operationId: string): Promise<void> {
    const queue = await this.getQueue();
    const filteredQueue = queue.filter(op => op.id !== operationId);
    
    await localforage.setItem(this.queueKey, filteredQueue);
    this.notifyListeners(filteredQueue);
  }
  
  // Clear entire queue
  async clearQueue(): Promise<void> {
    await localforage.setItem(this.queueKey, []);
    this.notifyListeners([]);
  }
  
  // Process queue and sync with server
  async processQueue(): Promise<SyncResult[]> {
    if (this.isProcessing || !navigator.onLine) {
      return [];
    }
    
    this.isProcessing = true;
    const results: SyncResult[] = [];
    
    try {
      const queue = await this.getQueue();
      
      if (queue.length === 0) {
        return results;
      }
      
      // Group operations by entity type for batch processing
      const operationsByEntity = queue.reduce((acc, op) => {
        if (!acc[op.entity]) acc[op.entity] = [];
        acc[op.entity].push(op);
        return acc;
      }, {} as Record<string, QueuedOperation[]>);
      
      // Process each entity type
      for (const [entity, operations] of Object.entries(operationsByEntity)) {
        try {
          const batchResult = await this.processBatch(entity, operations);
          results.push(...batchResult);
          
          // Remove successfully processed operations
          const successfulIds = batchResult
            .filter(r => r.success)
            .map((_, index) => operations[index].id);
          
          for (const id of successfulIds) {
            await this.removeOperation(id);
          }
          
          // Increment retry count for failed operations
          const failedOps = operations.filter((op, index) => !batchResult[index]?.success);
          for (const op of failedOps) {
            op.retries++;
            if (op.retries >= op.maxRetries) {
              await this.removeOperation(op.id);
              console.error(`Operation ${op.id} exceeded max retries, removing from queue`);
            }
          }
          
        } catch (error) {
          console.error(`Error processing ${entity} operations:`, error);
          // Handle batch error - increment retries for all operations in batch
          for (const op of operations) {
            op.retries++;
            if (op.retries >= op.maxRetries) {
              await this.removeOperation(op.id);
            }
          }
        }
      }
      
      // Update last sync timestamp
      await localforage.setItem(this.lastSyncKey, Date.now());
      
    } finally {
      this.isProcessing = false;
    }
    
    return results;
  }
  
  // Process a batch of operations for a specific entity
  private async processBatch(entity: string, operations: QueuedOperation[]): Promise<SyncResult[]> {
    try {
      // Send batch to server via /api/sync endpoint
      const response = await syncAPI.syncOperations({
        entity,
        operations: operations.map(op => ({
          type: op.type,
          data: op.data,
          tempId: op.tempId,
          timestamp: op.timestamp
        }))
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Sync failed');
      }
      
      // Process server response
      const results: SyncResult[] = [];
      
      for (let i = 0; i < operations.length; i++) {
        const operation = operations[i];
        const serverResult = response.results?.[i];
        
        if (serverResult?.success) {
          results.push({
            success: true,
            serverData: serverResult.data
          });
          
          // Update local storage with server data
          if (serverResult.data) {
            await this.updateLocalData(entity, operation, serverResult.data);
          }
          
        } else {
          results.push({
            success: false,
            error: serverResult?.error || 'Unknown server error',
            conflicts: serverResult?.conflicts
          });
        }
      }
      
      return results;
      
    } catch (error) {
      console.error('Batch processing error:', error);
      // Return error for all operations in batch
      return operations.map(() => ({
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      }));
    }
  }
  
  // Update local data with server response
  private async updateLocalData(entity: string, operation: QueuedOperation, serverData: any): Promise<void> {
    const storeKey = `${entity}s`; // tasks, notes, projects
    
    try {
      const localData = await localforage.getItem<any[]>(storeKey) || [];
      
      if (operation.type === 'create') {
        // Replace temp item with server data
        if (operation.tempId) {
          const tempIndex = localData.findIndex(item => item.tempId === operation.tempId);
          if (tempIndex >= 0) {
            localData[tempIndex] = serverData;
          } else {
            localData.push(serverData);
          }
        } else {
          localData.push(serverData);
        }
      } else if (operation.type === 'update') {
        const index = localData.findIndex(item => item._id === serverData._id);
        if (index >= 0) {
          localData[index] = { ...localData[index], ...serverData };
        }
      } else if (operation.type === 'delete') {
        const filteredData = localData.filter(item => item._id !== operation.data._id);
        await localforage.setItem(storeKey, filteredData);
        return;
      }
      
      await localforage.setItem(storeKey, localData);
      
    } catch (error) {
      console.error('Error updating local data:', error);
    }
  }
  
  // Get last sync timestamp
  async getLastSync(): Promise<number> {
    const lastSync = await localforage.getItem<number>(this.lastSyncKey);
    return lastSync || 0;
  }
  
  // Subscribe to queue changes
  onQueueChange(callback: (operations: QueuedOperation[]) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
  
  // Notify listeners of queue changes
  private notifyListeners(queue: QueuedOperation[]): void {
    this.listeners.forEach(listener => {
      try {
        listener(queue);
      } catch (error) {
        console.error('Error in queue listener:', error);
      }
    });
  }
  
  // Force full sync from server (pull latest data)
  async fullSync(): Promise<void> {
    try {
      const lastSync = await this.getLastSync();
      const syncData = await syncAPI.getUpdates(lastSync);
      
      // Update local storage with server data
      for (const [entity, data] of Object.entries(syncData)) {
        if (Array.isArray(data)) {
          await localforage.setItem(`${entity}s`, data);
        }
      }
      
      // Process any pending operations
      await this.processQueue();
      
    } catch (error) {
      console.error('Full sync error:', error);
      throw error;
    }
  }
  
  // Handle online/offline events
  setupNetworkHandlers(): void {
    window.addEventListener('online', () => {
      console.log('Network online, processing sync queue');
      this.processQueue();
    });
    
    window.addEventListener('offline', () => {
      console.log('Network offline, queuing operations locally');
    });
  }
}

// Export singleton instance
export const syncQueue = new LocalSyncQueue();

// Initialize network handlers
syncQueue.setupNetworkHandlers();

export default syncQueue;