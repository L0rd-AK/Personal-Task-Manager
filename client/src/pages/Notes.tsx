import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Note, CreateNoteData } from '../types/Note';
import { Task } from '../types/Task';
import { useTaskStore } from '../stores/taskStore';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const Notes: React.FC = () => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>('#ffffff');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { tasks } = useTaskStore();

  // Mock data for now - replace with actual API calls
  useEffect(() => {
    // Simulate loading notes
    setTimeout(() => {
      setNotes([
        {
          _id: '1',
          userId: 'user1',
          title: 'Project Ideas',
          content: '## Ideas for next project\n- Task manager app\n- Recipe finder\n- Fitness tracker',
          color: '#fef3c7',
          isPinned: true,
          tags: ['ideas', 'projects'],
          linkedTaskIds: [],
          attachments: [],
          checklist: [],
          isMarkdown: true,
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-15T10:00:00Z'
        },
        {
          _id: '2',
          userId: 'user1',
          title: 'Meeting Notes',
          content: 'Team standup:\n- Discussed new features\n- Planning sprint review\n- Next steps: implement analytics',
          color: '#dbeafe',
          isPinned: false,
          tags: ['meeting', 'work'],
          linkedTaskIds: [],
          attachments: [],
          checklist: [
            { id: '1', text: 'Schedule sprint review', completed: false },
            { id: '2', text: 'Prepare demo', completed: true }
          ],
          isMarkdown: false,
          createdAt: '2024-01-14T15:30:00Z',
          updatedAt: '2024-01-14T15:30:00Z'
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const handleCreateNote = async (noteData: CreateNoteData) => {
    try {
      const newNote: Note = {
        _id: Date.now().toString(),
        userId: 'user1',
        title: noteData.title,
        content: noteData.content || '',
        color: noteData.color || '#ffffff',
        isPinned: false,
        tags: noteData.tags || [],
        linkedTaskIds: noteData.linkedTaskIds || [],
        attachments: [],
        checklist: [],
        isMarkdown: noteData.isMarkdown || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setNotes(prev => [newNote, ...prev]);
      setShowCreateModal(false);
      toast.success('Note created successfully!');
    } catch (error) {
      toast.error('Failed to create note');
    }
  };

  const handleUpdateNote = async (noteId: string, updates: Partial<Note>) => {
    try {
      setNotes(prev => prev.map(note => 
        note._id === noteId 
          ? { ...note, ...updates, updatedAt: new Date().toISOString() }
          : note
      ));
      setEditingNote(null);
      toast.success('Note updated successfully!');
    } catch (error) {
      toast.error('Failed to update note');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      try {
        setNotes(prev => prev.filter(note => note._id !== noteId));
        toast.success('Note deleted successfully!');
      } catch (error) {
        toast.error('Failed to delete note');
      }
    }
  };

  const handleTogglePin = async (noteId: string) => {
    try {
      setNotes(prev => prev.map(note => 
        note._id === noteId 
          ? { ...note, isPinned: !note.isPinned, updatedAt: new Date().toISOString() }
          : note
      ));
    } catch (error) {
      toast.error('Failed to toggle pin');
    }
  };

  const handleToggleChecklistItem = async (noteId: string, itemId: string) => {
    try {
      setNotes(prev => prev.map(note => {
        if (note._id === noteId) {
          const updatedChecklist = note.checklist.map(item =>
            item.id === itemId ? { ...item, completed: !item.completed } : item
          );
          return { ...note, checklist: updatedChecklist, updatedAt: new Date().toISOString() };
        }
        return note;
      }));
    } catch (error) {
      toast.error('Failed to update checklist');
    }
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = !searchQuery || 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesSearch;
  });

  const pinnedNotes = filteredNotes.filter(note => note.isPinned);
  const unpinnedNotes = filteredNotes.filter(note => !note.isPinned);

  const colorOptions = [
    '#ffffff', '#fef3c7', '#fecaca', '#bbf7d0', '#dbeafe', '#f3e8ff', '#fed7aa'
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Notes</h1>
              <span className="text-sm text-gray-500">
                {notes.length} notes
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
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* View Mode Toggle */}
              <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    viewMode === 'grid' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    viewMode === 'list' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  List
                </button>
              </div>
              
              {/* Create Note Button */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Note
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Pinned Notes */}
        {pinnedNotes.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="h-5 w-5 mr-2 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
              </svg>
              Pinned Notes
            </h2>
            <div className={`grid gap-4 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                : 'grid-cols-1'
            }`}>
              {pinnedNotes.map(note => (
                <NoteCard
                  key={note._id}
                  note={note}
                  viewMode={viewMode}
                  onEdit={() => setEditingNote(note)}
                  onDelete={() => handleDeleteNote(note._id)}
                  onTogglePin={() => handleTogglePin(note._id)}
                  onToggleChecklistItem={(itemId) => handleToggleChecklistItem(note._id, itemId)}
                  onUpdate={(updates) => handleUpdateNote(note._id, updates)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Unpinned Notes */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">All Notes</h2>
          <div className={`grid gap-4 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
              : 'grid-cols-1'
          }`}>
            {unpinnedNotes.map(note => (
              <NoteCard
                key={note._id}
                note={note}
                viewMode={viewMode}
                onEdit={() => setEditingNote(note)}
                onDelete={() => handleDeleteNote(note._id)}
                onTogglePin={() => handleTogglePin(note._id)}
                onToggleChecklistItem={(itemId) => handleToggleChecklistItem(note._id, itemId)}
                onUpdate={(updates) => handleUpdateNote(note._id, updates)}
              />
            ))}
          </div>
          
          {unpinnedNotes.length === 0 && pinnedNotes.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="text-lg font-medium text-gray-900 mb-1">No notes yet</div>
              <div className="text-sm mb-4">Create your first note to get started</div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create your first note
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Create Note Modal */}
      {showCreateModal && (
        <CreateNoteModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateNote}
          colorOptions={colorOptions}
          selectedColor={selectedColor}
          onColorChange={setSelectedColor}
        />
      )}

      {/* Edit Note Modal */}
      {editingNote && (
        <EditNoteModal
          note={editingNote}
          onClose={() => setEditingNote(null)}
          onSuccess={(updates) => handleUpdateNote(editingNote._id, updates)}
          colorOptions={colorOptions}
          tasks={tasks}
        />
      )}
    </div>
  );
};

// Note Card Component
interface NoteCardProps {
  note: Note;
  viewMode: 'grid' | 'list';
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onToggleChecklistItem: (itemId: string) => void;
  onUpdate: (updates: Partial<Note>) => void;
}

const NoteCard: React.FC<NoteCardProps> = ({
  note,
  viewMode,
  onEdit,
  onDelete,
  onTogglePin,
  onToggleChecklistItem,
  onUpdate
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 ${
        viewMode === 'list' ? 'flex' : 'block'
      }`}
      style={{ backgroundColor: note.color }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`p-4 ${viewMode === 'list' ? 'flex-1' : ''}`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-medium text-gray-900 line-clamp-2">{note.title}</h3>
          <div className="flex items-center space-x-1">
            {note.isPinned && (
              <svg className="h-4 w-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
              </svg>
            )}
            {isHovered && (
              <div className="flex items-center space-x-1">
                <button
                  onClick={onTogglePin}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title={note.isPinned ? 'Unpin note' : 'Pin note'}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </button>
                <button
                  onClick={onEdit}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="Edit note"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={onDelete}
                  className="p-1 text-gray-400 hover:text-red-600"
                  title="Delete note"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="text-sm text-gray-600 mb-3">
          {note.isMarkdown ? (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {note.content}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="whitespace-pre-wrap line-clamp-4">{note.content}</div>
          )}
        </div>

        {/* Checklist */}
        {note.checklist.length > 0 && (
          <div className="mb-3">
            {note.checklist.slice(0, 3).map(item => (
              <div key={item.id} className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => onToggleChecklistItem(item.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className={item.completed ? 'line-through text-gray-400' : 'text-gray-600'}>
                  {item.text}
                </span>
              </div>
            ))}
            {note.checklist.length > 3 && (
              <div className="text-xs text-gray-400 mt-1">
                +{note.checklist.length - 3} more items
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {note.tags.map(tag => (
              <span
                key={tag}
                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
          {note.linkedTaskIds.length > 0 && (
            <span className="flex items-center">
              <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {note.linkedTaskIds.length} task{note.linkedTaskIds.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Create Note Modal Component
interface CreateNoteModalProps {
  onClose: () => void;
  onSuccess: (noteData: CreateNoteData) => void;
  colorOptions: string[];
  selectedColor: string;
  onColorChange: (color: string) => void;
}

const CreateNoteModal: React.FC<CreateNoteModalProps> = ({
  onClose,
  onSuccess,
  colorOptions,
  selectedColor,
  onColorChange
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isMarkdown, setIsMarkdown] = useState(false);
  const [newTag, setNewTag] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSuccess({
      title: title.trim(),
      content: content.trim(),
      color: selectedColor,
      tags,
      isMarkdown
    });

    // Reset form
    setTitle('');
    setContent('');
    setTags([]);
    setIsMarkdown(false);
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Create New Note</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Color Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
              <div className="flex space-x-2">
                {colorOptions.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => onColorChange(color)}
                    className={`w-8 h-8 rounded-full border-2 ${
                      selectedColor === color ? 'border-gray-400' : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Note title..."
                required
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Write your note content..."
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full flex items-center"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add tag..."
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-3 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Markdown Toggle */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="markdown"
                checked={isMarkdown}
                onChange={(e) => setIsMarkdown(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="markdown" className="ml-2 text-sm text-gray-700">
                Enable Markdown formatting
              </label>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Note
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Edit Note Modal Component
interface EditNoteModalProps {
  note: Note;
  onClose: () => void;
  onSuccess: (updates: Partial<Note>) => void;
  colorOptions: string[];
  tasks: Task[];
}

const EditNoteModal: React.FC<EditNoteModalProps> = ({
  note,
  onClose,
  onSuccess,
  colorOptions,
  tasks
}) => {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [color, setColor] = useState(note.color);
  const [tags, setTags] = useState(note.tags);
  const [linkedTaskIds, setLinkedTaskIds] = useState(note.linkedTaskIds);
  const [isMarkdown, setIsMarkdown] = useState(note.isMarkdown);
  const [newTag, setNewTag] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSuccess({
      title: title.trim(),
      content: content.trim(),
      color,
      tags,
      linkedTaskIds,
      isMarkdown
    });
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Edit Note</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Color Picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                  <div className="flex space-x-2">
                    {colorOptions.map(colorOption => (
                      <button
                        key={colorOption}
                        type="button"
                        onClick={() => setColor(colorOption)}
                        className={`w-8 h-8 rounded-full border-2 ${
                          color === colorOption ? 'border-gray-400' : 'border-gray-200'
                        }`}
                        style={{ backgroundColor: colorOption }}
                      />
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full flex items-center"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Add tag..."
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="px-3 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Linked Tasks */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Linked Tasks</label>
                  <select
                    multiple
                    value={linkedTaskIds}
                    onChange={(e) => {
                      const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                      setLinkedTaskIds(selectedOptions);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {tasks.map(task => (
                      <option key={task._id} value={task._id}>
                        {task.title} ({task.status})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Markdown Toggle */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="edit-markdown"
                    checked={isMarkdown}
                    onChange={(e) => setIsMarkdown(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="edit-markdown" className="ml-2 text-sm text-gray-700">
                    Enable Markdown formatting
                  </label>
                </div>

                {/* Preview */}
                {isMarkdown && content && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
                    <div className="p-3 border border-gray-300 rounded-lg bg-gray-50 max-h-40 overflow-y-auto">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {content}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Notes;
