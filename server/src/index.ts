import dotenv from 'dotenv';
import path from 'path';

// Configure dotenv FIRST before any other imports
dotenv.config({ path: path.join(process.cwd(), '.env') });

console.log('Environment loaded - JWT_SECRET length:', process.env.JWT_SECRET?.length);
console.log('Environment loaded - PORT:', process.env.PORT);
console.log('Environment loaded - NODE_ENV:', process.env.NODE_ENV);

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

// Routes
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import noteRoutes from './routes/notes.js';
import projectRoutes from './routes/projects.js';
import syncRoutes from './routes/sync.js';
import uploadRoutes from './routes/upload.js';
import notificationRoutes from './routes/notifications.js';

// Middleware
import { authenticateSocket } from './middleware/socketAuth.js';
import { errorHandler } from './middleware/errorHandler.js';

// Jobs
import './jobs/index.js';

const app = express();
const server = createServer(app);

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CLIENT_URL?.split(',') || []
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with']
};

// Socket.IO setup
export const io = new Server(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling']
});

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV 
  });
});

// Server time endpoint for client synchronization
app.get('/api/time', (req, res) => {
  res.json({ 
    serverNow: new Date().toISOString(),
    timestamp: Date.now()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);

// Serve uploaded files in development
if (process.env.NODE_ENV !== 'production') {
  app.use('/uploads', express.static('uploads'));
}

// Socket.IO authentication and event handling
io.use(authenticateSocket);

io.on('connection', (socket) => {
  const user = (socket as any).user;
  console.log(`User ${user.email} connected`);
  
  // Join user-specific room
  socket.join(`user:${user.userId}`);
  
  // Join project rooms for user's projects
  // This would be populated based on user's projects
  // socket.join(`project:${projectId}`);
  
  socket.on('task:subscribe', (taskId: string) => {
    socket.join(`task:${taskId}`);
  });
  
  socket.on('task:unsubscribe', (taskId: string) => {
    socket.leave(`task:${taskId}`);
  });
  
  socket.on('focus:start', (data) => {
    io.to(`user:${user.userId}`).emit('focus:started', {
      userId: user.userId,
      mode: data.mode,
      duration: data.duration,
      startedAt: new Date().toISOString()
    });
  });
  
  socket.on('focus:end', (data) => {
    io.to(`user:${user.userId}`).emit('focus:ended', {
      userId: user.userId,
      mode: data.mode,
      endedAt: new Date().toISOString(),
      completed: data.completed
    });
  });
  
  socket.on('heartbeat', () => {
    socket.emit('heartbeat', { timestamp: Date.now() });
  });
  
  socket.on('disconnect', (reason) => {
    console.log(`User ${user.email} disconnected: ${reason}`);
  });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Database connection
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskmanager';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.log('Running in development mode without MongoDB...');
    }
  }
};

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('Unhandled Promise Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

startServer();