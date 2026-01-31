import { api } from "@/lib/api";
import { type Task, type TaskDetails, type CreateTaskDTO, type UpdateTaskDTO } from "@/types/task";

// Ajuste a URL se necessário (ex: variavel de ambiente ou hardcoded)
const BASE_URL = "http://localhost:3000"; 

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

  // --- Anexos (CORREÇÃO DEFINITIVA COM FETCH) ---
  uploadAttachment: async (taskId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    // Usamos fetch nativo. Ele lida perfeitamente com multipart/form-data.
    // 'credentials: include' garante que o cookie de sessão seja enviado.
    const response = await fetch(`${BASE_URL}/tasks/${taskId}/attachments`, {
      method: 'POST',
      body: formData,
      credentials: 'include', 
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro no upload (${response.status}): ${errorText}`);
    }

    return response.json();
  },

  deleteAttachment: async (attachmentId: string) => {
    await api.delete(`/attachments/${attachmentId}`);
  }
};