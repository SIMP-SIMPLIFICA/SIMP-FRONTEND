import { api } from '../api'
import { getAccessToken } from '../auth'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

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

export interface ProtocolReportFilters {
  /** Formato YYYY-MM-DD. */
  startDate?: string
  endDate?: string
  documentCategory?: DocumentCategory
  /** Nome do tipo, ex: "Ofício". */
  type?: string
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

  /**
   * Baixa o Relatório de Protocolos em PDF.
   *
   * `responseType: 'blob'` é obrigatório: sem ele o corpo é lido como texto e
   * os bytes do PDF chegam corrompidos. O download passa pelo cliente
   * autenticado porque a rota exige token — um <a href> receberia 401.
   */
  downloadReport: (filters: ProtocolReportFilters = {}) => {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(filters)) {
      if (value) query.set(key, value)
    }
    const qs = query.toString() ? `?${query.toString()}` : ''

    return apiRequest<Blob>(`/protocols/report${qs}`, {
      method: 'GET',
      responseType: 'blob',
    })
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

  downloadReport: async (params?: {
    documentCategory?: DocumentCategory
    startDate?: string
    endDate?: string
    type?: string
  }): Promise<Blob> => {
    const q = new URLSearchParams()
    if (params?.documentCategory) q.append('documentCategory', params.documentCategory)
    if (params?.startDate)        q.append('startDate', params.startDate)
    if (params?.endDate)          q.append('endDate', params.endDate)
    if (params?.type)             q.append('type', params.type)

    const token = getAccessToken()
    const res = await fetch(`${API_URL}/protocols/report?${q.toString()}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        Accept: 'application/pdf',
      },
      credentials: 'include',
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw err
    }

    return res.blob()
  },
}
