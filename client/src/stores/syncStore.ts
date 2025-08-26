import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import localforage from 'localforage';

export interface OfflineOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'task' | 'note' | 'project';
  entityId?: string;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

interface SyncStore {
  isOnline: boolean;
  isSyncing: boolean;
  pendingOperations: OfflineOperation[];
  lastSyncTime: number | null;
  syncErrors: string[];
  
  // Actions
  setOnlineStatus: (isOnline: boolean) => void;
  addOperation: (operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'retryCount'>) => void;
  removeOperation: (id: string) => void;
  syncPendingOperations: () => Promise<void>;
  clearSyncErrors: () => void;
  
  // LocalForage operations
  saveToLocal: <T>(key: string, data: T) => Promise<void>;
  getFromLocal: <T>(key: string) => Promise<T | null>;
  removeFromLocal: (key: string) => Promise<void>;
}

export const useSyncStore = create<SyncStore>()(
  persist(
    (set, get) => ({
      isOnline: navigator.onLine,
      isSyncing: false,
      pendingOperations: [],
      lastSyncTime: null,
      syncErrors: [],

      setOnlineStatus: (isOnline: boolean) => {
        set({ isOnline });
        if (isOnline && get().pendingOperations.length > 0) {
          get().syncPendingOperations();
        }
      },

      addOperation: (operation) => {
        const newOperation: OfflineOperation = {
          ...operation,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          retryCount: 0
        };

        set(state => ({
          pendingOperations: [...state.pendingOperations, newOperation]
        }));

        // Try to sync immediately if online
        if (get().isOnline) {
          get().syncPendingOperations();
        }
      },

      removeOperation: (id: string) => {
        set(state => ({
          pendingOperations: state.pendingOperations.filter(op => op.id !== id)
        }));
      },

      syncPendingOperations: async () => {
        const { pendingOperations, isOnline } = get();
        
        if (!isOnline || pendingOperations.length === 0) return;

        set({ isSyncing: true, syncErrors: [] });

        const errors: string[] = [];
        const completedOperations: string[] = [];

        for (const operation of pendingOperations) {
          try {
            await processOperation(operation);
            completedOperations.push(operation.id);
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown sync error';
            errors.push(`${operation.type} ${operation.entity}: ${message}`);
            
            // Increment retry count
            const updatedOp = { ...operation, retryCount: operation.retryCount + 1 };
            
            // Remove if max retries reached
            if (updatedOp.retryCount >= updatedOp.maxRetries) {
              completedOperations.push(operation.id);
            } else {
              // Update retry count
              set(state => ({
                pendingOperations: state.pendingOperations.map(op =>
                  op.id === operation.id ? updatedOp : op
                )
              }));
            }
          }
        }

        // Remove completed operations
        set(state => ({
          pendingOperations: state.pendingOperations.filter(
            op => !completedOperations.includes(op.id)
          ),
          lastSyncTime: Date.now(),
          syncErrors: errors,
          isSyncing: false
        }));
      },

      clearSyncErrors: () => set({ syncErrors: [] }),

      saveToLocal: async <T>(key: string, data: T) => {
        await localforage.setItem(key, data);
      },

      getFromLocal: async <T>(key: string): Promise<T | null> => {
        return await localforage.getItem<T>(key);
      },

      removeFromLocal: async (key: string) => {
        await localforage.removeItem(key);
      }
    }),
    {
      name: 'sync-store',
      partialize: (state) => ({
        pendingOperations: state.pendingOperations,
        lastSyncTime: state.lastSyncTime
      })
    }
  )
);

// Process individual operations
async function processOperation(operation: OfflineOperation): Promise<void> {
  const { type, entity, entityId, data } = operation;
  
  // This would integrate with your API client
  switch (entity) {
    case 'task':
      if (type === 'create') {
        // await taskApi.createTask(data);
      } else if (type === 'update' && entityId) {
        // await taskApi.updateTask(entityId, data);
      } else if (type === 'delete' && entityId) {
        // await taskApi.deleteTask(entityId);
      }
      break;
    case 'note':
      // Similar for notes
      break;
    case 'project':
      // Similar for projects
      break;
  }
}

// Set up online/offline listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useSyncStore.getState().setOnlineStatus(true);
  });

  window.addEventListener('offline', () => {
    useSyncStore.getState().setOnlineStatus(false);
  });
}
