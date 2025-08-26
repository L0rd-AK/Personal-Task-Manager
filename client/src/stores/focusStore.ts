import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FocusMode = 'pomodoro' | 'deep-work' | 'forced-focus' | 'none';

interface FocusSession {
  mode: FocusMode;
  startedAt: string;
  duration: number; // seconds
  remainingTime: number;
  isActive: boolean;
  isPaused: boolean;
  taskId?: string;
  pomodoroRound: number;
  totalPomodoros: number;
  onBreak: boolean;
  breakType?: 'short' | 'long';
}

interface FocusStore {
  currentSession: FocusSession | null;
  isBlocked: boolean;
  emergencyExitActive: boolean;
  emergencyExitCountdown: number;
  
  // Session management
  startFocus: (mode: FocusMode, duration: number, taskId?: string) => void;
  pauseFocus: () => void;
  resumeFocus: () => void;
  endFocus: (completed?: boolean) => void;
  
  // Pomodoro specific
  startBreak: (type: 'short' | 'long') => void;
  skipBreak: () => void;
  
  // Forced focus
  requestEmergencyExit: () => void;
  cancelEmergencyExit: () => void;
  confirmEmergencyExit: () => void;
  
  // Utilities
  updateTimer: () => void;
  getTimeRemaining: () => number;
  isInFocus: () => boolean;
}

export const useFocusStore = create<FocusStore>()(
  persist(
    (set, get) => ({
      currentSession: null,
      isBlocked: false,
      emergencyExitActive: false,
      emergencyExitCountdown: 0,

      startFocus: (mode: FocusMode, duration: number, taskId?: string) => {
        const session: FocusSession = {
          mode,
          startedAt: new Date().toISOString(),
          duration,
          remainingTime: duration,
          isActive: true,
          isPaused: false,
          taskId,
          pomodoroRound: mode === 'pomodoro' ? 1 : 0,
          totalPomodoros: 0,
          onBreak: false
        };

        set({
          currentSession: session,
          isBlocked: mode === 'forced-focus' || mode === 'deep-work',
          emergencyExitActive: false,
          emergencyExitCountdown: 0
        });
      },

      pauseFocus: () => {
        set(state => ({
          currentSession: state.currentSession ? {
            ...state.currentSession,
            isPaused: true
          } : null
        }));
      },

      resumeFocus: () => {
        set(state => ({
          currentSession: state.currentSession ? {
            ...state.currentSession,
            isPaused: false
          } : null
        }));
      },

      endFocus: (completed = false) => {
        const session = get().currentSession;
        if (session && completed && session.mode === 'pomodoro' && !session.onBreak) {
          // Start break after completed pomodoro
          const isLongBreak = session.pomodoroRound % 4 === 0;
          get().startBreak(isLongBreak ? 'long' : 'short');
        } else {
          set({
            currentSession: null,
            isBlocked: false,
            emergencyExitActive: false,
            emergencyExitCountdown: 0
          });
        }
      },

      startBreak: (type: 'short' | 'long') => {
        const session = get().currentSession;
        if (!session) return;

        const breakDuration = type === 'short' ? 5 * 60 : 15 * 60; // 5 or 15 minutes
        
        set({
          currentSession: {
            ...session,
            onBreak: true,
            breakType: type,
            duration: breakDuration,
            remainingTime: breakDuration,
            startedAt: new Date().toISOString(),
            totalPomodoros: session.totalPomodoros + 1
          },
          isBlocked: false
        });
      },

      skipBreak: () => {
        const session = get().currentSession;
        if (!session || !session.onBreak) return;

        // Start next pomodoro
        const workDuration = 25 * 60; // 25 minutes
        set({
          currentSession: {
            ...session,
            onBreak: false,
            breakType: undefined,
            duration: workDuration,
            remainingTime: workDuration,
            startedAt: new Date().toISOString(),
            pomodoroRound: session.pomodoroRound + 1
          },
          isBlocked: true
        });
      },

      requestEmergencyExit: () => {
        set({
          emergencyExitActive: true,
          emergencyExitCountdown: 10
        });

        // Start countdown
        const interval = setInterval(() => {
          const countdown = get().emergencyExitCountdown;
          if (countdown <= 1) {
            get().confirmEmergencyExit();
            clearInterval(interval);
          } else {
            set({ emergencyExitCountdown: countdown - 1 });
          }
        }, 1000);
      },

      cancelEmergencyExit: () => {
        set({
          emergencyExitActive: false,
          emergencyExitCountdown: 0
        });
      },

      confirmEmergencyExit: () => {
        set({
          currentSession: null,
          isBlocked: false,
          emergencyExitActive: false,
          emergencyExitCountdown: 0
        });
      },

      updateTimer: () => {
        const session = get().currentSession;
        if (!session || session.isPaused) return;

        const elapsed = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000);
        const remaining = Math.max(0, session.duration - elapsed);

        if (remaining === 0) {
          get().endFocus(true);
        } else {
          set(state => ({
            currentSession: state.currentSession ? {
              ...state.currentSession,
              remainingTime: remaining
            } : null
          }));
        }
      },

      getTimeRemaining: () => {
        const session = get().currentSession;
        return session?.remainingTime || 0;
      },

      isInFocus: () => {
        const session = get().currentSession;
        return !!(session && session.isActive && !session.isPaused);
      }
    }),
    {
      name: 'focus-store',
      partialize: (state) => ({
        currentSession: state.currentSession
      })
    }
  )
);
