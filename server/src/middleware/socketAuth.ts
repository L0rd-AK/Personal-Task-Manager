import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import User from '../models/User.js';

export const authenticateSocket = async (socket: Socket, next: Function) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Verify user exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return next(new Error('Invalid token'));
    }
    
    // Attach user to socket
    (socket as any).user = {
      userId: decoded.userId,
      email: decoded.email
    };
    
    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
};