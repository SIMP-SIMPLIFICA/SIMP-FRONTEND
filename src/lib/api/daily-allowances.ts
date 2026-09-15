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

/**
 * Meio de transporte e origem do recurso — os enums do Anexo I (campos 13 e
 * 16 do formulário físico). Espelho literal de `TransportMeans`/
 * `FundingSource` no `schema.prisma`.
 */
export type TransportMeans = 'RODOVIARIO' | 'AEREO' | 'VEICULO_OFICIAL' | 'OUTRO'
export type FundingSource = 'PROPRIO' | 'CONVENIO'

export const TRANSPORT_MEANS_LABELS: Record<TransportMeans, string> = {
  RODOVIARIO: 'Rodoviário',
  AEREO: 'Aéreo',
  VEICULO_OFICIAL: 'Veículo Oficial',
  OUTRO: 'Outro',
}

export const FUNDING_SOURCE_LABELS: Record<FundingSource, string> = {
  PROPRIO: 'Próprio',
  CONVENIO: 'Convênio',
}

/** Uma nota fiscal ou documento comprobatório da prestação de contas (Épico 8). */
export interface DailyAllowanceReceipt {
  id: string
  dailyAllowanceId: string
  receiptNumber: string
  payeeName: string
  issuedAt: string
  /** Vem como string do Prisma Decimal. */
  amount: string
  createdAt: string
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

  // ── "Número da Diária" (Épico 8, FR-002) — mesmo padrão de OfficialDocument. ──
  sequenceNumber?: number | null
  year?: number
  formattedNumber?: string | null

  // ── Matriz de 20 campos do Anexo I (Épico 4, correção pós-validação) ──
  // Cópia (snapshot) do beneficiário NO MOMENTO da diária, nunca ligada ao
  // cadastro por referência viva — a mesma razão pela qual `beneficiaryName`
  // já era texto solto. `beneficiaryCpf` é a ÚNICA exceção de todo o sistema
  // onde o CPF completo trafega: só sai sem máscara dentro do PDF do Anexo I.
  beneficiaryCpf?: string | null
  beneficiaryRegistrationNumber?: string | null
  beneficiaryRg?: string | null
  /** Órgão emissor do RG — campo da cartilha oficial (Épico 8). */
  beneficiaryRgIssuer?: string | null
  beneficiaryJobTitle?: string | null
  beneficiaryLotacao?: string | null
  beneficiaryBankName?: string | null
  beneficiaryBankAgency?: string | null
  beneficiaryBankAccount?: string | null
  departureTime?: string | null
  arrivalTime?: string | null
  transportMeans?: TransportMeans | null
  fundingSource?: FundingSource | null

  // ── Fim de semana/feriado — regra do TCE (Épico 8, FR-021/FR-022) ──
  weekendHolidayJustification?: string | null

  // ── Prestação de contas / Anexo II (Épico 8) ──
  accountabilityDate?: string | null
  activityReport?: string | null
  accountabilityTicketNumber?: string | null
  accountabilityEventAddress?: string | null
  accountabilityContactsInfo?: string | null
  accountabilityPublicId?: string | null
  accountabilitySha256Hash?: string | null
  accountabilityPdfFileKey?: string | null
  accountabilityIssuedAt?: string | null
  receipts?: DailyAllowanceReceipt[]
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

  // Mesmos 12 campos do snapshot acima — enviados na criação/edição do
  // rascunho, não resolvidos pelo servidor. Todos opcionais: o formulário
  // físico tem casos legítimos de campo em branco ("EM ABERTO"), e travar a
  // diária por um RG que ainda não se sabe engessaria o município.
  beneficiaryCpf?: string
  beneficiaryRegistrationNumber?: string
  beneficiaryRg?: string
  beneficiaryRgIssuer?: string
  beneficiaryJobTitle?: string
  beneficiaryLotacao?: string
  beneficiaryBankName?: string
  beneficiaryBankAgency?: string
  beneficiaryBankAccount?: string
  departureTime?: string
  arrivalTime?: string
  transportMeans?: TransportMeans
  fundingSource?: FundingSource
  /** Obrigatória no SERVIDOR só quando o período toca fim de semana/feriado (Épico 8, FR-022). */
  weekendHolidayJustification?: string
}

export type UpdateDailyAllowanceDTO = Partial<CreateDailyAllowanceDTO>

export interface DailyAllowanceListParams {
  page?: number
  limit?: number
  departmentId?: string
  beneficiaryName?: string
  /** Busca única por nome, CPF ou "Número da Diária" (Épico 8, FR-006). */
  search?: string
  status?: 'PENDING' | 'ISSUED' | 'ACCOUNTED'
  issued?: boolean
  startDate?: string
  endDate?: string
}

/** Uma nota fiscal informada na prestação de contas. */
export interface AccountForReceiptDTO {
  receiptNumber: string
  payeeName: string
  issuedAt: string
  amount: number
}

export interface AccountForDTO {
  accountabilityDate: string
  activityReport: string
  ticketNumber?: string
  eventAddress?: string
  contactsInfo?: string
  receipts?: AccountForReceiptDTO[]
}

/**
 * A prestação de contas só pode ser emitida a partir do dia de retorno da
 * viagem (Épico 8, FR-001). Comparação por DIA DE CALENDÁRIO local — o
 * SERVIDOR é quem faz valer a regra de verdade (`TOO_EARLY`); isto só evita o
 * clique inútil.
 */
export function canAccountFor(allowance: DailyAllowance): boolean {
  if (allowance.status !== 'ISSUED') return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const returnDay = new Date(allowance.returnDate)
  returnDay.setHours(0, 0, 0, 0)
  return today >= returnDay
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

  /** Registra a prestação de contas e emite o Anexo II (Épico 8). */
  accountFor: (id: string, data: AccountForDTO) =>
    api.post<DailyAllowance>(`${BASE}/${id}/account-for`, data).then(r => r.data),

  /** Baixa o Anexo II (prestação de contas) já emitido. */
  async downloadAccountabilityPdf(id: string): Promise<Blob> {
    return apiRequest<Blob>(`${BASE}/${id}/accountability/pdf`, { method: 'GET', responseType: 'blob' })
  },
}
