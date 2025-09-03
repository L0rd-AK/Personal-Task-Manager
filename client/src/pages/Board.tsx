import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { useTaskStore } from '../stores/taskStore';
import { useSocketStore } from '../stores/socketStore';
import { TaskCard } from '../components/TaskCard';
import { TaskCreateModal } from '../components/TaskCreateModal';
import { FocusMode } from '../components/FocusMode';
import { SyncIndicator } from '../components/SyncIndicator';
import { CommandPalette } from '../components/CommandPalette';
import { Task } from '../types/Task';
import toast from 'react-hot-toast';

const Board: React.FC = () => {
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);
  
  // Zustand stores
  const { 
    tasks,
    loading,
    error,
    fetchTasks,
    createTask,
    deleteTask,
    completeTask,
    giveUpTask,
    reopenTask,
    setSearchQuery,
    searchQuery,
    statusFilter,
    setStatusFilter,
    clearError
  } = useTaskStore();
  
  const { connect, disconnect } = useSocketStore();
  
  // Local state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [activeTab, setActiveTab] = useState<'ongoing' | 'completed' | 'given_up'>('ongoing');

  // Fetch tasks on component mount
  useEffect(() => {
    console.log('Board: Auth state changed:', authContext?.isAuthenticated);
    if (authContext?.isAuthenticated) {
      console.log('Board: User is authenticated, fetching tasks...');
      fetchTasks();
    } else {
      console.log('Board: User is not authenticated');
    }
  }, [authContext?.isAuthenticated, fetchTasks]);

  // Show error toast when there's an error
  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  // Connect to socket on mount
  useEffect(() => {
    if (authContext?.isAuthenticated) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [authContext?.isAuthenticated, connect, disconnect]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      
      // N for new task
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && e.target === document.body) {
        e.preventDefault();
        setShowCreateModal(true);
      }
      
      // Tab navigation with number keys (1, 2, 3)
      if (e.key === '1' && !e.metaKey && !e.ctrlKey && e.target === document.body) {
        e.preventDefault();
        setActiveTab('ongoing');
      }
      if (e.key === '2' && !e.metaKey && !e.ctrlKey && e.target === document.body) {
        e.preventDefault();
        setActiveTab('completed');
      }
      if (e.key === '3' && !e.metaKey && !e.ctrlKey && e.target === document.body) {
        e.preventDefault();
        setActiveTab('given_up');
      }
      
      // Escape to close modals
      if (e.key === 'Escape') {
        setShowCreateModal(false);
        setShowCommandPalette(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Use tasks from the store with fallback
  const displayTasks = tasks || [];

  const handleCreateTask = async (taskData: any) => {
    try {
      await createTask(taskData);
      toast.success('Task created successfully!');
    } catch (error) {
      toast.error('Failed to create task');
      console.error('Create task error:', error);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await completeTask(taskId);
      toast.success('Task completed! 🎉');
    } catch (error) {
      toast.error('Failed to complete task');
      console.error('Complete task error:', error);
    }
  };

  const handleGiveUpTask = async (taskId: string, reason?: string) => {
    try {
      await giveUpTask(taskId, reason);
      toast(`Task given up${reason ? `: ${reason}` : ''}`, { icon: '😔' });
    } catch (error) {
      toast.error('Failed to give up task');
      console.error('Give up task error:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(taskId);
        toast.success('Task deleted');
      } catch (error) {
        toast.error('Failed to delete task');
        console.error('Delete task error:', error);
      }
    }
  };

  const handleReopenTask = async (taskId: string) => {
    try {
      await reopenTask(taskId);
      toast.success('Task reopened as a new task');
    } catch (error) {
      toast.error('Failed to reopen task');
      console.error('Reopen task error:', error);
    }
  };

  const handleTaskTimeUp = (task: Task) => {
    toast(`⏰ Time's up for "${task.title}"!`, {
      duration: 5000,
    });
    
    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      new Notification(`Time's up!`, {
        body: `Task "${task.title}" has reached its deadline`,
        icon: '/favicon.ico'
      });
    }
  };

  const handleCommandAction = (action: string, data?: any) => {
    switch (action) {
      case 'create-task':
        setShowCreateModal(true);
        break;
      case 'complete-task':
        if (data?.taskId) {
          handleCompleteTask(data.taskId);
        }
        break;
      case 'view-analytics':
        navigate('/analytics');
        break;
      case 'view-notes':
        navigate('/notes');
        break;
      default:
        toast(`Action: ${action}`, { icon: '⚡' });
    }
  };

  // Filter tasks
  const filteredTasks = displayTasks.filter(task => {
    const matchesSearch = !searchQuery || 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || task?.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const tasksByStatus = {
    ongoing: filteredTasks.filter(task => task?.status === 'ongoing'),
    completed: filteredTasks.filter(task => task?.status === 'completed'),
    given_up: filteredTasks.filter(task => task?.status === 'given_up')
  };

  const priorityColors = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Task Manager</h1>
              <SyncIndicator />
              <span className="text-sm text-gray-500">
                Welcome, {authContext?.user?.name}
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                title="Filter tasks by status"
              >
                <option value="all">All Status</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="given_up">Given Up</option>
              </select>
              
              {/* Command Palette Button */}
              <button
                onClick={() => setShowCommandPalette(true)}
                className="px-3 py-2 text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg"
                title="Open command palette (Ctrl+K)"
              >
                ⌘K
              </button>
              
              {/* Keyboard shortcuts indicator */}
              <div className="hidden lg:flex items-center space-x-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                <span>Press</span>
                <kbd className="bg-white px-1 rounded border">1</kbd>
                <kbd className="bg-white px-1 rounded border">2</kbd>
                <kbd className="bg-white px-1 rounded border">3</kbd>
                <span>for tabs</span>
              </div>
              
              {/* Create Task Button */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                + New Task
              </button>
              
              <button
                onClick={authContext?.logout}
                className="text-gray-500 hover:text-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading tasks...</span>
          </div>
        )}

        {!loading && (
          <>
            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('ongoing')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'ongoing'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Ongoing ({tasksByStatus.ongoing.length})
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'completed'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Completed ({tasksByStatus.completed.length})
              </button>
              <button
                onClick={() => setActiveTab('given_up')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'given_up'
                    ? 'border-gray-500 text-gray-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Given Up ({tasksByStatus.given_up.length})
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Ongoing Tasks Tab */}
            {activeTab === 'ongoing' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Ongoing Tasks
                  </h2>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    + Add Task
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tasksByStatus.ongoing.map(task => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      onComplete={() => handleCompleteTask(task._id)}
                      onGiveUp={(reason) => handleGiveUpTask(task._id, reason)}
                      onDelete={() => handleDeleteTask(task._id)}
                      onEdit={() => toast('Edit task coming soon!', { icon: '✏️' })}
                      onTimeUp={() => handleTaskTimeUp(task)}
                    />
                  ))}
                </div>
                {tasksByStatus.ongoing.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <div className="text-lg font-medium text-gray-900 mb-1">No ongoing tasks</div>
                    <div className="text-sm mb-4">Get started by creating your first task</div>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Create your first task
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Completed Tasks Tab */}
            {activeTab === 'completed' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Completed Tasks
                  </h2>
                  <div className="text-sm text-gray-500">
                    🎉 Great job! You've completed {tasksByStatus.completed.length} tasks
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tasksByStatus.completed.map(task => (
                    <div key={task._id} className="border border-green-200 bg-green-50 rounded-lg p-4 transition-all hover:shadow-md">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-gray-900 line-through decoration-green-500">{task.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>
                          {task.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3 line-through decoration-green-400">{task.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1 text-green-600">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs font-medium">Completed</span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleReopenTask(task._id)}
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                          >
                            Reopen
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task._id)}
                            className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {tasksByStatus.completed.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-lg font-medium text-gray-900 mb-1">No completed tasks yet</div>
                    <div className="text-sm">Complete some ongoing tasks to see them here</div>
                  </div>
                )}
              </div>
            )}

            {/* Given Up Tasks Tab */}
            {activeTab === 'given_up' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Given Up Tasks
                  </h2>
                  <div className="text-sm text-gray-500">
                    Sometimes it's okay to let go and try again later
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tasksByStatus.given_up.map(task => (
                    <div key={task._id} className="border border-gray-200 bg-gray-50 rounded-lg p-4 transition-all hover:shadow-md">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-gray-500">{task.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium opacity-75 ${priorityColors[task.priority]}`}>
                          {task.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mb-3">{task.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1 text-gray-500">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span className="text-xs font-medium">Given Up</span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleReopenTask(task._id)}
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                          >
                            Restart
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task._id)}
                            className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {tasksByStatus.given_up.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-lg font-medium text-gray-900 mb-1">No given up tasks</div>
                    <div className="text-sm">Keep pushing forward! You've got this 💪</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        </>
        )}
      </main>

      {/* Modals and Components */}
      {showCreateModal && (
        <TaskCreateModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={(task) => {
            handleCreateTask(task);
            setShowCreateModal(false);
          }}
        />
      )}

      {showCommandPalette && (
        <CommandPalette
          onClose={() => setShowCommandPalette(false)}
          onAction={handleCommandAction}
        />
      )}

      {/* Focus Mode - always rendered for floating widget */}
      <FocusMode />
    </div>
  );
};

export default Board;