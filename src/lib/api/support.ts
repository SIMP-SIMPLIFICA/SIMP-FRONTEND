import { api } from '../api'

// ─── Enums ────────────────────────────────────────────────────────────────────

export type SupportType   = 'TICKET' | 'CHAT'
export type SupportStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SupportUser {
  id:        string
  firstName: string
  lastName:  string | null
  avatar:    string | null
}

export interface SupportRequest {
  id:             string
  authorId:       string
  organizationId: string
  type:           SupportType
  status:         SupportStatus
  subject:        string | null
  createdAt:      string
  updatedAt:      string
  author?:        SupportUser
  _count?:        { messages: number }
}

export interface SupportMessage {
  id:        string
  requestId: string
  senderId:  string
  content:   string
  isRead:    boolean
  createdAt: string
  sender?:   SupportUser
}

export interface SupportMessagesResponse {
  data:    SupportMessage[]
  request: SupportRequest
}

export interface SupportListResponse {
  data: SupportRequest[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface CreateSupportRequestDTO {
  type:     SupportType
  subject?: string
  message:  string
}

export interface SendMessageDTO {
  content: string
}

export interface UpdateSupportStatusDTO {
  status: SupportStatus
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const supportService = {
  list: async (params?: { status?: SupportStatus; type?: SupportType; page?: number; limit?: number }) => {
    const q = new URLSearchParams()
    if (params?.status) q.append('status', params.status)
    if (params?.type)   q.append('type',   params.type)
    if (params?.page)   q.append('page',   String(params.page))
    if (params?.limit)  q.append('limit',  String(params.limit))
    const qs = q.toString() ? `?${q.toString()}` : ''
    const res = await api.get<SupportListResponse>(`/support${qs}`)
    return res.data
  },

  create: async (data: CreateSupportRequestDTO) => {
    const res = await api.post<SupportRequest>('/support', data)
    return res.data
  },

  getMessages: async (requestId: string) => {
    const res = await api.get<SupportMessagesResponse>(`/support/${requestId}/messages`)
    return res.data
  },

  addMessage: async (requestId: string, data: SendMessageDTO) => {
    const res = await api.post<SupportMessage>(`/support/${requestId}/messages`, data)
    return res.data
  },

  updateStatus: async (requestId: string, data: UpdateSupportStatusDTO) => {
    const res = await api.patch<SupportRequest>(`/support/${requestId}/status`, data)
    return res.data
  },
}
