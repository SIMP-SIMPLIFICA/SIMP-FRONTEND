import { api, apiRequest } from '../api'

/**
 * Diárias de servidor (Épico 3).
 *
 * O ciclo de vida tem duas fases e a interface precisa refletir isso:
 * enquanto `sha256Hash` é nulo o registro é RASCUNHO e aceita edição; depois da
 * emissão vira documento oficial e o backend recusa alteração com HTTP 409.
 */

export interface DailyAllowanceUser {
  id: string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
}

export interface DailyAllowance {
  id: string
  publicId: string
  organizationId: string
  /** Nome de quem viajou, gravado como texto no documento. */
  beneficiaryName: string
  createdById: string
  /** Setor ao qual a despesa é imputada (Épico 4). */
  departmentId?: string | null
  department?: { id: string; name: string; code: string } | null
  /** Ficha do QDD que lastreia a despesa. Opcional até a Fase 3 completa. */
  qddItemId?: string | null
  qddItem?: { id: string; ficha: string; fonte: string; naturezaDespesa: string; year: number } | null
  /** Situação do ciclo de vida. */
  status?: 'PENDING' | 'ISSUED' | 'ACCOUNTED'
  /** Calculada NO SERVIDOR — o frontend nunca recalcula prazo. */
  isLate?: boolean
  budgetOverrun?: boolean
  destination: string
  purpose: string
  departureDate: string
  returnDate: string
  /** Vem como string do Prisma Decimal — converter antes de calcular. */
  dailyRate: string
  dayCount: string
  totalAmount: string
  sha256Hash: string | null
  issuedAt: string | null
  pdfFileKey: string | null
  createdAt: string
  updatedAt: string
  createdBy?: DailyAllowanceUser
}

export interface CreateDailyAllowanceDTO {
  /** Obrigatório: despesa sem setor não tem ordenador responsável — o backend recusa com 400. */
  departmentId: string
  /** Ficha do QDD que lastreia a despesa. Sem ela, a diária é emitida sem alerta de estouro. */
  qddItemId?: string
  beneficiaryName: string
  destination: string
  purpose: string
  departureDate: string
  returnDate: string
  dailyRate: number
  dayCount: number
}

export type UpdateDailyAllowanceDTO = Partial<CreateDailyAllowanceDTO>

export interface DailyAllowanceListParams {
  page?: number
  limit?: number
  departmentId?: string
  beneficiaryName?: string
  issued?: boolean
  startDate?: string
  endDate?: string
}

export interface PaginatedDailyAllowances {
  data: DailyAllowance[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

const BASE = '/api/v1/daily-allowances'

function buildQuery(params?: DailyAllowanceListParams): string {
  if (!params) return ''
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}

/** Já emitida? É o que decide entre modo de edição e somente leitura. */
export function isIssued(allowance: DailyAllowance): boolean {
  return Boolean(allowance.sha256Hash)
}

export const dailyAllowanceService = {
  list: (params?: DailyAllowanceListParams) =>
    api.get<PaginatedDailyAllowances>(`${BASE}${buildQuery(params)}`).then(r => r.data),

  getById: (id: string) => api.get<DailyAllowance>(`${BASE}/${id}`).then(r => r.data),

  create: (data: CreateDailyAllowanceDTO) =>
    api.post<DailyAllowance>(BASE, data).then(r => r.data),

  update: (id: string, data: UpdateDailyAllowanceDTO) =>
    api.patch<DailyAllowance>(`${BASE}/${id}`, data).then(r => r.data),

  remove: (id: string) => api.delete<void>(`${BASE}/${id}`).then(r => r.data),

  /** Emite o documento oficial: gera PDF e congela o registro. */
  issue: (id: string) => api.post<DailyAllowance>(`${BASE}/${id}/issue`, {}).then(r => r.data),

  /**
   * Baixa o PDF já emitido.
   *
   * Usa `apiRequest` diretamente porque o adaptador `api` supõe JSON, e aqui a
   * resposta é binária — passar por ele devolveria texto corrompido.
   */
  async downloadPdf(id: string): Promise<Blob> {
    return apiRequest<Blob>(`${BASE}/${id}/pdf`, { method: 'GET', responseType: 'blob' })
  },
}
