import express from 'express';
import { body, param, query } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  completeTask,
  giveUpTask,
  pauseTask,
  resumeTask,
  snoozeTask,
  deleteTask,
  getTaskAnalytics
} from '../controllers/tasks.js';

const router = express.Router();

// Validation rules
const createTaskValidation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be 1-200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must be max 2000 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be one of: low, medium, high, urgent'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Each tag must be max 50 characters'),
  body('projectId')
    .optional()
    .isMongoId()
    .withMessage('Invalid project ID'),
  body('duration')
    .optional()
    .isInt({ min: 60 })
    .withMessage('Duration must be at least 60 seconds'),
  body('naturalTime')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Natural time must be 1-100 characters'),
  body('canPause')
    .optional()
    .isBoolean()
    .withMessage('canPause must be boolean'),
  body('canSnooze')
    .optional()
    .isBoolean()
    .withMessage('canSnooze must be boolean')
];

const updateTaskValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be 1-200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must be max 2000 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be one of: low, medium, high, urgent'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Each tag must be max 50 characters')
];

const taskIdValidation = [
  param('id').isMongoId().withMessage('Invalid task ID')
];

const queryValidation = [
  query('status')
    .optional()
    .isIn(['ongoing', 'completed', 'given_up', 'paused'])
    .withMessage('Invalid status'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be non-negative')
];

// Routes
router.get('/analytics', authenticateToken, getTaskAnalytics);
router.get('/', authenticateToken, queryValidation, getTasks);
router.get('/:id', authenticateToken, taskIdValidation, getTask);
router.post('/', authenticateToken, createTaskValidation, createTask);
router.patch('/:id', authenticateToken, taskIdValidation, updateTaskValidation, updateTask);
router.post('/:id/complete', authenticateToken, taskIdValidation, completeTask);
router.post('/:id/give-up', authenticateToken, taskIdValidation, giveUpTask);
router.post('/:id/pause', authenticateToken, taskIdValidation, pauseTask);
router.post('/:id/resume', authenticateToken, taskIdValidation, resumeTask);
router.post('/:id/snooze', authenticateToken, taskIdValidation, snoozeTask);
router.delete('/:id', authenticateToken, taskIdValidation, deleteTask);

export default router;