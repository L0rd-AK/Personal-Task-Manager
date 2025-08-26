import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, AuthUser, LoginCredentials, RegisterData, GoogleAuthRequest } from '../api/auth';

interface AuthStore {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  googleLogin: (googleData: GoogleAuthRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  getProfile: () => Promise<void>;
  updateProfile: (data: Partial<AuthUser>) => Promise<void>;
  clearError: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      loading: false,
      error: null,

      login: async (credentials: LoginCredentials) => {
        set({ loading: true, error: null });
        try {
          const { user } = await authApi.login(credentials);
          set({ 
            user, 
            isAuthenticated: true, 
            loading: false 
          });
        } catch (error) {
          set({ 
            error: (error as Error).message, 
            loading: false,
            isAuthenticated: false,
            user: null 
          });
          throw error;
        }
      },

      register: async (data: RegisterData) => {
        set({ loading: true, error: null });
        try {
          const { user } = await authApi.register(data);
          set({ 
            user, 
            isAuthenticated: true, 
            loading: false 
          });
        } catch (error) {
          set({ 
            error: (error as Error).message, 
            loading: false,
            isAuthenticated: false,
            user: null 
          });
          throw error;
        }
      },

      googleLogin: async (googleData: GoogleAuthRequest) => {
        set({ loading: true, error: null });
        try {
          const { user } = await authApi.googleLogin(googleData);
          set({ 
            user, 
            isAuthenticated: true, 
            loading: false 
          });
        } catch (error) {
          set({ 
            error: (error as Error).message, 
            loading: false,
            isAuthenticated: false,
            user: null 
          });
          throw error;
        }
      },

      logout: async () => {
        set({ loading: true });
        try {
          await authApi.logout();
          set({ 
            user: null, 
            isAuthenticated: false, 
            loading: false,
            error: null 
          });
        } catch (error) {
          // Even if logout fails on server, clear local state
          set({ 
            user: null, 
            isAuthenticated: false, 
            loading: false,
            error: null 
          });
        }
      },

      refreshToken: async () => {
        try {
          const { user } = await authApi.refreshToken();
          set({ 
            user, 
            isAuthenticated: true 
          });
        } catch (error) {
          set({ 
            user: null, 
            isAuthenticated: false,
            error: (error as Error).message 
          });
          throw error;
        }
      },

      getProfile: async () => {
        set({ loading: true, error: null });
        try {
          const user = await authApi.getProfile();
          set({ 
            user, 
            loading: false 
          });
        } catch (error) {
          set({ 
            error: (error as Error).message, 
            loading: false 
          });
          throw error;
        }
      },

      updateProfile: async (data: Partial<AuthUser>) => {
        set({ loading: true, error: null });
        try {
          const user = await authApi.updateProfile(data);
          set({ 
            user, 
            loading: false 
          });
        } catch (error) {
          set({ 
            error: (error as Error).message, 
            loading: false 
          });
          throw error;
        }
      },

      clearError: () => set({ error: null }),

      checkAuth: async () => {
        console.log('AuthStore: Checking authentication...');
        const token = authApi.getToken();
        console.log('AuthStore: Token exists:', !!token);
        if (!token) {
          console.log('AuthStore: No token found, setting unauthenticated');
          set({ isAuthenticated: false, user: null });
          return;
        }

        try {
          console.log('AuthStore: Getting user profile...');
          const user = await authApi.getProfile();
          console.log('AuthStore: Profile received:', user);
          set({ 
            user, 
            isAuthenticated: true 
          });
        } catch (error) {
          console.log('AuthStore: Profile error, trying to refresh token...', error);
          // Token might be expired, try to refresh
          try {
            await get().refreshToken();
          } catch (refreshError) {
            console.log('AuthStore: Refresh failed, clearing auth state', refreshError);
            // Refresh failed, clear auth state
            set({ 
              user: null, 
              isAuthenticated: false,
              error: null 
            });
          }
        }
      }
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
