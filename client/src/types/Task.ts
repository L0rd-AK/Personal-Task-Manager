export type TaskStatus = 'ongoing' | 'completed' | 'given_up' | 'paused';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TaskHistory {
  action: 'created' | 'started' | 'paused' | 'resumed' | 'completed' | 'given_up' | 'snoozed';
  by: string;
  at: string;
  reason?: string;
  previousStatus?: string;
}

export interface PomodoroSettings {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
}

export interface TaskAttachment {
  url: string;
  filename: string;
  size: number;
  contentType: string;
  uploadedAt: string;
}

export interface Task {
  _id: string;
  userId: string;
  projectId?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  startsAt: string;
  endsAt: string;
  originalDuration: number;
  timeSpentSeconds: number;
  canPause: boolean;
  canSnooze: boolean;
  pausedAt?: string;
  pausedDuration: number;
  snoozeUntil?: string;
  pomodoroCount: number;
  pomodoroSettings?: PomodoroSettings;
  attachments: TaskAttachment[];
  history: TaskHistory[];
  createdAt: string;
  updatedAt: string;
  
  // Virtual fields
  remainingSeconds?: number;
  isOverdue?: boolean;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  projectId?: string;
  priority?: TaskPriority;
  tags?: string[];
  naturalTime?: string;
  duration?: number;
  endsAt?: string;
  canPause?: boolean;
  canSnooze?: boolean;
  pomodoroSettings?: PomodoroSettings;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  tags?: string[];
  pomodoroSettings?: PomodoroSettings;
}

export interface TaskAnalytics {
  totalTasks: number;
  completedTasks: number;
  givenUpTasks: number;
  ongoingTasks: number;
  totalTimeSpent: number;
  averageTaskDuration: number;
  completionRate: number;
  totalPomodoros: number;
  tasksByPriority: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
}