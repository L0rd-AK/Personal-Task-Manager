import React, { useState, useEffect } from 'react';
import { Task } from '../types/Task';
import { useFocusStore } from '../stores/focusStore';
import { getServerTime } from '../api/client';
import { formatDistanceToNow } from 'date-fns';

interface TaskCardProps {
  task: Task;
  onComplete: () => void;
  onGiveUp: (reason?: string) => void;
  onDelete: () => void;
  onEdit: () => void;
  onTimeUp: () => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onComplete,
  onGiveUp,
  onDelete,
  onEdit,
  onTimeUp
}) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [serverTimeOffset, setServerTimeOffset] = useState(0);
  const [showGiveUpModal, setShowGiveUpModal] = useState(false);
  const [giveUpReason, setGiveUpReason] = useState('');
  
  const { startFocus } = useFocusStore();

  // Sync with server time
  useEffect(() => {
    const syncTime = async () => {
      try {
        const { timestamp } = await getServerTime();
        setServerTimeOffset(timestamp - Date.now());
      } catch (error) {
        console.warn('Failed to sync server time:', error);
      }
    };

    syncTime();
    const interval = setInterval(syncTime, 30000); // Sync every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Update countdown
  useEffect(() => {
    if (task.status !== 'ongoing' || task.pausedAt) return;

    const updateTimer = () => {
      const now = Date.now() + serverTimeOffset;
      const endsAt = new Date(task.endsAt).getTime();
      const remaining = Math.max(0, Math.floor((endsAt - now) / 1000));
      
      setTimeRemaining(remaining);
      
      if (remaining === 0) {
        onTimeUp();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [task.endsAt, task.status, task.pausedAt, serverTimeOffset, onTimeUp]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ongoing': return 'border-blue-200 bg-blue-50';
      case 'completed': return 'border-green-200 bg-green-50';
      case 'given_up': return 'border-gray-200 bg-gray-50';
      case 'paused': return 'border-yellow-200 bg-yellow-50';
      default: return 'border-gray-200 bg-white';
    }
  };

  const handleGiveUp = () => {
    onGiveUp(giveUpReason || undefined);
    setShowGiveUpModal(false);
    setGiveUpReason('');
  };

  const handleStartFocus = () => {
    startFocus('pomodoro', 25 * 60, task._id);
  };

  const isOverdue = timeRemaining === 0 && task.status === 'ongoing';

  return (
    <>
      <div className={`border rounded-lg p-4 ${getStatusColor(task.status)} ${isOverdue ? 'ring-2 ring-red-500' : ''}`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`} />
            <h3 className="font-medium text-gray-900 truncate">{task.title}</h3>
          </div>
          <button
            onClick={onEdit}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>

        {/* Description */}
        {task.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
        )}

        {/* Timer */}
        {task.status === 'ongoing' && (
          <div className="mb-3">
            <div className={`text-lg font-mono font-bold ${isOverdue ? 'text-red-600' : 'text-blue-600'}`}>
              {isOverdue ? 'OVERDUE' : formatTime(timeRemaining)}
            </div>
            {task.pausedAt && (
              <div className="text-sm text-yellow-600 font-medium">PAUSED</div>
            )}
          </div>
        )}

        {/* Tags */}
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {task.tags.map(tag => (
              <span
                key={tag}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {task.status === 'ongoing' && !task.pausedAt && (
            <>
              <button
                onClick={onComplete}
                className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded hover:bg-green-200"
              >
                Complete
              </button>
              <button
                onClick={() => setShowGiveUpModal(true)}
                className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
              >
                Give Up
              </button>
              <button
                onClick={handleStartFocus}
                className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded hover:bg-blue-200"
              >
                🍅 Focus
              </button>
            </>
          )}
          
          {task.status === 'completed' && (
            <div className="text-sm text-green-600 font-medium">
              ✓ Completed {formatDistanceToNow(new Date(task.updatedAt))} ago
            </div>
          )}
          
          {task.status === 'given_up' && (
            <div className="text-sm text-gray-500">
              Given up {formatDistanceToNow(new Date(task.updatedAt))} ago
            </div>
          )}

          <button
            onClick={onDelete}
            className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200 ml-auto"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Give Up Modal */}
      {showGiveUpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Give Up Task</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to give up on "{task.title}"?
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason (optional)
              </label>
              <textarea
                value={giveUpReason}
                onChange={(e) => setGiveUpReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Why are you giving up on this task?"
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleGiveUp}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
              >
                Give Up
              </button>
              <button
                onClick={() => setShowGiveUpModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
