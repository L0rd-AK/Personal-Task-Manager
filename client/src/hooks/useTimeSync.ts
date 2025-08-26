import { useState, useEffect, useRef } from 'react';
import { timeAPI } from '../api/time';

interface TimeSyncData {
  offset: number;
  lastSync: number;
  accuracy: number;
}

export const useTimeSync = () => {
  const [syncData, setSyncData] = useState<TimeSyncData>({
    offset: 0,
    lastSync: 0,
    accuracy: 0
  });
  
  const syncIntervalRef = useRef<NodeJS.Timeout>();
  
  // Sync time with server
  const syncTime = async () => {
    try {
      const start = performance.now();
      const response = await timeAPI.getServerTime();
      const end = performance.now();
      
      const roundTripTime = end - start;
      const networkDelay = roundTripTime / 2;
      
      const serverTime = new Date(response.serverNow).getTime();
      const clientTimeWhenReceived = Date.now();
      const adjustedServerTime = serverTime + networkDelay;
      
      const offset = clientTimeWhenReceived - adjustedServerTime;
      
      setSyncData({
        offset,
        lastSync: Date.now(),
        accuracy: roundTripTime
      });
      
      console.log(`Time sync: offset=${offset}ms, accuracy=${roundTripTime}ms`);
      
    } catch (error) {
      console.error('Time sync failed:', error);
    }
  };
  
  // Get server-adjusted time
  const getAdjustedTime = (): Date => {
    return new Date(Date.now() - syncData.offset);
  };
  
  // Calculate remaining time for a task with server time correction
  const getRemainingTime = (endsAt: string | Date): number => {
    const endTime = new Date(endsAt).getTime();
    const adjustedNow = getAdjustedTime().getTime();
    return Math.max(0, Math.floor((endTime - adjustedNow) / 1000));
  };
  
  // Check if time sync is accurate (within 5 seconds)
  const isSyncAccurate = (): boolean => {
    const timeSinceLastSync = Date.now() - syncData.lastSync;
    return timeSinceLastSync < 300000 && syncData.accuracy < 5000; // 5 minutes, 5 seconds
  };
  
  // Initialize time sync
  useEffect(() => {
    // Initial sync
    syncTime();
    
    // Periodic sync every 5 minutes
    syncIntervalRef.current = setInterval(syncTime, 5 * 60 * 1000);
    
    // Sync when page becomes visible (handle sleep/wake)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        syncTime();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  return {
    syncData,
    getAdjustedTime,
    getRemainingTime,
    isSyncAccurate,
    syncTime
  };
};

export default useTimeSync;