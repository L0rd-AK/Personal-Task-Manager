import mongoose, { Document, Schema } from 'mongoose';

export interface ITaskHistory {
  action: 'created' | 'started' | 'paused' | 'resumed' | 'completed' | 'given_up' | 'snoozed';
  by: string; // userId
  at: Date;
  reason?: string;
  previousStatus?: string;
}

export interface ITask extends Document {
  _id: string;
  userId: string;
  projectId?: string;
  title: string;
  description?: string;
  status: 'ongoing' | 'completed' | 'given_up' | 'paused';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[];
  startsAt: Date;
  endsAt: Date;
  originalDuration: number; // in seconds
  timeSpentSeconds: number;
  canPause: boolean;
  canSnooze: boolean;
  pausedAt?: Date;
  pausedDuration: number; // total paused time in seconds
  snoozeUntil?: Date;
  pomodoroCount: number;
  pomodoroSettings?: {
    workMinutes: number;
    shortBreakMinutes: number;
    longBreakMinutes: number;
    longBreakInterval: number;
  };
  attachments: Array<{
    url: string;
    filename: string;
    size: number;
    contentType: string;
    uploadedAt: Date;
  }>;
  history: ITaskHistory[];
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    default: null
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  status: {
    type: String,
    enum: ['ongoing', 'completed', 'given_up', 'paused'],
    default: 'ongoing',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  startsAt: {
    type: Date,
    default: Date.now
  },
  endsAt: {
    type: Date,
    required: true,
    index: true
  },
  originalDuration: {
    type: Number,
    required: true,
    min: 60 // minimum 1 minute
  },
  timeSpentSeconds: {
    type: Number,
    default: 0,
    min: 0
  },
  canPause: {
    type: Boolean,
    default: false
  },
  canSnooze: {
    type: Boolean,
    default: false
  },
  pausedAt: {
    type: Date,
    default: null
  },
  pausedDuration: {
    type: Number,
    default: 0,
    min: 0
  },
  snoozeUntil: {
    type: Date,
    default: null
  },
  pomodoroCount: {
    type: Number,
    default: 0,
    min: 0
  },
  pomodoroSettings: {
    workMinutes: {
      type: Number,
      default: 25,
      min: 1,
      max: 120
    },
    shortBreakMinutes: {
      type: Number,
      default: 5,
      min: 1,
      max: 30
    },
    longBreakMinutes: {
      type: Number,
      default: 15,
      min: 1,
      max: 60
    },
    longBreakInterval: {
      type: Number,
      default: 4,
      min: 2,
      max: 10
    }
  },
  attachments: [{
    url: {
      type: String,
      required: true
    },
    filename: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    contentType: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  history: [{
    action: {
      type: String,
      enum: ['created', 'started', 'paused', 'resumed', 'completed', 'given_up', 'snoozed'],
      required: true
    },
    by: {
      type: String,
      required: true
    },
    at: {
      type: Date,
      default: Date.now
    },
    reason: String,
    previousStatus: String
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for remaining time in seconds
TaskSchema.virtual('remainingSeconds').get(function(this: ITask) {
  if (this.status !== 'ongoing') return 0;
  if (this.pausedAt) return Math.max(0, Math.floor((this.endsAt.getTime() - this.pausedAt.getTime()) / 1000));
  
  const now = new Date();
  const remaining = Math.floor((this.endsAt.getTime() - now.getTime()) / 1000);
  return Math.max(0, remaining);
});

// Virtual for is overdue
TaskSchema.virtual('isOverdue').get(function(this: ITask) {
  if (this.status !== 'ongoing') return false;
  return new Date() > this.endsAt;
});

// Index for efficient queries
TaskSchema.index({ userId: 1, status: 1, endsAt: 1 });
TaskSchema.index({ userId: 1, projectId: 1, status: 1 });
TaskSchema.index({ endsAt: 1, status: 1 }); // For scheduled jobs

// Pre-save middleware to add creation history
TaskSchema.pre('save', function(this: ITask, next) {
  if (this.isNew) {
    this.history.push({
      action: 'created',
      by: this.userId,
      at: new Date()
    });
  }
  next();
});

// Method to add history entry
TaskSchema.methods.addHistory = function(action: ITaskHistory['action'], userId: string, reason?: string, previousStatus?: string) {
  this.history.push({
    action,
    by: userId,
    at: new Date(),
    reason,
    previousStatus
  });
};

// Method to calculate actual time spent
TaskSchema.methods.calculateTimeSpent = function() {
  const now = new Date();
  let totalSpent = this.timeSpentSeconds;
  
  if (this.status === 'ongoing' && !this.pausedAt) {
    // Add current session time
    const sessionTime = Math.floor((now.getTime() - this.startsAt.getTime()) / 1000);
    totalSpent += sessionTime - this.pausedDuration;
  }
  
  return Math.max(0, totalSpent);
};

export const Task = mongoose.model<ITask>('Task', TaskSchema);
export default Task;