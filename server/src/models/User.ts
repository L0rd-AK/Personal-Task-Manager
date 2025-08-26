import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: string;
  email: string;
  name: string;
  hashedPassword?: string;
  avatar?: string;
  provider: 'local' | 'google';
  providerId?: string;
  refreshTokens: string[];
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
  pushSubscriptions: Array<{
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
    userAgent?: string;
    createdAt: Date;
  }>;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  hashedPassword: {
    type: String,
    minlength: 6
  },
  avatar: {
    type: String,
    default: null
  },
  provider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  providerId: {
    type: String,
    default: null
  },
  refreshTokens: [{
    type: String
  }],
  settings: {
    timezone: {
      type: String,
      default: 'UTC'
    },
    defaultPomodoroSettings: {
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
    notifications: {
      push: {
        type: Boolean,
        default: true
      },
      email: {
        type: Boolean,
        default: true
      },
      desktop: {
        type: Boolean,
        default: true
      }
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    }
  },
  pushSubscriptions: [{
    endpoint: {
      type: String,
      required: true
    },
    keys: {
      p256dh: {
        type: String,
        required: true
      },
      auth: {
        type: String,
        required: true
      }
    },
    userAgent: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  lastActiveAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving
UserSchema.pre('save', async function(this: IUser, next) {
  if (!this.isModified('hashedPassword') || !this.hashedPassword) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.hashedPassword = await bcrypt.hash(this.hashedPassword, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Method to check password
UserSchema.methods.comparePassword = async function(password: string): Promise<boolean> {
  if (!this.hashedPassword) return false;
  return bcrypt.compare(password, this.hashedPassword);
};

// Method to add push subscription
UserSchema.methods.addPushSubscription = function(subscription: any) {
  // Remove existing subscription with same endpoint
  this.pushSubscriptions = this.pushSubscriptions.filter(
    (sub: any) => sub.endpoint !== subscription.endpoint
  );
  
  // Add new subscription
  this.pushSubscriptions.push({
    endpoint: subscription.endpoint,
    keys: subscription.keys,
    userAgent: subscription.userAgent,
    createdAt: new Date()
  });
};

export const User = mongoose.model<IUser>('User', UserSchema);
export default User;