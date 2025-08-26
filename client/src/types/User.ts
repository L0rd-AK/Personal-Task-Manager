export interface User {
  _id: string;
  email: string;
  name: string;
  avatar?: string;
  googleId?: string;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    push: boolean;
    email: boolean;
    taskReminders: boolean;
    focusReminders: boolean;
  };
  pomodoro: {
    workMinutes: number;
    shortBreakMinutes: number;
    longBreakMinutes: number;
    longBreakInterval: number;
    autoStart: boolean;
    playSound: boolean;
  };
  focus: {
    forcedFocusEnabled: boolean;
    emergencyExitDelay: number;
    blockWebsites: string[];
  };
  keyboard: {
    shortcuts: Record<string, string>;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}
