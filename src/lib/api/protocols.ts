import { api } from '../api'

// ─── Enums ────────────────────────────────────────────────────────────────────

export type DocumentCategory = 'COMUNICACAO' | 'NORMATIVO'
export type DocumentNumberingType = 'SEQUENTIAL' | 'RANDOM' | 'MANUAL'
export type DocumentStatus = 'RESERVADO' | 'EMITIDO' | 'CANCELADO'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OfficialDocumentCreator {
  id: string
  firstName: string
  lastName: string
}

export interface OfficialDocument {
  id: string
  organizationId: string
  creatorId: string
  documentCategory: DocumentCategory
  documentType: string
  numberingType: DocumentNumberingType
  sequenceNumber: number | null
  year: number
  formattedNumber: string
  subject: string
  recipient: string | null
  sector: string
  departmentId: string | null
  status: DocumentStatus
  cancelReason: string | null
  libraryDocumentId: string | null
  createdAt: string
  updatedAt: string
  creator?: OfficialDocumentCreator
}

export interface OfficialDocumentListResponse {
  data: OfficialDocument[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export interface GenerateDocumentDTO {
  documentCategory: DocumentCategory
  documentType: string
  numberingType?: DocumentNumberingType
  subject: string
  recipient?: string
  // COMUNICACAO: enviar departmentId. NORMATIVO: omitir.
  departmentId?: string
  // NORMATIVO: número e ano informados manualmente (obrigatórios).
  // COMUNICACAO: omitir — o sistema gera o número e usa o ano corrente.
  sequenceNumber?: number
  year?: number
}

export interface UpdateDocumentStatusDTO {
  status: 'EMITIDO' | 'CANCELADO'
  cancelReason?: string
  libraryDocumentId?: string
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const protocolService = {
  list: async (params?: {
    page?: number
    limit?: number
    search?: string
    documentCategory?: DocumentCategory
    status?: DocumentStatus
    year?: number
    month?: number
    sector?: string
  }) => {
    const q = new URLSearchParams()
    if (params?.page)             q.append('page',             String(params.page))
    if (params?.limit)            q.append('limit',            String(params.limit))
    if (params?.search)           q.append('search',           params.search)
    if (params?.documentCategory) q.append('documentCategory', params.documentCategory)
    if (params?.status)           q.append('status',           params.status)
    if (params?.year)             q.append('year',             String(params.year))
    if (params?.month)            q.append('month',            String(params.month))
    if (params?.sector)           q.append('sector',           params.sector)
    const qs = q.toString() ? `?${q.toString()}` : ''
    const res = await api.get<OfficialDocumentListResponse>(`/protocols/${qs}`)
    return res.data
  },

  generate: async (data: GenerateDocumentDTO) => {
    const res = await api.post<OfficialDocument>('/protocols/generate', data)
    return res.data
  },

  updateStatus: async (id: string, data: UpdateDocumentStatusDTO) => {
    const res = await api.patch<OfficialDocument>(`/protocols/${id}/status`, data)
    return res.data
  },

  delete: async (id: string) => {
    await api.delete(`/protocols/${id}`)
  },
}
