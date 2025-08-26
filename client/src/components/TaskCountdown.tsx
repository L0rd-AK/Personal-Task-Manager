import React, { useState, useEffect, useRef } from 'react';
import { formatTimeRemaining } from '../utils/timeUtils';
import { useTimeSync } from '../hooks/useTimeSync';
import { Task } from '../types/Task';
import clsx from 'clsx';

interface TaskCountdownProps {
  task: Task;
  onTimeUp?: () => void;
  showProgress?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const TaskCountdown: React.FC<TaskCountdownProps> = ({
  task,
  onTimeUp,
  showProgress = true,
  size = 'md',
  className
}) => {
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isOverdue, setIsOverdue] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { getAdjustedTime } = useTimeSync();
  
  // Calculate initial remaining time with server time correction
  const calculateRemainingTime = (): number => {
    if (task.status !== 'ongoing' || task.pausedAt) return 0;
    
    const now = getAdjustedTime();
    const endTime = new Date(task.endsAt).getTime();
    const remaining = Math.floor((endTime - now.getTime()) / 1000);
    
    return Math.max(0, remaining);
  };
  
  // Calculate progress percentage
  const calculateProgress = (): number => {
    const totalDuration = task.originalDuration;
    const elapsed = totalDuration - remainingSeconds;
    return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  };
  
  // Update countdown every second
  useEffect(() => {
    if (task.status !== 'ongoing' || task.pausedAt) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setRemainingSeconds(0);
      return;
    }
    
    // Set initial time
    const initialRemaining = calculateRemainingTime();
    setRemainingSeconds(initialRemaining);
    setIsOverdue(initialRemaining <= 0);
    
    // Start interval
    intervalRef.current = setInterval(() => {
      const remaining = calculateRemainingTime();
      setRemainingSeconds(remaining);
      
      const wasOverdue = isOverdue;
      const nowOverdue = remaining <= 0;
      setIsOverdue(nowOverdue);
      
      // Call onTimeUp when transitioning to overdue
      if (!wasOverdue && nowOverdue && onTimeUp) {
        onTimeUp();
      }
    }, 1000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [task.status, task.endsAt, task.pausedAt, task._id, onTimeUp]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
  
  const progress = calculateProgress();
  const formattedTime = formatTimeRemaining(Math.abs(remainingSeconds));
  
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl'
  };
  
  const getTimeColor = () => {
    if (task.status !== 'ongoing') return 'text-gray-500';
    if (isOverdue) return 'text-red-500';
    if (remainingSeconds <= 300) return 'text-orange-500'; // Last 5 minutes
    return 'text-green-500';
  };
  
  const getProgressColor = () => {
    if (isOverdue) return 'bg-red-500';
    if (remainingSeconds <= 300) return 'bg-orange-500';
    return 'bg-green-500';
  };
  
  return (
    <div className={clsx('flex flex-col items-center space-y-2', className)}>
      {/* Time Display */}
      <div className={clsx(
        'font-mono font-bold transition-colors duration-300',
        sizeClasses[size],
        getTimeColor()
      )}>
        {isOverdue && task.status === 'ongoing' ? `-${formattedTime}` : formattedTime}
      </div>
      
      {/* Progress Bar */}
      {showProgress && task.status === 'ongoing' && (
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={clsx(
              'h-full transition-all duration-1000 ease-linear rounded-full',
              getProgressColor()
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      
      {/* Status Indicators */}
      <div className="flex items-center space-x-1 text-xs">
        {task.status === 'paused' && (
          <span className="inline-flex items-center px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
            ⏸ Paused
          </span>
        )}
        
        {task.status === 'ongoing' && isOverdue && (
          <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-100 text-red-800 animate-pulse">
            ⚠ Overdue
          </span>
        )}
        
        {task.status === 'completed' && (
          <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800">
            ✓ Completed
          </span>
        )}
        
        {task.status === 'given_up' && (
          <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-800">
            ✗ Given Up
          </span>
        )}
      </div>
      
      {/* Pomodoro Count */}
      {task.pomodoroCount > 0 && (
        <div className="text-xs text-gray-500">
          🍅 {task.pomodoroCount} pomodoro{task.pomodoroCount !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

export default TaskCountdown;