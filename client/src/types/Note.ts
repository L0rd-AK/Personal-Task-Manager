export type NoteColor = 'default' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink';

export interface NoteAttachment {
  url: string;
  filename: string;
  size: number;
  contentType: string;
  uploadedAt: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

export interface Note {
  _id: string;
  userId: string;
  title: string;
  content: string;
  color: NoteColor;
  isPinned: boolean;
  tags: string[];
  linkedTaskIds: string[];
  attachments: NoteAttachment[];
  checklist: ChecklistItem[];
  isMarkdown: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteData {
  title: string;
  content?: string;
  color?: NoteColor;
  tags?: string[];
  linkedTaskIds?: string[];
  isMarkdown?: boolean;
}

export interface UpdateNoteData {
  title?: string;
  content?: string;
  color?: NoteColor;
  isPinned?: boolean;
  tags?: string[];
  linkedTaskIds?: string[];
  isMarkdown?: boolean;
}
