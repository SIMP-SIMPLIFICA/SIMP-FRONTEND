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
  inviteMember: async (workspaceId: string, email: string) => {
    const response = await api.post(`/workspaces/${workspaceId}/members`, { email });
    return response.data;
  },

  deleteWorkspace: async (workspaceId: string) => {
    await api.delete(`/workspaces/${workspaceId}`);
  }
};