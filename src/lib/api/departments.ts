import { api } from '../api'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DepartmentMember {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
  avatar: string | null
  username: string | null
}

export interface Department {
  id: string
  organizationId: string
  name: string
  code: string
  description?: string | null
  isActive: boolean
  managerId?: string | null
  manager?: { id: string; firstName: string | null; lastName: string | null } | null
  createdAt: string
  updatedAt: string
  _count?: { users: number }
}

export interface DepartmentListResponse {
  data: Department[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export interface CreateDepartmentDTO {
  name: string
  code: string
  description?: string
}

export interface UpdateDepartmentDTO {
  name?: string
  code?: string
  description?: string | null
  isActive?: boolean
  managerId?: string | null
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const departmentService = {
  list: async (params?: { page?: number; limit?: number; search?: string }) => {
    const q = new URLSearchParams()
    if (params?.page)   q.append('page',   String(params.page))
    if (params?.limit)  q.append('limit',  String(params.limit))
    if (params?.search) q.append('search', params.search)
    const qs = q.toString() ? `?${q.toString()}` : ''
    const res = await api.get<DepartmentListResponse>(`/departments/${qs}`)
    return res.data
  },

  create: async (data: CreateDepartmentDTO) => {
    const res = await api.post<Department>('/departments/', data)
    return res.data
  },

  update: async (id: string, data: UpdateDepartmentDTO) => {
    const res = await api.patch<Department>(`/departments/${id}`, data)
    return res.data
  },

  remove: async (id: string) => {
    const res = await api.delete<{ message: string }>(`/departments/${id}`)
    return res.data
  },

  listMembers: async (id: string) => {
    const res = await api.get<DepartmentMember[]>(`/departments/${id}/members`)
    return res.data
  },

  addMembers: async (id: string, userIds: string[]) => {
    const res = await api.post<{ updated: number }>(`/departments/${id}/members`, { userIds })
    return res.data
  },

  removeMember: async (id: string, userId: string) => {
    const res = await api.delete<{ message: string }>(`/departments/${id}/members/${userId}`)
    return res.data
  },
}
