export interface WorkspaceMember {
  id: string;
  userId: string;
  workspaceId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  joinedAt: string;
  user: {
    id: string;
    firstName: string | null;
    lastName?: string | null;
    email: string;
    avatar: string | null;
  };
}

export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  createdAt: string;
  updatedAt: string;
  members?: WorkspaceMember[]; 
  _count?: {
    tasks: number;
    members: number;
  };
}

// CORREÇÃO: Adicionada a interface que faltava
export interface CreateWorkspaceDTO {
  name: string;
  description?: string;
}