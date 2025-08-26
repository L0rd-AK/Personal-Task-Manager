import React, { useState, useEffect } from 'react';
import { useFocusStore } from '../stores/focusStore';
import { useTaskStore } from '../stores/taskStore';

interface CommandPaletteProps {
  onClose: () => void;
  onAction: (action: string, data?: any) => void;
}

interface Command {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  icon: string;
  action: string;
  data?: any;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  onClose,
  onAction
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { tasks } = useTaskStore();
  const { startFocus } = useFocusStore();

  const commands: Command[] = [
    // Task commands
    {
      id: 'create-task',
      title: 'Create New Task',
      description: 'Add a new task to your board',
      keywords: ['create', 'new', 'task', 'add'],
      icon: '➕',
      action: 'create-task'
    },
    
    // Focus commands
    {
      id: 'focus-pomodoro',
      title: 'Start Pomodoro Session',
      description: '25-minute focused work session',
      keywords: ['pomodoro', 'focus', 'timer', '25'],
      icon: '🍅',
      action: 'focus-pomodoro'
    },
    {
      id: 'focus-deep-work',
      title: 'Start Deep Work Session',
      description: '2-hour deep focus session',
      keywords: ['deep', 'work', 'focus', '2h', 'hours'],
      icon: '🧠',
      action: 'focus-deep-work'
    },
    {
      id: 'focus-forced',
      title: 'Start Forced Focus',
      description: 'Locked focus mode with emergency exit',
      keywords: ['forced', 'focus', 'locked', 'block'],
      icon: '🔒',
      action: 'focus-forced'
    },
    
    // Navigation commands
    {
      id: 'view-analytics',
      title: 'View Analytics',
      description: 'See your productivity statistics',
      keywords: ['analytics', 'stats', 'statistics', 'productivity'],
      icon: '📊',
      action: 'view-analytics'
    },
    {
      id: 'view-notes',
      title: 'View Notes',
      description: 'Access your notes and documentation',
      keywords: ['notes', 'documentation', 'write'],
      icon: '📝',
      action: 'view-notes'
    },
    
    // Quick actions for existing tasks
    ...tasks.filter(task => task.status === 'ongoing').slice(0, 5).map(task => ({
      id: `complete-${task._id}`,
      title: `Complete: ${task.title}`,
      description: 'Mark this task as completed',
      keywords: ['complete', 'done', 'finish', task.title.toLowerCase()],
      icon: '✅',
      action: 'complete-task',
      data: { taskId: task._id }
    }))
  ];

  const filteredCommands = commands.filter(command => {
    if (!query.trim()) return true;
    
    const searchTerms = query.toLowerCase().split(' ');
    return searchTerms.every(term =>
      command.title.toLowerCase().includes(term) ||
      command.description.toLowerCase().includes(term) ||
      command.keywords.some(keyword => keyword.includes(term))
    );
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            handleCommand(filteredCommands[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, filteredCommands, onClose]);

  const handleCommand = (command: Command) => {
    switch (command.action) {
      case 'focus-pomodoro':
        startFocus('pomodoro', 25 * 60);
        break;
      case 'focus-deep-work':
        startFocus('deep-work', 2 * 60 * 60);
        break;
      case 'focus-forced':
        startFocus('forced-focus', 60 * 60);
        break;
      default:
        onAction(command.action, command.data);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
        {/* Search Input */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 text-lg border-none outline-none"
              placeholder="Type a command or search..."
              autoFocus
            />
          </div>
        </div>

        {/* Command List */}
        <div className="max-h-96 overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-2">🔍</div>
              <p>No commands found</p>
            </div>
          ) : (
            <div className="py-2">
              {filteredCommands.map((command, index) => (
                <button
                  key={command.id}
                  onClick={() => handleCommand(command)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3 ${
                    index === selectedIndex ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                  }`}
                >
                  <span className="text-2xl">{command.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{command.title}</div>
                    <div className="text-sm text-gray-500">{command.description}</div>
                  </div>
                  {index === selectedIndex && (
                    <div className="text-xs text-gray-400">↵</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 rounded-b-lg">
          <div className="flex items-center justify-between">
            <div className="flex space-x-4">
              <span>↑↓ to navigate</span>
              <span>↵ to select</span>
              <span>esc to close</span>
            </div>
            <div>
              {filteredCommands.length} commands
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
