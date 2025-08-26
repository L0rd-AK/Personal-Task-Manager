import { apiClient } from './client';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface AuthUser {
  _id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: 'local' | 'google';
  settings: {
    timezone: string;
    defaultPomodoroSettings: {
      workMinutes: number;
      shortBreakMinutes: number;
      longBreakMinutes: number;
      longBreakInterval: number;
    };
    notifications: {
      push: boolean;
      email: boolean;
      desktop: boolean;
    };
    theme: 'light' | 'dark' | 'system';
  };
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface GoogleAuthRequest {
  credential: string;
}

export const authApi = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/api/auth/login', credentials);
    if (response.accessToken) {
      apiClient.setToken(response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
    }
    return response;
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/api/auth/register', data);
    if (response.accessToken) {
      apiClient.setToken(response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
    }
    return response;
  },

  async googleLogin(googleData: GoogleAuthRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/api/auth/google', googleData);
    if (response.accessToken) {
      apiClient.setToken(response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
    }
    return response;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/api/auth/logout');
    } catch (error) {
      // Continue with logout even if server request fails
      console.warn('Logout request failed:', error);
    } finally {
      apiClient.setToken(null);
      localStorage.removeItem('refreshToken');
    }
  },

  async refreshToken(): Promise<AuthResponse> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiClient.post<AuthResponse>('/api/auth/refresh', {
      refreshToken
    });

    if (response.accessToken) {
      apiClient.setToken(response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
    }
    return response;
  },

  async getProfile(): Promise<AuthUser> {
    return apiClient.get<AuthUser>('/api/auth/profile');
  },

  async updateProfile(data: Partial<AuthUser>): Promise<AuthUser> {
    return apiClient.patch<AuthUser>('/api/auth/profile', data);
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = localStorage.getItem('auth_token');
    return !!token;
  },

  // Get stored token
  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }
};
