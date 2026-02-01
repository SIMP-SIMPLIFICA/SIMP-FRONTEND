import { api } from "@/lib/api";
import { type Task, type TaskDetails, type CreateTaskDTO, type UpdateTaskDTO } from "@/types/task";
import { getAccessToken } from "@/lib/auth"; 

// Definição do tipo para usuário atribuível (resolve o erro de 'any' no user)
export interface AssignableUser {
  id: string;
  firstName: string;
  lastName?: string;
  email: string;
  avatar?: string;
}

// Verifique se o seu backend roda na porta 3000 ou outra
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
    const response = await api.put(`/tasks/checklist/${itemId}`, { isDone });
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
    
    const token = getAccessToken();
    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}/tasks/${taskId}/attachments`, {
      method: 'POST',
      body: formData,
      headers: headers,
      credentials: 'include', 
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro no upload (${response.status}): ${errorText}`);
    }

    return response.json();
  },

  deleteAttachment: async (attachmentId: string) => {
    await api.delete(`/tasks/attachments/${attachmentId}`);
  },

  // --- MÉTODOS QUE FALTAVAM (Gerenciamento de Responsáveis) ---
  
  // Busca usuários do workspace que podem receber tarefas
  getAssignableUsers: async (workspaceId: string) => {
    const response = await api.get<AssignableUser[]>(`/workspaces/${workspaceId}/assignable-users`);
    return response.data;
  },

  // Adiciona um responsável à tarefa
  addAssignee: async (taskId: string, userId: string) => {
    const response = await api.post(`/tasks/${taskId}/assignees`, { userId });
    return response.data;
  },

  // Remove um responsável da tarefa
  removeAssignee: async (taskId: string, userId: string) => {
    await api.delete(`/tasks/${taskId}/assignees/${userId}`);
  }
};