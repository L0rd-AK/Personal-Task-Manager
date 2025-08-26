import mongoose, { Document, Schema } from 'mongoose';

export interface INote extends Document {
  _id: string;
  userId: string;
  title: string;
  content: string;
  contentType: 'markdown' | 'checklist';
  pinned: boolean;
  color: string;
  labels: string[];
  linkedTaskId?: string;
  attachments: Array<{
    url: string;
    filename: string;
    size: number;
    contentType: string;
    uploadedAt: Date;
  }>;
  checklist?: Array<{
    id: string;
    text: string;
    completed: boolean;
    order: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema = new Schema<INote>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    default: '',
    maxlength: 10000
  },
  contentType: {
    type: String,
    enum: ['markdown', 'checklist'],
    default: 'markdown'
  },
  pinned: {
    type: Boolean,
    default: false
  },
  color: {
    type: String,
    default: '#ffffff',
    match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
  },
  labels: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  linkedTaskId: {
    type: Schema.Types.ObjectId,
    ref: 'Task',
    default: null
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
  checklist: [{
    id: {
      type: String,
      required: true
    },
    text: {
      type: String,
      required: true,
      maxlength: 500
    },
    completed: {
      type: Boolean,
      default: false
    },
    order: {
      type: Number,
      required: true
    }
  }]
}, {
  timestamps: true
});

// Indexes
NoteSchema.index({ userId: 1, pinned: -1, updatedAt: -1 });
NoteSchema.index({ userId: 1, labels: 1 });
NoteSchema.index({ userId: 1, linkedTaskId: 1 });

export const Note = mongoose.model<INote>('Note', NoteSchema);
export default Note;