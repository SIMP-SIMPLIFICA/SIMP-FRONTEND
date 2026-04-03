import { api } from '../api'
import type { VirtualProcess, VirtualProcessListResponse, CreateVirtualProcessPayload } from '@/types/virtual-process'

export interface VirtualProcessCategory {
  id: string
  workspaceId: string
  name: string
  createdAt: string
}

export interface VirtualProcessSource {
  id: string
  workspaceId: string
  name: string
  createdAt: string
}

export interface VirtualProcessCompany {
  id: string
  workspaceId: string
  name: string
  cnpj?: string | null
  createdAt: string
}

export const virtualProcessService = {
  list: async (workspaceId: string, params?: {
    page?: number; limit?: number; search?: string; status?: string;
    secretaria?: string; category?: string; startDate?: string; endDate?: string
  }) => {
    const q = new URLSearchParams()
    if (params?.page) q.append('page', String(params.page))
    if (params?.limit) q.append('limit', String(params.limit))
    if (params?.search) q.append('search', params.search)
    if (params?.status && params.status !== 'ALL') q.append('status', params.status)
    if (params?.secretaria) q.append('secretaria', params.secretaria)
    if (params?.category && params.category !== 'ALL') q.append('category', params.category)
    if (params?.startDate) q.append('startDate', params.startDate)
    if (params?.endDate) q.append('endDate', params.endDate)
    const qs = q.toString() ? `?${q.toString()}` : ''
    const res = await api.get<VirtualProcessListResponse>(`/virtual-processes/workspaces/${workspaceId}${qs}`)
    return res.data
  },

  getDetail: async (id: string) => {
    const res = await api.get<{ process: VirtualProcess; auditLog: unknown[] }>(`/virtual-processes/${id}`)
    return res.data
  },

  create: async (workspaceId: string, data: Omit<CreateVirtualProcessPayload, 'workspaceId'>) => {
    const res = await api.post<VirtualProcess>(`/virtual-processes/workspaces/${workspaceId}`, { ...data, workspaceId })
    return res.data
  },

  updateStatus: async (id: string, status: string) => {
    const res = await api.patch<VirtualProcess>(`/virtual-processes/${id}/status`, { status })
    return res.data
  },

  updateCompany: async (id: string, data: { companyName?: string; companyCnpj?: string }) => {
    const res = await api.patch<VirtualProcess>(`/virtual-processes/${id}/company`, data)
    return res.data
  },

  delete: async (id: string) => {
    await api.delete(`/virtual-processes/${id}`)
  },

  uploadDocument: async (id: string, file: File, tag: string, description?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('tag', tag)
    if (description) formData.append('description', description)
    const res = await api.post<unknown>(`/virtual-processes/${id}/documents`, formData)
    return res.data
  },

  getDownloadUrl: async (id: string, documentId: string) => {
    const res = await api.get<{ url: string }>(`/virtual-processes/${id}/documents/${documentId}/download`)
    return res.data
  },

  deleteDocument: async (id: string, documentId: string) => {
    await api.delete(`/virtual-processes/${id}/documents/${documentId}`)
  },

  // Categories
  listCategories: async (workspaceId: string) => {
    const res = await api.get<VirtualProcessCategory[]>(`/virtual-processes/workspaces/${workspaceId}/categories`)
    return res.data
  },

  createCategory: async (workspaceId: string, data: { name: string }) => {
    const res = await api.post<VirtualProcessCategory>(`/virtual-processes/workspaces/${workspaceId}/categories`, { ...data, workspaceId })
    return res.data
  },

  updateCategory: async (id: string, data: { name: string }) => {
    const res = await api.put<VirtualProcessCategory>(`/virtual-processes/categories/${id}`, data)
    return res.data
  },

  deleteCategory: async (id: string) => {
    await api.delete(`/virtual-processes/categories/${id}`)
  },

  // Sources (Origens do Recurso)
  listSources: async (workspaceId: string) => {
    const res = await api.get<VirtualProcessSource[]>(`/virtual-processes/workspaces/${workspaceId}/sources`)
    return res.data
  },
  createSource: async (workspaceId: string, data: { name: string }) => {
    const res = await api.post<VirtualProcessSource>(`/virtual-processes/workspaces/${workspaceId}/sources`, { ...data, workspaceId })
    return res.data
  },
  updateSource: async (id: string, data: { name: string }) => {
    const res = await api.put<VirtualProcessSource>(`/virtual-processes/sources/${id}`, data)
    return res.data
  },
  deleteSource: async (id: string) => {
    await api.delete(`/virtual-processes/sources/${id}`)
  },

  // Companies lookup (Empresas Contratadas)
  listCompanyItems: async (workspaceId: string) => {
    const res = await api.get<VirtualProcessCompany[]>(`/virtual-processes/workspaces/${workspaceId}/companies`)
    return res.data
  },
  createCompanyItem: async (workspaceId: string, data: { name: string; cnpj?: string | null }) => {
    const res = await api.post<VirtualProcessCompany>(`/virtual-processes/workspaces/${workspaceId}/companies`, { ...data, workspaceId })
    return res.data
  },
  updateCompanyItem: async (id: string, data: { name: string; cnpj?: string | null }) => {
    const res = await api.put<VirtualProcessCompany>(`/virtual-processes/companies/${id}`, data)
    return res.data
  },
  deleteCompanyItem: async (id: string) => {
    await api.delete(`/virtual-processes/companies/${id}`)
  },
}
