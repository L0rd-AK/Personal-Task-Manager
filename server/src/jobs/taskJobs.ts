import { Queue, Worker } from 'bullmq';
import webpush from 'web-push';
import Task from '../models/Task.js';
import User from '../models/User.js';
import { io } from '../index.js';

// Configure web push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:noreply@taskmanager.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// Create Redis connection
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD
};

// Task reminder queue
export const taskReminderQueue = new Queue('task-reminders', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50
  }
});

// Task reminder worker
const taskReminderWorker = new Worker('task-reminders', async (job) => {
  const { taskId, userId, type, scheduledFor } = job.data;
  
  try {
    // Get task and user
    const [task, user] = await Promise.all([
      Task.findById(taskId),
      User.findById(userId)
    ]);
    
    if (!task || !user) {
      console.log(`Task or user not found for reminder: ${taskId}, ${userId}`);
      return;
    }
    
    // Skip if task is no longer ongoing
    if (task.status !== 'ongoing') {
      console.log(`Task ${taskId} is no longer ongoing, skipping reminder`);
      return;
    }
    
    const now = new Date();
    const isOverdue = now > task.endsAt;
    
    // Prepare notification content
    let title = '';
    let body = '';
    let urgency: 'low' | 'normal' | 'high' = 'normal';
    
    switch (type) {
      case 'deadline':
        title = isOverdue ? 'Task Overdue!' : 'Task Deadline Reached!';
        body = `"${task.title}" ${isOverdue ? 'is overdue' : 'deadline has arrived'}`;
        urgency = 'high';
        break;
      case 'warning':
        title = 'Task Deadline Approaching';
        body = `"${task.title}" is due soon`;
        urgency = 'normal';
        break;
      case 'pomodoro':
        title = 'Pomodoro Session Complete';
        body = `Time for a break from "${task.title}"`;
        urgency = 'normal';
        break;
      default:
        title = 'Task Reminder';
        body = `Don't forget about "${task.title}"`;
    }
    
    // Send push notifications
    if (user.settings.notifications.push && user.pushSubscriptions.length > 0) {
      const payload = JSON.stringify({
        title,
        body,
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        data: {
          taskId: task._id,
          type,
          timestamp: now.toISOString()
        },
        actions: [
          {
            action: 'complete',
            title: 'Mark Complete'
          },
          {
            action: 'snooze',
            title: 'Snooze 10min'
          }
        ],
        requireInteraction: urgency === 'high',
        tag: `task-${taskId}`
      });
      
      // Send to all user's subscriptions
      const pushPromises = user.pushSubscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(subscription, payload);
        } catch (error) {
          console.error('Push notification error:', error);
          // Remove invalid subscriptions
          if ((error as any).statusCode === 410 || (error as any).statusCode === 404) {
            user.pushSubscriptions = user.pushSubscriptions.filter(
              sub => sub.endpoint !== subscription.endpoint
            );
            await user.save();
          }
        }
      });
      
      await Promise.allSettled(pushPromises);
    }
    
    // Send socket notification to connected clients
    io.to(`user:${userId}`).emit('task:reminder', {
      task,
      type,
      title,
      body,
      timestamp: now.toISOString(),
      urgency
    });
    
    console.log(`Sent ${type} reminder for task ${taskId} to user ${userId}`);
    
  } catch (error) {
    console.error('Task reminder job error:', error);
    throw error;
  }
}, {
  connection: redisConnection,
  concurrency: 5
});

// Schedule task reminder
export const scheduleTaskReminder = async (taskId: string, userId: string, endsAt: Date) => {
  try {
    // Cancel any existing reminders for this task
    await cancelTaskReminder(taskId);
    
    const now = new Date();
    const timeUntilDeadline = endsAt.getTime() - now.getTime();
    
    // Schedule deadline reminder
    await taskReminderQueue.add(
      `task-deadline-${taskId}`,
      {
        taskId,
        userId,
        type: 'deadline',
        scheduledFor: endsAt.toISOString()
      },
      {
        delay: Math.max(0, timeUntilDeadline),
        jobId: `deadline-${taskId}`
      }
    );
    
    // Schedule warning reminders (5 minutes and 1 minute before deadline)
    const warnings = [
      { minutes: 5, delay: Math.max(0, timeUntilDeadline - 5 * 60 * 1000) },
      { minutes: 1, delay: Math.max(0, timeUntilDeadline - 1 * 60 * 1000) }
    ];
    
    for (const warning of warnings) {
      if (warning.delay > 0) {
        await taskReminderQueue.add(
          `task-warning-${taskId}-${warning.minutes}m`,
          {
            taskId,
            userId,
            type: 'warning',
            minutesUntilDeadline: warning.minutes,
            scheduledFor: new Date(now.getTime() + warning.delay).toISOString()
          },
          {
            delay: warning.delay,
            jobId: `warning-${taskId}-${warning.minutes}m`
          }
        );
      }
    }
    
    console.log(`Scheduled reminders for task ${taskId}, deadline: ${endsAt.toISOString()}`);
    
  } catch (error) {
    console.error('Error scheduling task reminder:', error);
  }
};

// Cancel task reminders
export const cancelTaskReminder = async (taskId: string) => {
  try {
    const jobIds = [
      `deadline-${taskId}`,
      `warning-${taskId}-5m`,
      `warning-${taskId}-1m`,
      `pomodoro-${taskId}`
    ];
    
    for (const jobId of jobIds) {
      try {
        const job = await taskReminderQueue.getJob(jobId);
        if (job) {
          await job.remove();
        }
      } catch (error) {
        // Job might not exist, continue
      }
    }
    
    console.log(`Cancelled reminders for task ${taskId}`);
    
  } catch (error) {
    console.error('Error cancelling task reminders:', error);
  }
};

// Schedule pomodoro reminder
export const schedulePomodoroReminder = async (taskId: string, userId: string, duration: number) => {
  try {
    await taskReminderQueue.add(
      `pomodoro-${taskId}`,
      {
        taskId,
        userId,
        type: 'pomodoro',
        scheduledFor: new Date(Date.now() + duration * 1000).toISOString()
      },
      {
        delay: duration * 1000,
        jobId: `pomodoro-${taskId}`
      }
    );
    
    console.log(`Scheduled pomodoro reminder for task ${taskId} in ${duration}s`);
    
  } catch (error) {
    console.error('Error scheduling pomodoro reminder:', error);
  }
};

// Handle worker events
taskReminderWorker.on('completed', (job) => {
  console.log(`Task reminder job ${job.id} completed`);
});

taskReminderWorker.on('failed', (job, err) => {
  console.error(`Task reminder job ${job?.id} failed:`, err);
});

taskReminderWorker.on('error', (err) => {
  console.error('Task reminder worker error:', err);
});

export { taskReminderWorker };