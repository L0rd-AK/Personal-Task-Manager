import express from 'express';
import { body, param, query } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import {
  getNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  toggleChecklistItem,
  togglePinNote,
  linkTaskToNote,
  unlinkTaskFromNote,
  searchNotes
} from '../controllers/notes.js';

const router = express.Router();

// Validation rules
const createNoteValidation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be 1-200 characters'),
  body('content')
    .optional()
    .trim()
    .isLength({ max: 10000 })
    .withMessage('Content must be max 10000 characters'),
  body('color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Invalid color format'),
  body('labels')
    .optional()
    .isArray()
    .withMessage('Labels must be an array'),
  body('checklist')
    .optional()
    .isArray()
    .withMessage('Checklist must be an array')
];

const noteIdValidation = [
  param('id').isMongoId().withMessage('Invalid note ID')
];

const taskIdValidation = [
  param('taskId').isMongoId().withMessage('Invalid task ID')
];

const itemIdValidation = [
  param('itemId').isString().withMessage('Invalid item ID')
];

// Routes
router.get('/', authenticateToken, getNotes);
router.get('/search', authenticateToken, searchNotes);
router.get('/:id', authenticateToken, noteIdValidation, getNote);
router.post('/', authenticateToken, createNoteValidation, createNote);
router.patch('/:id', authenticateToken, noteIdValidation, updateNote);
router.delete('/:id', authenticateToken, noteIdValidation, deleteNote);

// Checklist operations
router.post('/:id/checklist/:itemId', authenticateToken, noteIdValidation, itemIdValidation, toggleChecklistItem);

// Pin operations
router.post('/:id/pin', authenticateToken, noteIdValidation, togglePinNote);

// Task linking operations
router.post('/:id/link-task/:taskId', authenticateToken, noteIdValidation, taskIdValidation, linkTaskToNote);
router.delete('/:id/link-task', authenticateToken, noteIdValidation, unlinkTaskFromNote);

export default router;
