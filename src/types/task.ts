export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'EXPIRED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

// Fonte única de tradução — evita valores brutos de Enum (ex: "IN_PROGRESS", "URGENT")
// vazando para a interface. badgeClassName é para chips/Select (fundo claro); dotClassName
// é para o indicador de coluna do Kanban (fundo sólido).
export const TASK_STATUS_LABELS: Record<TaskStatus, { label: string; badgeClassName: string; dotClassName: string }> = {
  TODO:        { label: 'A Fazer',      badgeClassName: 'bg-slate-100 text-slate-700', dotClassName: 'bg-slate-400' },
  IN_PROGRESS: { label: 'Em Progresso', badgeClassName: 'bg-blue-100 text-blue-700',   dotClassName: 'bg-blue-500' },
  IN_REVIEW:   { label: 'Revisão',      badgeClassName: 'bg-amber-100 text-amber-700', dotClassName: 'bg-amber-500' },
  DONE:        { label: 'Concluído',    badgeClassName: 'bg-green-100 text-green-700', dotClassName: 'bg-green-500' },
  EXPIRED:     { label: 'Expirado',     badgeClassName: 'bg-red-100 text-red-600',     dotClassName: 'bg-red-400' },
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, { label: string; className: string }> = {
  LOW:    { label: 'Baixa',   className: 'bg-gray-100 text-gray-800' },
  MEDIUM: { label: 'Média',   className: 'bg-blue-100 text-blue-800' },
  HIGH:   { label: 'Alta',    className: 'bg-orange-100 text-orange-800' },
  URGENT: { label: 'Urgente', className: 'bg-red-100 text-red-800' },
};

// ATUALIZADO: Adicionados lastName e email para corresponder ao controller e ao componente
export interface UserSummary {
  id: string;
  firstName: string | null;
  lastName: string | null; // <--- ADICIONADO
  email: string;           // <--- ADICIONADO
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
  user: UserSummary | null;
}

export interface TaskAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  signedUrl?: string;
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
  creator?: UserSummary;
  _count?: {
    checklist: number;
    notes: number;
    attachments: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TaskDetails extends Task {
  checklist: ChecklistItem[];
  notes: TaskNote[];
  history: TaskHistory[];
  attachments: TaskAttachment[];
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