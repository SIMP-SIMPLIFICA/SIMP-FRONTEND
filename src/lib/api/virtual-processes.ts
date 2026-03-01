import { api } from '../api';

export type VirtualProcess = {
  id: string;
  processNumber: string;
  secretaria: string;
  source: string;
  sourceDetail?: string;
  bankAccount?: string;
  agency?: string;
  bankName?: string;
  subject: string;
  status: string;
  category: string;
  documentCount?: number;
  _count?: { documents: number };
  documents?: any[];
  createdAt: string;
  updatedAt: string;
};

export type VirtualProcessDocument = {
  id: string;
  tag: string;
  description?: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadedAt: string;
  uploader: { firstName: string; lastName: string; jobTitle: string };
};

export type AuditLog = {
  id: string;
  action: string;
  createdAt: string;
  metadata: any;
  user: { firstName: string; lastName: string };
};

export const virtualProcessApi = {
  list: async (filters?: { search?: string; secretaria?: string }) => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.secretaria) params.append('secretaria', filters.secretaria);
    const queryString = params.toString();
    const { data } = await api.get<any>(`/virtual-processes${queryString ? `?${queryString}` : ''}`);
    return Array.isArray(data) ? data : (data.processes || data.data || []);
  },

  getDetails: async (id: string) => {
    const res = await api.get<any>(`/virtual-processes/${id}`);
    const data = res.data;
    return {
      process: data.process || data.data?.process || data,
      auditLog: data.auditLog || data.data?.auditLog || []
    };
  },

  create: async (payload: Partial<VirtualProcess>) => {
    const { data } = await api.post('/virtual-processes', payload);
    return data;
  },

  toggleStatus: async (id: string) => {
    const { data } = await api.patch(`/virtual-processes/${id}/status`, {});
    return data;
  },

  delete: async (id: string) => {
    await api.delete(`/virtual-processes/${id}`);
  },

  uploadDocument: async (id: string, file: File, tag: string, description?: string) => {
    const formData = new FormData();
    // Use the native File type without wrapping if possible, it will be mapped right below
    formData.append('file', file);
    formData.append('tag', tag);
    if (description) formData.append('description', description);

    const { data } = await api.post(`/virtual-processes/${id}/documents`, formData);
    return data;
  },

  getDownloadUrl: async (id: string, documentId: string) => {
    const { data } = await api.get<{ url: string }>(`/virtual-processes/${id}/documents/${documentId}/download`);
    return data.url;
  }
};