import React, { useState } from 'react';
import { CreateTaskData, TaskPriority } from '../types/Task';
import { parseNaturalTime } from '../utils/timeParser';

interface TaskCreateModalProps {
  onClose: () => void;
  onSuccess: (task: any) => void;
}

export const TaskCreateModal: React.FC<TaskCreateModalProps> = ({
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState<CreateTaskData>({
    title: '',
    description: '',
    priority: 'medium',
    tags: [],
    naturalTime: '',
    canPause: true,
    canSnooze: true
  });
  
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Parse natural time if provided
      let taskData = { ...formData };
      
      if (formData.naturalTime) {
        const parsed = parseNaturalTime(formData.naturalTime);
        if (parsed) {
          taskData = {
            ...taskData,
            duration: parsed.duration,
            endsAt: parsed.endsAt
          };
        }
      }

      // For demo, just call onSuccess with mock data
      const mockTask = {
        _id: Date.now().toString(),
        ...taskData,
        userId: 'demo-user',
        status: 'ongoing' as const,
        timeSpentSeconds: 0,
        pausedDuration: 0,
        pomodoroCount: 0,
        attachments: [],
        history: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        startsAt: new Date().toISOString(),
        endsAt: taskData.endsAt || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        originalDuration: taskData.duration || 3600
      };

      onSuccess(mockTask);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(t => t !== tag) || []
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Create New Task</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            title="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="What needs to be done?"
              required
            />
          </div>

          {/* Natural Time Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Natural Time (e.g., "in 2 hours", "tomorrow 10am")
            </label>
            <input
              type="text"
              value={formData.naturalTime || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, naturalTime: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Finish slides in 2h"
            />
            <p className="mt-1 text-xs text-gray-500">
              Try: "in 30 minutes", "tomorrow 9am", "next friday 2pm"
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Add more details..."
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as TaskPriority }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add a tag..."
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add
              </button>
            </div>
            
            {/* Tag list */}
            {formData.tags && formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                      title={`Remove ${tag} tag`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Options */}
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="canPause"
                checked={formData.canPause}
                onChange={(e) => setFormData(prev => ({ ...prev, canPause: e.target.checked }))}
                className="mr-2"
              />
              <label htmlFor="canPause" className="text-sm text-gray-700">
                Allow pausing this task
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="canSnooze"
                checked={formData.canSnooze}
                onChange={(e) => setFormData(prev => ({ ...prev, canSnooze: e.target.checked }))}
                className="mr-2"
              />
              <label htmlFor="canSnooze" className="text-sm text-gray-700">
                Allow snoozing this task
              </label>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={loading || !formData.title.trim()}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Task'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
