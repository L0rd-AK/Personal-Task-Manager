import mongoose, { Document, Schema } from 'mongoose';

export interface IProject extends Document {
  _id: string;
  userId: string;
  title: string;
  description?: string;
  color: string;
  icon?: string;
  archived: boolean;
  taskCount: number;
  completedTaskCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  color: {
    type: String,
    default: '#3B82F6',
    match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
  },
  icon: {
    type: String,
    maxlength: 50
  },
  archived: {
    type: Boolean,
    default: false
  },
  taskCount: {
    type: Number,
    default: 0,
    min: 0
  },
  completedTaskCount: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Index for efficient queries
ProjectSchema.index({ userId: 1, archived: 1, updatedAt: -1 });

// Virtual for completion percentage
ProjectSchema.virtual('completionPercentage').get(function(this: IProject) {
  if (this.taskCount === 0) return 0;
  return Math.round((this.completedTaskCount / this.taskCount) * 100);
});

export const Project = mongoose.model<IProject>('Project', ProjectSchema);
export default Project;