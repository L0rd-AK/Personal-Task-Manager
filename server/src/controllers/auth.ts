import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';

// Get JWT secrets at runtime, not at import time
const getJWTSecret = () => process.env.JWT_SECRET || 'your-secret-key';
const getJWTRefreshSecret = () => process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Helper function to generate tokens
const generateTokens = (userId: string) => {
  const JWT_SECRET = getJWTSecret();
  const JWT_REFRESH_SECRET = getJWTRefreshSecret();
  console.log('Generating tokens with secret length:', JWT_SECRET?.length);
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

// Helper function to create user response
const createUserResponse = (user: any) => {
  const { hashedPassword, refreshTokens, pushSubscriptions, ...userResponse } = user.toObject();
  return userResponse;
};

export const register = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create new user
    const user = new User({
      email,
      name,
      hashedPassword: password, // Will be hashed by pre-save hook
      provider: 'local'
    });

    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Store refresh token
    user.refreshTokens.push(refreshToken);
    await user.save();

    res.status(201).json({
      user: createUserResponse(user),
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    console.log('Login attempt for:', email);

    // Demo user for testing
    if (email === 'demo@example.com' && password === 'password') {
      console.log('Demo user login successful');
      const demoUser = {
        _id: 'demo-user-id',
        email: 'demo@example.com',
        name: 'Demo User',
        provider: 'local',
        settings: {
          timezone: 'UTC',
          defaultPomodoroSettings: {
            workMinutes: 25,
            shortBreakMinutes: 5,
            longBreakMinutes: 15,
            longBreakInterval: 4
          },
          notifications: {
            push: true,
            email: true,
            desktop: true
          },
          theme: 'system'
        }
      };

      const { accessToken, refreshToken } = generateTokens('demo-user-id');
      console.log('Generated tokens for demo user');

      return res.json({
        user: demoUser,
        accessToken,
        refreshToken
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if it's a local account
    if (user.provider !== 'local' || !user.hashedPassword) {
      return res.status(400).json({ 
        message: 'This account uses social login. Please sign in with Google.' 
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update last active
    user.lastActiveAt = new Date();
    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Store refresh token
    user.refreshTokens.push(refreshToken);
    await user.save();

    res.json({
      user: createUserResponse(user),
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required' });
    }

    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(400).json({ message: 'Invalid Google token' });
    }

    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ message: 'Email not provided by Google' });
    }

    // Check if user exists
    let user = await User.findOne({ 
      $or: [
        { email },
        { providerId: googleId, provider: 'google' }
      ]
    });

    if (user) {
      // Update existing user
      if (user.provider === 'local') {
        // Convert local account to Google account
        user.provider = 'google';
        user.providerId = googleId;
      }
      user.avatar = picture;
      user.lastActiveAt = new Date();
      await user.save();
    } else {
      // Create new user
      user = new User({
        email,
        name: name || 'Google User',
        provider: 'google',
        providerId: googleId,
        avatar: picture
      });
      await user.save();
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Store refresh token
    user.refreshTokens.push(refreshToken);
    await user.save();

    res.json({
      user: createUserResponse(user),
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ message: 'Server error during Google authentication' });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.body.refreshToken;
    const userId = (req as any).user?.userId;

    if (userId && refreshToken) {
      // Remove refresh token from user's stored tokens
      await User.findByIdAndUpdate(userId, {
        $pull: { refreshTokens: refreshToken }
      });
    }

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    // Verify refresh token
    const JWT_REFRESH_SECRET = getJWTRefreshSecret();
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;
    const userId = decoded.userId;

    // Handle demo user
    if (userId === 'demo-user-id') {
      const { accessToken, refreshToken: newRefreshToken } = generateTokens(userId);
      
      const demoUser = {
        _id: 'demo-user-id',
        email: 'demo@example.com',
        name: 'Demo User',
        provider: 'local',
        settings: {
          timezone: 'UTC',
          defaultPomodoroSettings: {
            workMinutes: 25,
            shortBreakMinutes: 5,
            longBreakMinutes: 15,
            longBreakInterval: 4
          },
          notifications: {
            push: true,
            email: true,
            desktop: true
          },
          theme: 'system'
        }
      };
      
      return res.json({
        user: demoUser,
        accessToken,
        refreshToken: newRefreshToken
      });
    }

    // Find user and check if refresh token exists
    const user = await User.findById(userId);
    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(userId);

    // Replace old refresh token with new one
    const tokenIndex = user.refreshTokens.indexOf(refreshToken);
    user.refreshTokens[tokenIndex] = newRefreshToken;
    await user.save();

    res.json({
      user: createUserResponse(user),
      accessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    
    // Handle demo user
    if (userId === 'demo-user-id') {
      const demoUser = {
        _id: 'demo-user-id',
        email: 'demo@example.com',
        name: 'Demo User',
        provider: 'local',
        settings: {
          timezone: 'UTC',
          defaultPomodoroSettings: {
            workMinutes: 25,
            shortBreakMinutes: 5,
            longBreakMinutes: 15,
            longBreakInterval: 4
          },
          notifications: {
            push: true,
            email: true,
            desktop: true
          },
          theme: 'system'
        }
      };
      
      return res.json(demoUser);
    }
    
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(createUserResponse(user));
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = (req as any).user?.userId;
    const updates = req.body;

    // Don't allow certain fields to be updated
    delete updates.hashedPassword;
    delete updates.provider;
    delete updates.providerId;
    delete updates.refreshTokens;
    delete updates._id;

    const user = await User.findByIdAndUpdate(
      userId,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(createUserResponse(user));
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
