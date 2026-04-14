import { api } from '../api'
import type { VirtualProcessCompany } from './virtual-processes'

// ─── Status (enum — unchanged) ───────────────────────────────────────────────

export type CovenantStatus =
  | 'EM_ANALISE'
  | 'APROVADO'
  | 'EM_EXECUCAO'
  | 'PRESTACAO_CONTAS'
  | 'CONCLUIDO'
  | 'DEVOLVIDO'

// ─── Related entity types ────────────────────────────────────────────────────

export interface CovenantType {
  id: string
  organizationId: string
  name: string
  createdAt: string
}

export interface Convenente {
  id: string
  organizationId: string
  name: string
  cnpj?: string | null
  createdAt: string
}

export interface Concedente {
  id: string
  organizationId: string
  name: string
  cnpj?: string | null
  createdAt: string
}

// ─── Covenant ────────────────────────────────────────────────────────────────

export interface Covenant {
  id: string
  organizationId: string
  number: string
  typeId?: string | null
  proponentId?: string | null
  convenenteId?: string | null
  concedenteId?: string | null
  processObject: string
  budgetaryAction?: string | null
  executionStartDate?: string | null
  validityStartDate?: string | null
  validityEndDate?: string | null
  termDays?: number | null
  transferValue?: string | null
  counterpartValue?: string | null
  status: CovenantStatus
  bankName?: string | null
  bankAgency?: string | null
  bankAccount?: string | null
  createdAt: string
  updatedAt: string
  // Relations (populated by list/getOne)
  covenantType?: Pick<CovenantType, 'id' | 'name'> | null
  proponent?: Pick<VirtualProcessCompany, 'id' | 'name' | 'cnpj'> | null
  convenente?: Pick<Convenente, 'id' | 'name' | 'cnpj'> | null
  concedente?: Pick<Concedente, 'id' | 'name' | 'cnpj'> | null
  _count?: { virtualProcesses: number; libraryDocuments: number }
}

export interface CovenantListResponse {
  data: Covenant[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export interface CreateCovenantDTO {
  number: string
  typeId?: string
  proponentId?: string
  convenenteId?: string
  concedenteId?: string
  processObject: string
  budgetaryAction?: string
  executionStartDate?: string
  validityStartDate?: string
  validityEndDate?: string
  termDays?: number
  transferValue?: number
  counterpartValue?: number
  status?: CovenantStatus
  bankName?: string
  bankAgency?: string
  bankAccount?: string
}

export type UpdateCovenantDTO = Partial<CreateCovenantDTO>

// ─── Service ─────────────────────────────────────────────────────────────────

export const covenantService = {
  list: async (params?: {
    page?: number; limit?: number; search?: string
    typeId?: string; status?: CovenantStatus
  }) => {
    const q = new URLSearchParams()
    if (params?.page)   q.append('page',   String(params.page))
    if (params?.limit)  q.append('limit',  String(params.limit))
    if (params?.search) q.append('search', params.search)
    if (params?.typeId) q.append('typeId', params.typeId)
    if (params?.status) q.append('status', params.status)
    const qs = q.toString() ? `?${q.toString()}` : ''
    const res = await api.get<CovenantListResponse>(`/covenants/${qs}`)
    return res.data
  },

  getOne: async (id: string) => {
    const res = await api.get<Covenant>(`/covenants/${id}`)
    return res.data
  },

  create: async (data: CreateCovenantDTO) => {
    const res = await api.post<Covenant>('/covenants/', data)
    return res.data
  },

  update: async (id: string, data: UpdateCovenantDTO) => {
    const res = await api.put<Covenant>(`/covenants/${id}`, data)
    return res.data
  },

  delete: async (id: string) => {
    await api.delete(`/covenants/${id}`)
  },

  // ── CovenantType ───────────────────────────────────────────────────────────
  listTypes: async () => {
    const res = await api.get<CovenantType[]>('/covenants/types')
    return res.data
  },
  createType: async (name: string) => {
    const res = await api.post<CovenantType>('/covenants/types', { name })
    return res.data
  },
  deleteType: async (id: string) => {
    await api.delete(`/covenants/types/${id}`)
  },

  // ── Convenente ─────────────────────────────────────────────────────────────
  listConvenentes: async () => {
    const res = await api.get<Convenente[]>('/covenants/convenentes')
    return res.data
  },
  createConvenente: async (data: { name: string; cnpj?: string }) => {
    const res = await api.post<Convenente>('/covenants/convenentes', data)
    return res.data
  },
  deleteConvenente: async (id: string) => {
    await api.delete(`/covenants/convenentes/${id}`)
  },

  // ── Concedente ─────────────────────────────────────────────────────────────
  listConcedentes: async () => {
    const res = await api.get<Concedente[]>('/covenants/concedentes')
    return res.data
  },
  createConcedente: async (data: { name: string; cnpj?: string }) => {
    const res = await api.post<Concedente>('/covenants/concedentes', data)
    return res.data
  },
  deleteConcedente: async (id: string) => {
    await api.delete(`/covenants/concedentes/${id}`)
  },
}
