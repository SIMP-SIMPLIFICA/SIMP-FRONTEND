import { api } from "@/lib/api";
import { type Workspace } from "@/types/workspace"; 

export const workspaceService = {
  getAll: async () => {
    const response = await api.get<Workspace[]>("/workspaces");
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<Workspace>(`/workspaces/${id}`);
    return response.data;
  },

  create: async (data: { name: string; description?: string; departmentId?: string | null }) => {
    const response = await api.post<Workspace>("/workspaces", data);
    return response.data;
  },

  inviteMember: async (workspaceId: string, email: string) => {
    const response = await api.post(`/workspaces/${workspaceId}/members`, { email });
    return response.data;
  },

  removeMember: async (workspaceId: string, userId: string) => {
    await api.delete(`/workspaces/${workspaceId}/members/${userId}`);
  },

  deleteWorkspace: async (workspaceId: string) => {
    await api.delete(`/workspaces/${workspaceId}`);
  },

  getOrgWorkspace: async (): Promise<Workspace | null> => {
    try {
      const response = await api.get<Workspace>("/workspaces/org");
      return response.data;
    } catch {
      return null;
    }
  },

  searchOrgUsers: async (search: string) => {
    const response = await api.get<{
      data: { id: string; firstName: string; lastName: string | null; email: string; avatar: string | null }[];
    }>(`/api/v1/users?search=${encodeURIComponent(search)}&limit=10`);
    return response.data.data ?? [];
  },
};