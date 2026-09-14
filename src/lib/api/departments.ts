import { api, apiRequest } from '../api'

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
  /** Só dígitos — use `formatCnpj` para exibir. */
  cnpj?: string | null
  /**
   * Ordenador de despesa: quem responde juridicamente pelo empenho.
   * DISTINTO de `manager`, que é o usuário do sistema — o ordenador
   * frequentemente não tem login.
   */
  chiefName?: string | null
  isActive: boolean
  managerId?: string | null
  manager?: { id: string; firstName: string | null; lastName: string | null } | null
  createdAt: string
  updatedAt: string
  _count?: DepartmentCounts
}

/**
 * Contagens dos vínculos, entregues junto com o setor.
 *
 * Vêm na mesma resposta para a tela saber quais abas têm conteúdo sem disparar
 * quatro requisições só para descobrir que três estão vazias.
 */
export interface DepartmentCounts {
  members?: number
  users?: number
  councils?: number
  covenants?: number
  virtualProcesses?: number
  qddItems?: number
}

// ─── Vínculos ────────────────────────────────────────────────────────────────

export interface LinkedCouncil {
  id: string
  name: string
  acronym: string | null
  legalBasis: string | null
  isActive: boolean
}

export interface LinkedCovenant {
  id: string
  number: string
  processObject: string
  /** Decimal do Prisma chega como string — converter antes de calcular. */
  transferValue: string | null
  validityStartDate: string | null
  validityEndDate: string | null
}

export interface LinkedVirtualProcess {
  id: string
  processNumber: string
  secretaria: string
  companyName: string | null
  startDate: string | null
  endDate: string | null
}

/** Seções do dossiê. Os nomes são contrato com o backend — não traduzir. */
export const DOSSIER_SECTIONS = [
  'members',
  'cnpj',
  'councils',
  'qdd',
  'covenants',
  'virtualProcesses',
] as const

export type DossierSection = (typeof DOSSIER_SECTIONS)[number]

/** Rótulos em pt-BR das seções, para o modal de exportação. */
export const DOSSIER_SECTION_LABELS: Record<DossierSection, string> = {
  members: 'Servidores lotados',
  cnpj: 'CNPJ',
  councils: 'Conselhos vinculados',
  qdd: 'Dotações do QDD',
  covenants: 'Convênios',
  virtualProcesses: 'Processos virtuais',
}

export interface DepartmentListResponse {
  data: Department[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export interface CreateDepartmentDTO {
  name: string
  code: string
  description?: string
  /** Só dígitos, ou string vazia para não informar. */
  cnpj?: string | null
  chiefName?: string | null
}

export interface UpdateDepartmentDTO {
  name?: string
  code?: string
  description?: string | null
  isActive?: boolean
  managerId?: string | null
  /** String vazia LIMPA o valor gravado; `undefined` não mexe no campo. */
  cnpj?: string | null
  chiefName?: string | null
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

  getById: async (id: string) => {
    const res = await api.get<Department>(`/departments/${id}`)
    return res.data
  },

  listCouncils: async (id: string) => {
    const res = await api.get<LinkedCouncil[]>(`/departments/${id}/councils`)
    return res.data
  },

  listCovenants: async (id: string) => {
    const res = await api.get<LinkedCovenant[]>(`/departments/${id}/covenants`)
    return res.data
  },

  listVirtualProcesses: async (id: string) => {
    const res = await api.get<LinkedVirtualProcess[]>(`/departments/${id}/virtual-processes`)
    return res.data
  },

  /**
   * Baixa o Dossiê do Setor em PDF.
   *
   * `apiRequest` com `responseType: 'blob'`, nunca `fetch` cru: o adaptador
   * `api` supõe JSON e devolveria binário corrompido, e um `fetch` montado à
   * mão não renova o token — com a sessão expirada, o download falharia em
   * silêncio. Já houve esse defeito em `protocols.ts`.
   */
  downloadDossier: (id: string, sections: DossierSection[]) => {
    const query = sections.length > 0 ? `?sections=${sections.join(',')}` : ''
    return apiRequest<Blob>(`/departments/${id}/dossier${query}`, {
      method: 'GET',
      responseType: 'blob',
    })
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
