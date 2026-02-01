import { api } from "@/lib/api";
import { type CreateWorkspaceDTO, type Workspace } from "@/types/workspace";

export const workspaceService = {
  getAll: async () => {
    const response = await api.get<Workspace[]>("/workspaces");
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<Workspace>(`/workspaces/${id}`);
    return response.data;
  },

  create: async (data: CreateWorkspaceDTO) => {
    const response = await api.post<Workspace>("/workspaces", data);
    return response.data;
  },

  addMember: async (workspaceId: string, email: string, role: 'ADMIN' | 'MEMBER' | 'VIEWER' = 'MEMBER') => {
    const response = await api.post(`/workspaces/${workspaceId}/members`, { email, role });
    return response.data;
  },

  removeMember: async (workspaceId: string, userId: string) => {
    await api.delete(`/workspaces/${workspaceId}/members/${userId}`);
  },

  // --- NOVO MÉTODO DE EXCLUSÃO ---
  delete: async (id: string) => {
    await api.delete(`/workspaces/${id}`);
  }
};