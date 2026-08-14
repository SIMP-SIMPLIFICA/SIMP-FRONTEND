export type ProcessStatus = 'Tramitando' | 'Concluído' | 'Arquivado' | 'Cancelado'

export const PROCESS_STATUSES: ProcessStatus[] = ['Tramitando', 'Concluído', 'Arquivado', 'Cancelado']

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
}

/** Payload do PATCH /:id/validity — `null` remove o valor já gravado. */
export interface UpdateValidityPayload {
  validityDate?: string | null
  totalValue?: number | null
}
