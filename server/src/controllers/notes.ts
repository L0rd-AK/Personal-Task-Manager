import { Request, Response } from 'express';
import { Note } from '../models/Note.js';
import { Task } from '../models/Task.js';
import { AuthRequest } from '../middleware/auth.js';
import { io } from '../index.js';

// GET /api/notes
export const getNotes = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { 
      search, 
      color, 
      pinned, 
      linkedTaskId,
      contentType,
      limit = 50,
      offset = 0 
    } = req.query;

    const filter: any = { userId };

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { labels: { $in: [new RegExp(search as string, 'i')] } }
      ];
    }

    if (color) filter.color = color;
    if (pinned !== undefined) filter.pinned = pinned === 'true';
    if (linkedTaskId) filter.linkedTaskId = linkedTaskId;
    if (contentType) filter.contentType = contentType;

    const notes = await Note.find(filter)
      .sort({ pinned: -1, updatedAt: -1 })
      .limit(Number(limit))
      .skip(Number(offset))
      .populate('linkedTaskId', 'title status');

    const total = await Note.countDocuments(filter);

    res.json({
      notes,
      total,
      hasMore: total > Number(offset) + notes.length
    });
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/notes/:id
export const getNote = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const note = await Note.findOne({ _id: id, userId })
      .populate('linkedTaskId', 'title status priority');

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    res.json(note);
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/notes
export const createNote = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { 
      title, 
      content = '', 
      color = '#ffffff', 
      labels = [], 
      linkedTaskId,
      contentType = 'markdown',
      checklist = [],
      pinned = false 
    } = req.body;

    // Validate linked task if provided
    if (linkedTaskId) {
      const task = await Task.findOne({ _id: linkedTaskId, userId });
      if (!task) {
        return res.status(400).json({ message: 'Linked task not found' });
      }
    }

    const note = new Note({
      userId,
      title,
      content,
      color,
      labels,
      linkedTaskId,
      contentType,
      checklist,
      pinned
    });

    await note.save();
    await note.populate('linkedTaskId', 'title status');

    // Broadcast to connected clients
    io.to(`user:${userId}`).emit('note:created', note);

    res.status(201).json(note);
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// PATCH /api/notes/:id
export const updateNote = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const updates = req.body;

    const note = await Note.findOne({ _id: id, userId });
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Validate linked task if being updated
    if (updates.linkedTaskId) {
      const task = await Task.findOne({ _id: updates.linkedTaskId, userId });
      if (!task) {
        return res.status(400).json({ message: 'Linked task not found' });
      }
    }

    // Update checklist items if provided
    if (updates.checklist) {
      note.checklist = updates.checklist.map((item: any, index: number) => ({
        ...item,
        order: index
      }));
    }

    // Update other fields
    Object.assign(note, updates);
    await note.save();
    await note.populate('linkedTaskId', 'title status');

    // Broadcast to connected clients
    io.to(`user:${userId}`).emit('note:updated', note);

    res.json(note);
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// DELETE /api/notes/:id
export const deleteNote = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const note = await Note.findOneAndDelete({ _id: id, userId });
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Broadcast to connected clients
    io.to(`user:${userId}`).emit('note:deleted', { id });

    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/notes/:id/checklist/:itemId
export const toggleChecklistItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id, itemId } = req.params;
    const userId = req.user!.userId;

    const note = await Note.findOne({ _id: id, userId });
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    const item = note.checklist?.find(item => item.id === itemId);
    if (!item) {
      return res.status(404).json({ message: 'Checklist item not found' });
    }

    item.completed = !item.completed;
    await note.save();

    // Broadcast to connected clients
    io.to(`user:${userId}`).emit('note:updated', note);

    res.json(note);
  } catch (error) {
    console.error('Toggle checklist item error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/notes/:id/pin
export const togglePinNote = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const note = await Note.findOne({ _id: id, userId });
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    note.pinned = !note.pinned;
    await note.save();

    // Broadcast to connected clients
    io.to(`user:${userId}`).emit('note:updated', note);

    res.json(note);
  } catch (error) {
    console.error('Toggle pin note error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/notes/:id/link-task/:taskId
export const linkTaskToNote = async (req: AuthRequest, res: Response) => {
  try {
    const { id, taskId } = req.params;
    const userId = req.user!.userId;

    const [note, task] = await Promise.all([
      Note.findOne({ _id: id, userId }),
      Task.findOne({ _id: taskId, userId })
    ]);

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    note.linkedTaskId = taskId;
    await note.save();
    await note.populate('linkedTaskId', 'title status');

    // Broadcast to connected clients
    io.to(`user:${userId}`).emit('note:updated', note);

    res.json(note);
  } catch (error) {
    console.error('Link task to note error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// DELETE /api/notes/:id/link-task
export const unlinkTaskFromNote = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const note = await Note.findOne({ _id: id, userId });
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    note.linkedTaskId = undefined;
    await note.save();

    // Broadcast to connected clients
    io.to(`user:${userId}`).emit('note:updated', note);

    res.json(note);
  } catch (error) {
    console.error('Unlink task from note error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/notes/search
export const searchNotes = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { q, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const notes = await Note.find({
      userId,
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { content: { $regex: q, $options: 'i' } },
        { labels: { $in: [new RegExp(q as string, 'i')] } }
      ]
    })
    .sort({ pinned: -1, updatedAt: -1 })
    .limit(Number(limit))
    .populate('linkedTaskId', 'title status');

    res.json(notes);
  } catch (error) {
    console.error('Search notes error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
