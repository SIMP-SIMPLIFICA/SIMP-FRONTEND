export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface UserSummary {
  id: string;
  firstName: string | null;
  avatar: string | null;
}

export interface TaskAssignee {
  userId: string;
  user: UserSummary;
}

export interface ChecklistItem {
  id: string;
  title: string;
  isDone: boolean;
}

export interface TaskNote {
  id: string;
  content: string;
  createdAt: string;
  author: UserSummary;
}

export interface TaskHistory {
  id: string;
  action: string;
  createdAt: string;
  user: UserSummary | null; // Pode ser null se for sistema
}

export interface TaskAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
}

export interface Task {
  id: string;
  code: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  workspaceId: string;
  assignees: TaskAssignee[];
  creator?: UserSummary; // <--- ADICIONADO
  _count?: {
    checklist: number;
    notes: number;
    attachments: number;
  };
  createdAt: string;
  updatedAt: string; // <--- ADICIONADO
}

export interface TaskDetails extends Task {
  checklist: ChecklistItem[];
  notes: TaskNote[];
  history: TaskHistory[];         // <--- ADICIONADO
  attachments: TaskAttachment[];  // <--- ADICIONADO
}

export interface CreateTaskDTO {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  assigneeIds?: string[];
}

export interface UpdateTaskDTO extends Partial<CreateTaskDTO> {
  id: string;
}