import { api } from '../api'

// ─── Enums ────────────────────────────────────────────────────────────────────

export type CouncilMemberRole =
  | 'PRESIDENTE'
  | 'VICE_PRESIDENTE'
  | 'SECRETARIO'
  | 'MEMBRO_TITULAR'
  | 'MEMBRO_SUPLENTE'

export type MeetingStatus =
  | 'AGENDADA'
  | 'EM_ANDAMENTO'
  | 'CONCLUIDA'
  | 'CANCELADA'

export type AgendaItemStatus =
  | 'PENDENTE'
  | 'APROVADO_UNANIMIDADE'
  | 'APROVADO_MAIORIA'
  | 'APROVADO_RESSALVAS'
  | 'REPROVADO'
  | 'VISTAS_ADIADO'

export type CouncilDocumentType =
  | 'ATA'
  | 'RESOLUCAO'
  | 'CONVOCACAO'
  | 'PARECER'
  | 'OUTROS'

export type SignatureStatus =
  | 'PENDENTE'
  | 'ASSINADO'
  | 'FALHOU'
  | 'EXPIRADO'

// ─── Entity types ─────────────────────────────────────────────────────────────

export interface UserSummary {
  id: string
  firstName: string
  lastName: string
  email?: string
  jobTitle?: string | null
  avatar?: string | null
}

export interface Council {
  id: string
  organizationId: string
  name: string
  acronym: string | null
  description: string | null
  legalBasis: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count?: { memberships: number }
}

export interface CouncilMembership {
  id: string
  councilId: string
  userId: string
  organizationId: string
  role: CouncilMemberRole
  startDate: string | null
  endDate: string | null
  isActive: boolean
  createdAt: string
  user: UserSummary
}

export interface MeetingAgendaItem {
  id: string
  meetingId: string
  order: number
  title: string
  description: string | null
  status: AgendaItemStatus
  votingRemarks: string | null
}

export interface MeetingAttendanceEntry {
  membershipId: string
  userId: string
  firstName: string
  lastName: string
  role: CouncilMemberRole
  isPresent: boolean
  justifiedAbsence: boolean | null
}

export interface SaveAttendanceDTO {
  attendance: Array<{
    membershipId: string
    isPresent: boolean
    justifiedAbsence?: boolean | null
  }>
}

export interface SignatureRequestSummary {
  id: string
  status: SignatureStatus
  signedAt: string | null
  requestedById: string
}

export interface CouncilDocument {
  id: string
  organizationId: string
  meetingId: string
  documentType: CouncilDocumentType
  title: string
  fileKey: string
  fileName: string
  fileSize: number
  mimeType: string
  sha256Hash: string | null
  uploadedById: string
  createdAt: string
  updatedAt: string
  uploadedBy?: UserSummary
  signatureRequests?: SignatureRequestSummary[]
}

export interface CouncilMeeting {
  id: string
  organizationId: string
  councilId: string
  title: string
  description: string | null
  location: string | null
  scheduledAt: string
  endedAt: string | null
  status: MeetingStatus
  quorum: number | null
  createdById: string
  createdAt: string
  updatedAt: string
  createdBy?: UserSummary
  agendaItems?: MeetingAgendaItem[]
  documents?: CouncilDocument[]
  _count?: { agendaItems: number; documents: number }
  /**
   * Trava de compliance de 72h — calculada NO SERVIDOR e apenas refletida aqui.
   * O frontend não recalcula: o relógio do navegador do usuário não pode
   * participar da decisão sobre um registro oficial.
   */
  isFrozen?: boolean
  /** Instante a partir do qual a reunião congelou. */
  freezeAt?: string
}

export interface CouncilDetail extends Council {
  memberships: CouncilMembership[]
  meetings: CouncilMeeting[]
}

export interface SignatureRequest {
  id: string
  status: SignatureStatus
  signedAt: string | null
  errorMsg: string | null
  documentId: string
  createdAt: string
}

// ─── DTO types ────────────────────────────────────────────────────────────────

export interface CreateCouncilDTO {
  name: string
  acronym?: string
  description?: string
  legalBasis?: string
}

export interface UpdateCouncilDTO extends Partial<CreateCouncilDTO> {
  isActive?: boolean
}

export interface AddMemberDTO {
  userId: string
  role?: CouncilMemberRole
  startDate?: string
  endDate?: string
}

export interface UpdateMemberDTO {
  role?: CouncilMemberRole
  startDate?: string
  endDate?: string
  isActive?: boolean
}

export interface CreateMeetingDTO {
  title: string
  description?: string
  location?: string
  scheduledAt: string
}

export interface UpdateMeetingDTO extends Partial<CreateMeetingDTO> {
  endedAt?: string
  quorum?: number
}

export interface AddAgendaItemDTO {
  order: number
  title: string
  description?: string
}

export interface UpdateAgendaItemDTO {
  order?: number
  title?: string
  description?: string
  status?: AgendaItemStatus
  votingRemarks?: string | null
}

// ─── List response ────────────────────────────────────────────────────────────

export interface CouncilListResponse {
  data: Council[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const councilService = {

  // ── Conselhos ───────────────────────────────────────────────────────────────

  list: async (params?: {
    page?: number
    limit?: number
    search?: string
    isActive?: boolean
  }) => {
    const q = new URLSearchParams()
    if (params?.page     !== undefined) q.set('page',     String(params.page))
    if (params?.limit    !== undefined) q.set('limit',    String(params.limit))
    if (params?.search)                 q.set('search',   params.search)
    if (params?.isActive !== undefined) q.set('isActive', String(params.isActive))
    const qs = q.toString() ? `?${q.toString()}` : ''
    const res = await api.get<CouncilListResponse>(`/councils${qs}`)
    return res.data
  },

  get: async (id: string) => {
    const res = await api.get<CouncilDetail>(`/councils/${id}`)
    return res.data
  },

  create: async (data: CreateCouncilDTO) => {
    const res = await api.post<Council>('/councils', data)
    return res.data
  },

  update: async (id: string, data: UpdateCouncilDTO) => {
    const res = await api.put<Council>(`/councils/${id}`, data)
    return res.data
  },

  remove: async (id: string) => {
    await api.delete(`/councils/${id}`)
  },

  // ── Membros ─────────────────────────────────────────────────────────────────

  listMembers: async (councilId: string) => {
    const res = await api.get<{ data: CouncilMembership[] }>(`/councils/${councilId}/members`)
    return res.data.data
  },

  addMember: async (councilId: string, data: AddMemberDTO) => {
    const res = await api.post<CouncilMembership>(`/councils/${councilId}/members`, data)
    return res.data
  },

  updateMember: async (councilId: string, membershipId: string, data: UpdateMemberDTO) => {
    const res = await api.put<CouncilMembership>(
      `/councils/${councilId}/members/${membershipId}`,
      data,
    )
    return res.data
  },

  removeMember: async (councilId: string, membershipId: string) => {
    await api.delete(`/councils/${councilId}/members/${membershipId}`)
  },

  // ── Reuniões ────────────────────────────────────────────────────────────────

  listMeetings: async (councilId: string) => {
    const res = await api.get<{ data: CouncilMeeting[] }>(`/councils/${councilId}/meetings`)
    return res.data.data
  },

  getMeeting: async (councilId: string, meetingId: string) => {
    const res = await api.get<CouncilMeeting>(`/councils/${councilId}/meetings/${meetingId}`)
    return res.data
  },

  createMeeting: async (councilId: string, data: CreateMeetingDTO) => {
    const res = await api.post<CouncilMeeting>(`/councils/${councilId}/meetings`, data)
    return res.data
  },

  updateMeeting: async (councilId: string, meetingId: string, data: UpdateMeetingDTO) => {
    const res = await api.put<CouncilMeeting>(`/councils/${councilId}/meetings/${meetingId}`, data)
    return res.data
  },

  deleteMeeting: async (councilId: string, meetingId: string) => {
    await api.delete(`/councils/${councilId}/meetings/${meetingId}`)
  },

  updateMeetingStatus: async (councilId: string, meetingId: string, status: MeetingStatus) => {
    const res = await api.patch<CouncilMeeting>(
      `/councils/${councilId}/meetings/${meetingId}/status`,
      { status },
    )
    return res.data
  },

  // ── Pautas ──────────────────────────────────────────────────────────────────

  addAgendaItem: async (councilId: string, meetingId: string, data: AddAgendaItemDTO) => {
    const res = await api.post<MeetingAgendaItem>(
      `/councils/${councilId}/meetings/${meetingId}/agenda`,
      data,
    )
    return res.data
  },

  updateAgendaItem: async (
    councilId: string,
    meetingId: string,
    itemId: string,
    data: UpdateAgendaItemDTO,
  ) => {
    const res = await api.put<MeetingAgendaItem>(
      `/councils/${councilId}/meetings/${meetingId}/agenda/${itemId}`,
      data,
    )
    return res.data
  },

  removeAgendaItem: async (councilId: string, meetingId: string, itemId: string) => {
    await api.delete(`/councils/${councilId}/meetings/${meetingId}/agenda/${itemId}`)
  },

  // ── Presença ────────────────────────────────────────────────────────────────

  getAttendance: async (councilId: string, meetingId: string) => {
    const res = await api.get<{ data: MeetingAttendanceEntry[] }>(
      `/councils/${councilId}/meetings/${meetingId}/attendance`,
    )
    return res.data.data
  },

  saveAttendance: async (councilId: string, meetingId: string, data: SaveAttendanceDTO) => {
    const res = await api.put<{ success: boolean }>(
      `/councils/${councilId}/meetings/${meetingId}/attendance`,
      data,
    )
    return res.data
  },

  // ── Documentos ──────────────────────────────────────────────────────────────

  listDocuments: async (councilId: string, meetingId: string) => {
    const res = await api.get<{ data: CouncilDocument[] }>(
      `/councils/${councilId}/meetings/${meetingId}/documents`,
    )
    return res.data.data
  },

  uploadDocument: async (
    councilId: string,
    meetingId: string,
    file: File,
    fields?: { title?: string; documentType?: CouncilDocumentType },
  ) => {
    const form = new FormData()
    form.append('file', file)
    if (fields?.title)        form.append('title',        fields.title)
    if (fields?.documentType) form.append('documentType', fields.documentType)
    const res = await api.post<CouncilDocument>(
      `/councils/${councilId}/meetings/${meetingId}/documents`,
      form,
    )
    return res.data
  },

  getDocumentDownloadUrl: async (councilId: string, meetingId: string, docId: string) => {
    const res = await api.get<{ url: string; fileName: string; sha256Hash: string | null }>(
      `/councils/${councilId}/meetings/${meetingId}/documents/${docId}/download`,
    )
    return res.data
  },

  deleteDocument: async (councilId: string, meetingId: string, docId: string) => {
    await api.delete(`/councils/${councilId}/meetings/${meetingId}/documents/${docId}`)
  },

  // ── Assinatura Gov.br ────────────────────────────────────────────────────────

  initiateSignature: async (documentId: string) => {
    const res = await api.post<{ authorizationUrl: string; signatureRequestId: string }>(
      '/councils/sign/initiate',
      { documentId },
    )
    return res.data
  },

  getSignatureStatus: async (requestId: string) => {
    const res = await api.get<SignatureRequest>(`/councils/sign/${requestId}/status`)
    return res.data
  },
}
