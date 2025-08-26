import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface SocketStore {
  socket: Socket | null;
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback?: (data: any) => void) => void;
}

export const useSocketStore = create<SocketStore>((set, get) => ({
  socket: null,
  isConnected: false,
  connectionStatus: 'disconnected',

  connect: () => {
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';
    const token = localStorage.getItem('auth_token');
    
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      set({ 
        isConnected: true, 
        connectionStatus: 'connected',
        socket 
      });
    });

    socket.on('disconnect', () => {
      set({ 
        isConnected: false, 
        connectionStatus: 'disconnected' 
      });
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      set({ 
        isConnected: false, 
        connectionStatus: 'error' 
      });
    });

    set({ 
      socket, 
      connectionStatus: 'connecting' 
    });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ 
        socket: null, 
        isConnected: false, 
        connectionStatus: 'disconnected' 
      });
    }
  },

  emit: (event: string, data?: any) => {
    const { socket } = get();
    if (socket?.connected) {
      socket.emit(event, data);
    }
  },

  on: (event: string, callback: (data: any) => void) => {
    const { socket } = get();
    if (socket) {
      socket.on(event, callback);
    }
  },

  off: (event: string, callback?: (data: any) => void) => {
    const { socket } = get();
    if (socket) {
      if (callback) {
        socket.off(event, callback);
      } else {
        socket.off(event);
      }
    }
  }
}));
