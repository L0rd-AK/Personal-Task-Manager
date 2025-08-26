import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Task, CreateTaskData, UpdateTaskData, TaskAnalytics, TaskStatus } from '../types/Task';
import { taskApi } from '../api/tasks';

interface TaskStore {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  selectedTask: Task | null;
  searchQuery: string;
  statusFilter: TaskStatus | 'all';
  
  // Actions
  fetchTasks: () => Promise<void>;
  createTask: (data: CreateTaskData) => Promise<Task>;
  updateTask: (id: string, data: UpdateTaskData) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  giveUpTask: (id: string, reason?: string) => Promise<void>;
  pauseTask: (id: string) => Promise<void>;
  resumeTask: (id: string) => Promise<void>;
  snoozeTask: (id: string, minutes: number) => Promise<void>;
  reopenTask: (id: string) => Promise<Task>;
  getAnalytics: () => Promise<TaskAnalytics>;
  
  // Real-time updates
  addTask: (task: Task) => void;
  updateTaskLocal: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;
  
  // UI state
  setSelectedTask: (task: Task | null) => void;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (filter: TaskStatus | 'all') => void;
  clearError: () => void;
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: [],
      loading: false,
      error: null,
      selectedTask: null,
      searchQuery: '',
      statusFilter: 'all',

      fetchTasks: async () => {
        console.log('TaskStore: Fetching tasks...');
        set({ loading: true, error: null });
        try {
          const tasks = await taskApi.getTasks();
          console.log('TaskStore: Received tasks:', tasks);
          console.log('TaskStore: Tasks type:', typeof tasks);
          console.log('TaskStore: Is tasks array?', Array.isArray(tasks));
          set({ tasks: Array.isArray(tasks) ? tasks : [], loading: false });
        } catch (error) {
          console.error('TaskStore: Fetch tasks error:', error);
          set({ error: (error as Error).message, loading: false, tasks: [] });
        }
      },

      createTask: async (data: CreateTaskData) => {
        set({ loading: true, error: null });
        try {
          const task = await taskApi.createTask(data);
          set(state => ({
            tasks: [...(state.tasks || []), task],
            loading: false
          }));
          return task;
        } catch (error) {
          set({ error: (error as Error).message, loading: false });
          throw error;
        }
      },

      updateTask: async (id: string, data: UpdateTaskData) => {
        set({ error: null });
        try {
          const updatedTask = await taskApi.updateTask(id, data);
          set(state => ({
            tasks: (state.tasks || []).map(task => 
              task._id === id ? updatedTask : task
            ),
            selectedTask: state.selectedTask?._id === id ? updatedTask : state.selectedTask
          }));
          return updatedTask;
        } catch (error) {
          set({ error: (error as Error).message });
          throw error;
        }
      },

      deleteTask: async (id: string) => {
        set({ error: null });
        try {
          await taskApi.deleteTask(id);
          set(state => ({
            tasks: (state.tasks || []).filter(task => task._id !== id),
            selectedTask: state.selectedTask?._id === id ? null : state.selectedTask
          }));
        } catch (error) {
          set({ error: (error as Error).message });
          throw error;
        }
      },

      completeTask: async (id: string) => {
        try {
          await taskApi.completeTask(id);
          get().updateTaskLocal(id, { status: 'completed' });
        } catch (error) {
          set({ error: (error as Error).message });
          throw error;
        }
      },

      giveUpTask: async (id: string, reason?: string) => {
        try {
          await taskApi.giveUpTask(id, reason);
          get().updateTaskLocal(id, { status: 'given_up' });
        } catch (error) {
          set({ error: (error as Error).message });
          throw error;
        }
      },

      pauseTask: async (id: string) => {
        try {
          await taskApi.pauseTask(id);
          get().updateTaskLocal(id, { status: 'paused', pausedAt: new Date().toISOString() });
        } catch (error) {
          set({ error: (error as Error).message });
          throw error;
        }
      },

      resumeTask: async (id: string) => {
        try {
          await taskApi.resumeTask(id);
          get().updateTaskLocal(id, { status: 'ongoing', pausedAt: undefined });
        } catch (error) {
          set({ error: (error as Error).message });
          throw error;
        }
      },

      snoozeTask: async (id: string, minutes: number) => {
        try {
          await taskApi.snoozeTask(id, minutes);
          const snoozeUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();
          get().updateTaskLocal(id, { snoozeUntil });
        } catch (error) {
          set({ error: (error as Error).message });
          throw error;
        }
      },

      reopenTask: async (id: string) => {
        set({ loading: true, error: null });
        try {
          const newTask = await taskApi.reopenTask(id);
          set(state => ({
            tasks: [...state.tasks, newTask],
            loading: false
          }));
          return newTask;
        } catch (error) {
          set({ error: (error as Error).message, loading: false });
          throw error;
        }
      },

      getAnalytics: async () => {
        try {
          return await taskApi.getAnalytics();
        } catch (error) {
          set({ error: (error as Error).message });
          throw error;
        }
      },

      // Real-time updates
      addTask: (task: Task) => {
        set(state => ({
          tasks: [...(state.tasks || []), task]
        }));
      },

      updateTaskLocal: (id: string, updates: Partial<Task>) => {
        set(state => ({
          tasks: (state.tasks || []).map(task => 
            task._id === id ? { ...task, ...updates } : task
          ),
          selectedTask: state.selectedTask?._id === id 
            ? { ...state.selectedTask, ...updates }
            : state.selectedTask
        }));
      },

      removeTask: (id: string) => {
        set(state => ({
          tasks: (state.tasks || []).filter(task => task._id !== id),
          selectedTask: state.selectedTask?._id === id ? null : state.selectedTask
        }));
      },

      // UI state
      setSelectedTask: (task: Task | null) => set({ selectedTask: task }),
      setSearchQuery: (query: string) => set({ searchQuery: query }),
      setStatusFilter: (filter: TaskStatus | 'all') => set({ statusFilter: filter }),
      clearError: () => set({ error: null })
    }),
    {
      name: 'task-store',
      partialize: (state) => ({ 
        searchQuery: state.searchQuery,
        statusFilter: state.statusFilter
      })
    }
  )
);
