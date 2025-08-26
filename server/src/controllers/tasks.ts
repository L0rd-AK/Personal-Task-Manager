import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import Task, { ITask, ITaskHistory } from '../models/Task.js';
import Project from '../models/Project.js';
import { parseNaturalLanguage } from '../utils/timeParser.js';
import { io } from '../index.js';
// Temporarily disabled Redis-dependent task jobs
// import { scheduleTaskReminder, cancelTaskReminder } from '../jobs/taskJobs.js';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

// GET /api/tasks
export const getTasks = async (req: AuthRequest, res: Response) => {
  try {
    console.log('getTasks: Starting task fetch for user:', req.user?.userId);
    const { status, projectId, tags, search, limit = 50, offset = 0 } = req.query;
    const userId = req.user!.userId;

    const query: any = { userId };

    if (status) {
      query.status = status;
    }
    if (projectId && projectId !== 'null') {
      query.projectId = projectId;
    }
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query.tags = { $in: tagArray };
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    console.log('getTasks: Query:', query);

    const tasks = await Task.find(query)
      .populate('projectId', 'title color')
      .sort({ 
        status: 1, // ongoing first
        priority: -1, // urgent first
        endsAt: 1 // earliest deadline first
      })
      .limit(parseInt(limit as string))
      .skip(parseInt(offset as string))
      .lean();

    console.log('getTasks: Found tasks count:', tasks.length);
    console.log('getTasks: Tasks data:', tasks);

    // Add computed fields
    const enrichedTasks = tasks.map(task => ({
      ...task,
      remainingSeconds: task.status === 'ongoing' && !task.pausedAt
        ? Math.max(0, Math.floor((new Date(task.endsAt).getTime() - Date.now()) / 1000))
        : 0,
      isOverdue: task.status === 'ongoing' && new Date() > new Date(task.endsAt)
    }));

    console.log('getTasks: Returning enriched tasks count:', enrichedTasks.length);
    res.json(enrichedTasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/tasks/:id
export const getTask = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const task = await Task.findOne({ _id: id, userId })
      .populate('projectId', 'title color')
      .lean();

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Add computed fields
    const enrichedTask = {
      ...task,
      remainingSeconds: task.status === 'ongoing' && !task.pausedAt
        ? Math.max(0, Math.floor((new Date(task.endsAt).getTime() - Date.now()) / 1000))
        : 0,
      isOverdue: task.status === 'ongoing' && new Date() > new Date(task.endsAt),
      timeSpent: calculateActualTimeSpent(task)
    };

    res.json(enrichedTask);
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/tasks
export const createTask = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user!.userId;
    const { 
      title, 
      description, 
      projectId, 
      priority = 'medium',
      tags = [],
      naturalTime,
      duration,
      endsAt: explicitEndsAt,
      canPause = false,
      canSnooze = false,
      pomodoroSettings
    } = req.body;

    let endsAt: Date;
    let originalDuration: number;

    if (explicitEndsAt) {
      endsAt = new Date(explicitEndsAt);
      originalDuration = Math.floor((endsAt.getTime() - Date.now()) / 1000);
    } else if (duration) {
      originalDuration = parseInt(duration);
      endsAt = new Date(Date.now() + originalDuration * 1000);
    } else if (naturalTime) {
      const parsed = parseNaturalLanguage(naturalTime);
      if (!parsed) {
        return res.status(400).json({ message: 'Could not parse natural language time' });
      }
      endsAt = parsed.endsAt;
      originalDuration = parsed.duration;
    } else {
      return res.status(400).json({ message: 'Must provide duration, endsAt, or naturalTime' });
    }

    // Validate minimum duration (1 minute)
    if (originalDuration < 60) {
      return res.status(400).json({ message: 'Task duration must be at least 1 minute' });
    }

    const task = new Task({
      userId,
      projectId: projectId || null,
      title: title.trim(),
      description: description?.trim(),
      priority,
      tags: Array.isArray(tags) ? tags.map((t: string) => t.trim()) : [],
      endsAt,
      originalDuration,
      canPause,
      canSnooze,
      pomodoroSettings: pomodoroSettings || undefined
    });

    await task.save();

    // Update project task count
    if (projectId) {
      await Project.findOneAndUpdate(
        { _id: projectId, userId },
        { $inc: { taskCount: 1 } }
      );
    }

    // Schedule reminder notifications
    // await scheduleTaskReminder(task._id, userId, endsAt); // Temporarily disabled

    // Populate project for response
    await task.populate('projectId', 'title color');

    // Broadcast to all user's connected clients
    io.to(`user:${userId}`).emit('task:created', task);

    res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// PATCH /api/tasks/:id
export const updateTask = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const userId = req.user!.userId;
    const updates = req.body;

    // Don't allow direct status updates through this endpoint
    delete updates.status;
    delete updates.userId;
    delete updates._id;

    const task = await Task.findOneAndUpdate(
      { _id: id, userId },
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('projectId', 'title color');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Broadcast update
    io.to(`user:${userId}`).emit('task:updated', task);

    res.json(task);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/tasks/:id/complete
export const completeTask = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { reason } = req.body;

    const task = await Task.findOne({ _id: id, userId });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.status !== 'ongoing' && task.status !== 'paused') {
      return res.status(400).json({ message: 'Task is not active' });
    }

    const previousStatus = task.status;
    
    // Calculate final time spent
    task.timeSpentSeconds = calculateActualTimeSpent(task);
    task.status = 'completed';
    task.pausedAt = undefined;
    
    // Add to history
    task.addHistory('completed', userId, reason, previousStatus);
    
    await task.save();

    // Update project completed count
    if (task.projectId) {
      await Project.findOneAndUpdate(
        { _id: task.projectId, userId },
        { $inc: { completedTaskCount: 1 } }
      );
    }

    // Cancel any scheduled reminders
    // await cancelTaskReminder(task._id); // Temporarily disabled

    await task.populate('projectId', 'title color');

    // Broadcast completion
    io.to(`user:${userId}`).emit('task:completed', task);

    res.json(task);
  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/tasks/:id/give-up
export const giveUpTask = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { reason } = req.body;

    const task = await Task.findOne({ _id: id, userId });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.status !== 'ongoing' && task.status !== 'paused') {
      return res.status(400).json({ message: 'Task is not active' });
    }

    const previousStatus = task.status;
    
    // Calculate final time spent
    task.timeSpentSeconds = calculateActualTimeSpent(task);
    task.status = 'given_up';
    task.pausedAt = undefined;
    
    // Add to history
    task.addHistory('given_up', userId, reason, previousStatus);
    
    await task.save();

    // Cancel any scheduled reminders
    // await cancelTaskReminder(task._id); // Temporarily disabled

    await task.populate('projectId', 'title color');

    // Broadcast give up
    io.to(`user:${userId}`).emit('task:given_up', task);

    res.json(task);
  } catch (error) {
    console.error('Give up task error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/tasks/:id/pause (hidden by default)
export const pauseTask = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const task = await Task.findOne({ _id: id, userId });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.status !== 'ongoing') {
      return res.status(400).json({ message: 'Task is not ongoing' });
    }

    if (!task.canPause) {
      return res.status(400).json({ message: 'Task cannot be paused' });
    }

    const previousStatus = task.status;
    task.status = 'paused';
    task.pausedAt = new Date();
    
    task.addHistory('paused', userId, undefined, previousStatus);
    await task.save();

    await task.populate('projectId', 'title color');

    io.to(`user:${userId}`).emit('task:paused', task);

    res.json(task);
  } catch (error) {
    console.error('Pause task error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/tasks/:id/resume
export const resumeTask = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const task = await Task.findOne({ _id: id, userId });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.status !== 'paused') {
      return res.status(400).json({ message: 'Task is not paused' });
    }

    const previousStatus = task.status;
    const pauseDuration = task.pausedAt 
      ? Math.floor((Date.now() - task.pausedAt.getTime()) / 1000)
      : 0;
      
    task.pausedDuration += pauseDuration;
    task.status = 'ongoing';
    task.pausedAt = undefined;
    
    task.addHistory('resumed', userId, undefined, previousStatus);
    await task.save();

    await task.populate('projectId', 'title color');

    io.to(`user:${userId}`).emit('task:resumed', task);

    res.json(task);
  } catch (error) {
    console.error('Resume task error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/tasks/:id/snooze (hidden by default)
export const snoozeTask = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { snoozeMinutes = 10 } = req.body;

    const task = await Task.findOne({ _id: id, userId });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.status !== 'ongoing') {
      return res.status(400).json({ message: 'Task is not ongoing' });
    }

    if (!task.canSnooze) {
      return res.status(400).json({ message: 'Task cannot be snoozed' });
    }

    const snoozeUntil = new Date(Date.now() + snoozeMinutes * 60 * 1000);
    const extendBy = snoozeMinutes * 60 * 1000;
    
    task.endsAt = new Date(task.endsAt.getTime() + extendBy);
    task.snoozeUntil = snoozeUntil;
    task.originalDuration += snoozeMinutes * 60;
    
    task.addHistory('snoozed', userId, `Snoozed for ${snoozeMinutes} minutes`);
    await task.save();

    // Reschedule reminders
    // await cancelTaskReminder(task._id); // Temporarily disabled
    // await scheduleTaskReminder(task._id, userId, task.endsAt); // Temporarily disabled

    await task.populate('projectId', 'title color');

    io.to(`user:${userId}`).emit('task:snoozed', task);

    res.json(task);
  } catch (error) {
    console.error('Snooze task error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// DELETE /api/tasks/:id
export const deleteTask = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const task = await Task.findOneAndDelete({ _id: id, userId });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Update project task count
    if (task.projectId) {
      const decrements: any = { taskCount: -1 };
      if (task.status === 'completed') {
        decrements.completedTaskCount = -1;
      }
      
      await Project.findOneAndUpdate(
        { _id: task.projectId, userId },
        { $inc: decrements }
      );
    }

    // Cancel any scheduled reminders
    // await cancelTaskReminder(task._id); // Temporarily disabled

    io.to(`user:${userId}`).emit('task:deleted', { _id: task._id });

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Helper function to calculate actual time spent
function calculateActualTimeSpent(task: any): number {
  const now = new Date();
  let totalSpent = task.timeSpentSeconds || 0;
  
  if (task.status === 'ongoing' && !task.pausedAt) {
    // Add current session time
    const sessionStart = task.startsAt || task.createdAt;
    const sessionTime = Math.floor((now.getTime() - sessionStart.getTime()) / 1000);
    totalSpent += sessionTime - (task.pausedDuration || 0);
  }
  
  return Math.max(0, totalSpent);
}

// GET /api/tasks/analytics
export const getTaskAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { period = '7d' } = req.query;

    let startDate = new Date();
    switch (period) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    const tasks = await Task.find({
      userId,
      createdAt: { $gte: startDate }
    }).lean();

    const analytics = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      givenUpTasks: tasks.filter(t => t.status === 'given_up').length,
      ongoingTasks: tasks.filter(t => t.status === 'ongoing').length,
      totalTimeSpent: tasks.reduce((sum, task) => sum + (task.timeSpentSeconds || 0), 0),
      averageTaskDuration: tasks.length > 0 
        ? tasks.reduce((sum, task) => sum + task.originalDuration, 0) / tasks.length 
        : 0,
      completionRate: tasks.length > 0 
        ? (tasks.filter(t => t.status === 'completed').length / tasks.length) * 100 
        : 0,
      totalPomodoros: tasks.reduce((sum, task) => sum + (task.pomodoroCount || 0), 0),
      tasksByPriority: {
        urgent: tasks.filter(t => t.priority === 'urgent').length,
        high: tasks.filter(t => t.priority === 'high').length,
        medium: tasks.filter(t => t.priority === 'medium').length,
        low: tasks.filter(t => t.priority === 'low').length,
      }
    };

    res.json(analytics);
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};