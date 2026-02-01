import { api } from "@/lib/api";
import { type Task, type TaskDetails, type CreateTaskDTO, type UpdateTaskDTO } from "@/types/task";

// Defina a URL base manualmente ou via env para garantir
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

  // --- Anexos (USANDO FETCH PARA RESOLVER ERRO 415/401) ---
  uploadAttachment: async (taskId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    // O fetch lida melhor com multipart/form-data que o axios configurado com JSON
    const response = await fetch(`${BASE_URL}/tasks/${taskId}/attachments`, {
      method: 'POST',
      body: formData,
      credentials: 'include', // IMPORTANTE: Envia os cookies de auth
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro upload:", errorText);
      throw new Error(`Falha no upload: ${response.status}`);
    }

    return response.json();
  },

  deleteAttachment: async (attachmentId: string) => {
    await api.delete(`/attachments/${attachmentId}`);
  },

  // --- NOVOS MÉTODOS: Assignees ---
  
  // Buscar lista de usuários para adicionar
  getAssignableUsers: async () => {
    const response = await api.get<{ 
      id: string; 
      firstName: string; 
      lastName: string | null; 
      email: string; 
      avatar: string | null 
    }[]>('/users/assignable');
    return response.data;
  },

  // Adicionar membro à tarefa
  addAssignee: async (taskId: string, userId: string) => {
    const response = await api.post(`/tasks/${taskId}/assignees`, { userId });
    return response.data;
  },

  // Remover membro da tarefa
  removeAssignee: async (taskId: string, userId: string) => {
    await api.delete(`/tasks/${taskId}/assignees/${userId}`);
  }
};