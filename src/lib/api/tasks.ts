import { api } from "@/lib/api";
import { type Task, type TaskDetails, type CreateTaskDTO, type UpdateTaskDTO } from "@/types/task";

export const taskService = {
  getByWorkspace: async (workspaceId: string) => {
    const response = await api.get<Task[]>(`/workspaces/${workspaceId}/tasks`);
    return response.data;
  },

  create: async (workspaceId: string, data: CreateTaskDTO) => {
    const response = await api.post<Task>(`/workspaces/${workspaceId}/tasks`, data);
    return response.data;
  },

  update: async (id: string, data: UpdateTaskDTO) => {
    const response = await api.put<Task>(`/tasks/${id}`, data);
    return response.data;
  },

  getDetails: async (id: string) => {
    const response = await api.get<TaskDetails>(`/tasks/${id}`);
    return response.data;
  },

  // --- Checklist ---
  addChecklistItem: async (taskId: string, title: string) => {
    const response = await api.post(`/tasks/${taskId}/checklist`, { title });
    return response.data;
  },

  updateChecklistItem: async (itemId: string, isDone: boolean) => {
    const response = await api.put(`/checklist/${itemId}`, { isDone });
    return response.data;
  },

  // --- Notas ---
  addNote: async (taskId: string, content: string) => {
    const response = await api.post(`/tasks/${taskId}/notes`, { content });
    return response.data;
  },

  // --- Status e Delete ---
  delete: async (id: string) => {
    await api.delete(`/tasks/${id}`);
  },

  // --- Anexos ---
  uploadAttachment: async (taskId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<{
        id: string;
        fileName: string;
        fileUrl: string;
    }>(`/tasks/${taskId}/attachments`, formData);

    return response.data;
  },

  deleteAttachment: async (attachmentId: string) => {
    await api.delete(`/attachments/${attachmentId}`);
  },

  // --- ASSIGNEES (MEMBROS) ---
  getAssignableUsers: async (workspaceId: string) => {
    const response = await api.get<{
      id: string;
      firstName: string;
      lastName: string | null;
      email: string;
      avatar: string | null
    }[]>(`/workspaces/${workspaceId}/assignable-users`);
    return response.data;
  },

  addAssignee: async (taskId: string, userId: string) => {
    const response = await api.post(`/tasks/${taskId}/assignees`, { userId });
    return response.data;
  },

  removeAssignee: async (taskId: string, userId: string) => {
    await api.delete(`/tasks/${taskId}/assignees/${userId}`);
  }
};
