import { apiClient } from './client';
import { Task, CreateTaskData, UpdateTaskData, TaskAnalytics } from '../types/Task';

export const taskApi = {
  async getTasks(params?: {
    status?: string;
    priority?: string;
    search?: string;
    projectId?: string;
    limit?: number;
    offset?: number;
  }): Promise<Task[]> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/api/tasks${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await apiClient.get<Task[]>(endpoint);
    return response;
  },

  async getTask(id: string): Promise<Task> {
    const response = await apiClient.get<Task>(`/api/tasks/${id}`);
    return response;
  },

  async createTask(data: CreateTaskData): Promise<Task> {
    const response = await apiClient.post<Task>('/api/tasks', data);
    return response;
  },

  async updateTask(id: string, data: UpdateTaskData): Promise<Task> {
    const response = await apiClient.patch<Task>(`/api/tasks/${id}`, data);
    return response;
  },

  async deleteTask(id: string): Promise<void> {
    await apiClient.delete(`/api/tasks/${id}`);
  },

  async completeTask(id: string): Promise<Task> {
    const response = await apiClient.post<Task>(`/api/tasks/${id}/complete`);
    return response;
  },

  async giveUpTask(id: string, reason?: string): Promise<Task> {
    const response = await apiClient.post<Task>(`/api/tasks/${id}/give-up`, { reason });
    return response;
  },

  async pauseTask(id: string): Promise<Task> {
    const response = await apiClient.post<Task>(`/api/tasks/${id}/pause`);
    return response;
  },

  async resumeTask(id: string): Promise<Task> {
    const response = await apiClient.post<Task>(`/api/tasks/${id}/resume`);
    return response;
  },

  async snoozeTask(id: string, minutes: number): Promise<Task> {
    const response = await apiClient.post<Task>(`/api/tasks/${id}/snooze`, { minutes });
    return response;
  },

  async reopenTask(id: string): Promise<Task> {
    // Note: This is a workaround. In a production app, we'd need a dedicated reopen endpoint
    // For now, we'll create a new task based on the existing one
    const task = await this.getTask(id);
    const newTaskData: CreateTaskData = {
      title: task.title,
      description: task.description,
      priority: task.priority,
      tags: task.tags,
      duration: task.originalDuration,
      canPause: task.canPause,
      canSnooze: task.canSnooze,
      pomodoroSettings: task.pomodoroSettings
    };
    return this.createTask(newTaskData);
  },

  async getAnalytics(): Promise<TaskAnalytics> {
    const response = await apiClient.get<TaskAnalytics>('/api/tasks/analytics');
    return response;
  }
};
