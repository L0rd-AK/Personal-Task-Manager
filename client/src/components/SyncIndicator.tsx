import React from 'react';
import { useSocketStore } from '../stores/socketStore';
import { useSyncStore } from '../stores/syncStore';

export const SyncIndicator: React.FC = () => {
  const { isConnected, connectionStatus } = useSocketStore();
  const { isOnline, isSyncing, pendingOperations, syncErrors } = useSyncStore();

  const getIndicatorColor = () => {
    if (!isOnline) return 'bg-red-500';
    if (isSyncing) return 'bg-yellow-500';
    if (!isConnected) return 'bg-orange-500';
    if (pendingOperations.length > 0) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (isSyncing) return 'Syncing...';
    if (!isConnected) return 'Connecting...';
    if (pendingOperations.length > 0) return `${pendingOperations.length} pending`;
    return 'Online';
  };

  const getTooltipText = () => {
    const parts = [];
    
    if (!isOnline) {
      parts.push('No internet connection');
    } else if (!isConnected) {
      parts.push(`WebSocket: ${connectionStatus}`);
    } else {
      parts.push('Real-time updates enabled');
    }

    if (pendingOperations.length > 0) {
      parts.push(`${pendingOperations.length} operations pending sync`);
    }

    if (syncErrors.length > 0) {
      parts.push(`${syncErrors.length} sync errors`);
    }

    return parts.join('\\n');
  };

  return (
    <div className="flex items-center space-x-2" title={getTooltipText()}>
      <div className="flex items-center space-x-1">
        <div className={`w-2 h-2 rounded-full ${getIndicatorColor()} animate-pulse`} />
        <span className="text-sm text-gray-600">{getStatusText()}</span>
      </div>
      
      {syncErrors.length > 0 && (
        <div className="text-red-500" title={`${syncErrors.length} sync errors`}>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
};
