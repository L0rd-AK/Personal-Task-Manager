import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log('Auth middleware - Header:', authHeader);
    console.log('Auth middleware - Token:', token ? 'present' : 'missing');
    
    const JWT_SECRET = process.env.JWT_SECRET!;
    console.log('Auth middleware - JWT_SECRET:', JWT_SECRET ? 'present' : 'missing');
    console.log('Auth middleware - JWT_SECRET length:', JWT_SECRET?.length);

    if (!token) {
      console.log('Auth middleware - No token provided');
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    console.log('Auth middleware - Decoded token:', decoded);
    
    // Handle demo user
    if (decoded.userId === 'demo-user-id') {
      console.log('Auth middleware - Demo user authenticated');
      req.user = {
        userId: 'demo-user-id',
        email: 'demo@example.com'
      };
      return next();
    }
    
    // Verify user still exists for real users
    const user = await User.findById(decoded.userId);
    if (!user) {
      console.log('Auth middleware - User not found for ID:', decoded.userId);
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = {
      userId: decoded.userId,
      email: user.email
    };
    
    console.log('Auth middleware - User authenticated:', user.email);
    next();
  } catch (error) {
    console.error('Auth middleware error details:', error);
    if (error instanceof jwt.TokenExpiredError) {
      console.log('Auth middleware - Token expired');
      return res.status(401).json({ message: 'Token expired' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      console.log('Auth middleware - Invalid token format');
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};