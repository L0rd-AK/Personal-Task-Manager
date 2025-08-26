export interface Project {
  _id: string;
  userId: string;
  name: string;
  description?: string;
  color: string;
  isArchived: boolean;
  taskCount: number;
  completedTaskCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectData {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
  color?: string;
  isArchived?: boolean;
}
