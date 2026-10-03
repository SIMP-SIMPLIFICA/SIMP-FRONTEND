export type ProcessStatus = 'Tramitando' | 'Concluído' | 'Arquivado' | 'Cancelado'

export const PROCESS_STATUSES: ProcessStatus[] = ['Tramitando', 'Concluído', 'Arquivado', 'Cancelado']

/**
 * Fase oficial da despesa pública (Lei 4.320/64) — Épico 8, FR-019.
 * Dimensão ADICIONAL ao `status` textual acima, nunca o substitui.
 */
export type ExpensePhase = 'EMPENHO' | 'LIQUIDACAO' | 'PAGAMENTO'

export const EXPENSE_PHASE_LABELS: Record<ExpensePhase, string> = {
  EMPENHO: 'Empenho',
  LIQUIDACAO: 'Liquidação',
  PAGAMENTO: 'Pagamento',
}

export const PROCESS_CATEGORIES = [
  'Contratos', 'Licitações', 'Convênios', 'Obras', 'Compras', 'Serviços',
  'Recursos Humanos', 'Jurídico', 'Administrativo', 'Outros'
]

export interface VirtualProcessDocument {
  id: string
  virtualProcessId: string
  tag: string
  description?: string | null
  fileName: string
  fileUrl: string
  fileSize: number
  uploadedById: string
  uploadedAt: string
  uploader?: { id: string; firstName: string; lastName: string }
}

/**
 * Documento exibido na aba do Processo, normalizado no backend a partir de dois
 * modelos distintos (VirtualProcessDocument e LibraryDocument). `source` indica a
 * procedência — documentos do convênio são leitura + download apenas.
 */
export interface UnifiedProcessDoc {
  id: string
  fileName: string
  fileSize: number
  uploadedAt: string
  uploader?: { id: string; firstName: string | null; lastName: string | null }
  source: 'process' | 'covenant'
  /** Somente origem 'process'. */
  tag?: string
  description?: string | null
  /** Somente origem 'covenant'. */
  title?: string
  accessLevel?: number
  covenantNumber?: string | null
}

export interface VirtualProcess {
  id: string
  organizationId: string
  processNumber: string
  /** Secretaria responsavel (FK). Epico 4. */
  departmentId?: string | null
  secretaria: string
  source: string
  sourceDetail?: string | null
  bankAccount?: string | null
  agency?: string | null
  bankName?: string | null
  companyCnpj?: string | null
  companyName?: string | null
  startDate?: string | null
  endDate?: string | null
  /** Vigência legal — é esta data que dispara os alertas de vencimento. */
  validityDate?: string | null
  /** Decimal do Prisma chega como string no JSON — converter com Number() antes de calcular. */
  totalValue?: string | number | null
  subject: string
  status: string
  category: string
  /** Dotação do QDD que lastreia o processo (Épico 8, FR-011). */
  qddItemId?: string | null
  qddItem?: { id: string; ficha: string; fonte: string; naturezaDespesa: string; year: number } | null
  budgetOverrun?: boolean
  expensePhase?: ExpensePhase | null
  createdAt: string
  updatedAt: string
  createdById: string
  creator?: { id: string; firstName: string; lastName: string; avatar?: string | null }
  documents?: VirtualProcessDocument[]
  /** Documentos do processo + do convênio, já normalizados pelo backend. */
  unifiedDocuments?: UnifiedProcessDoc[]
  covenants?: Array<{ id: string; number: string; status: string; processObject: string; covenantType?: { id: string; name: string } | null }>
  _count?: { documents: number }
}

export interface VirtualProcessListResponse {
  data: VirtualProcess[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export interface CreateVirtualProcessPayload {
  /** Secretaria responsavel (FK). Epico 4. */
  departmentId?: string | null
  processNumber: string
  secretaria: string
  source: string
  subject: string
  category: string
  sourceDetail?: string
  bankAccount?: string
  agency?: string
  bankName?: string
  companyCnpj?: string
  companyName?: string
  startDate?: string
  endDate?: string
  validityDate?: string
  totalValue?: number
  status?: string
  qddItemId?: string | null
  expensePhase?: ExpensePhase | null
}

/** Payload do PATCH /:id/validity — `null` remove o valor já gravado. */
export interface UpdateValidityPayload {
  validityDate?: string | null
  totalValue?: number | null
}

/**
 * Payload do PATCH /:id/budget (Épico 8, FR-011/FR-019) — `undefined` não
 * mexe no campo, `null` limpa (desvincula ficha / remove fase), um valor define.
 */
export interface UpdateBudgetPayload {
  qddItemId?: string | null
  expensePhase?: ExpensePhase | null
}
