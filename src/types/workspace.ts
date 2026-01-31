// src/types/workspace.ts

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface WorkspaceMember {
  id: string;
  userId: string;
  role: WorkspaceRole;
  user?: {
    firstName: string;
    avatar: string | null;
  };
}

export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  createdAt: string;
  members: WorkspaceMember[];
  _count?: {
    tasks: number;
    members: number;
  };
}

export interface CreateWorkspaceDTO {
  name: string;
  description?: string;
}