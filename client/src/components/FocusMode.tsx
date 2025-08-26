import React, { useEffect, useState } from 'react';
import { useFocusStore } from '../stores/focusStore';

export const FocusMode: React.FC = () => {
  const {
    currentSession,
    isBlocked,
    emergencyExitActive,
    emergencyExitCountdown,
    pauseFocus,
    resumeFocus,
    endFocus,
    requestEmergencyExit,
    cancelEmergencyExit,
    updateTimer,
    getTimeRemaining
  } = useFocusStore();

  const [timeRemaining, setTimeRemaining] = useState(0);

  // Update timer every second
  useEffect(() => {
    if (!currentSession) return;

    const interval = setInterval(() => {
      updateTimer();
      setTimeRemaining(getTimeRemaining());
    }, 1000);

    return () => clearInterval(interval);
  }, [currentSession, updateTimer, getTimeRemaining]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'pomodoro': return '🍅';
      case 'deep-work': return '🧠';
      case 'forced-focus': return '🔒';
      default: return '⏱️';
    }
  };

  const getModeTitle = (mode: string) => {
    switch (mode) {
      case 'pomodoro': return 'Pomodoro Session';
      case 'deep-work': return 'Deep Work';
      case 'forced-focus': return 'Forced Focus';
      default: return 'Focus Session';
    }
  };

  if (!currentSession) return null;

  // Emergency exit modal
  if (emergencyExitActive) {
    return (
      <div className="fixed inset-0 bg-red-900 bg-opacity-95 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-red-600 mb-4">Emergency Exit</h2>
          <p className="text-gray-700 mb-6">
            Are you sure you want to end your focus session? This will count as an incomplete session.
          </p>
          <div className="text-4xl font-bold text-red-600 mb-6">
            {emergencyExitCountdown}
          </div>
          <div className="flex space-x-4">
            <button
              onClick={cancelEmergencyExit}
              className="flex-1 bg-gray-600 text-white py-3 px-6 rounded-lg hover:bg-gray-700 font-semibold"
            >
              Cancel
            </button>
            <button
              className="flex-1 bg-red-600 text-white py-3 px-6 rounded-lg font-semibold cursor-not-allowed opacity-50"
              disabled
            >
              Exit ({emergencyExitCountdown}s)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Forced focus overlay
  if (isBlocked && currentSession.mode === 'forced-focus') {
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-98 flex flex-col items-center justify-center z-40">
        <div className="text-center text-white">
          <div className="text-8xl mb-8">{getModeIcon(currentSession.mode)}</div>
          <h1 className="text-4xl font-bold mb-4">{getModeTitle(currentSession.mode)}</h1>
          <div className="text-6xl font-mono font-bold mb-8">
            {formatTime(timeRemaining)}
          </div>
          {currentSession.onBreak ? (
            <div className="text-2xl text-green-400 mb-8">
              Break Time! {currentSession.breakType === 'long' ? 'Long' : 'Short'} Break
            </div>
          ) : (
            <div className="text-xl text-gray-300 mb-8">
              Stay focused. You've got this! 💪
            </div>
          )}
          
          <div className="flex flex-col space-y-4">
            {!currentSession.onBreak && (
              <>
                {currentSession.isPaused ? (
                  <button
                    onClick={resumeFocus}
                    className="bg-green-600 text-white py-3 px-8 rounded-lg hover:bg-green-700 font-semibold"
                  >
                    ▶️ Resume
                  </button>
                ) : (
                  <button
                    onClick={pauseFocus}
                    className="bg-yellow-600 text-white py-3 px-8 rounded-lg hover:bg-yellow-700 font-semibold"
                  >
                    ⏸️ Pause
                  </button>
                )}
              </>
            )}
            
            <button
              onClick={() => endFocus(false)}
              className="bg-blue-600 text-white py-3 px-8 rounded-lg hover:bg-blue-700 font-semibold"
            >
              ✅ Complete Session
            </button>
            
            <button
              onClick={requestEmergencyExit}
              className="bg-red-600 text-white py-2 px-6 rounded-lg hover:bg-red-700 text-sm"
            >
              🚨 Emergency Exit
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Regular focus timer (floating widget)
  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border-2 border-blue-500 p-4 z-30 min-w-64">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{getModeIcon(currentSession.mode)}</span>
          <span className="font-semibold text-gray-800">
            {getModeTitle(currentSession.mode)}
          </span>
        </div>
        <button
          onClick={() => endFocus(false)}
          className="text-gray-400 hover:text-gray-600"
          title="End session"
        >
          ✕
        </button>
      </div>

      <div className="text-center">
        <div className="text-3xl font-mono font-bold text-blue-600 mb-2">
          {formatTime(timeRemaining)}
        </div>
        
        {currentSession.onBreak && (
          <div className="text-sm text-green-600 font-medium mb-2">
            {currentSession.breakType === 'long' ? 'Long' : 'Short'} Break
          </div>
        )}

        {currentSession.mode === 'pomodoro' && (
          <div className="text-sm text-gray-600 mb-3">
            Round {currentSession.pomodoroRound} • {currentSession.totalPomodoros} completed
          </div>
        )}

        <div className="flex space-x-2">
          {!currentSession.onBreak && (
            <>
              {currentSession.isPaused ? (
                <button
                  onClick={resumeFocus}
                  className="flex-1 bg-green-100 text-green-700 py-1 px-3 rounded text-sm hover:bg-green-200"
                >
                  Resume
                </button>
              ) : (
                <button
                  onClick={pauseFocus}
                  className="flex-1 bg-yellow-100 text-yellow-700 py-1 px-3 rounded text-sm hover:bg-yellow-200"
                >
                  Pause
                </button>
              )}
            </>
          )}
          
          <button
            onClick={() => endFocus(true)}
            className="flex-1 bg-blue-100 text-blue-700 py-1 px-3 rounded text-sm hover:bg-blue-200"
          >
            Complete
          </button>
        </div>
      </div>
    </div>
  );
};
