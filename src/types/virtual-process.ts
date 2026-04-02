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

export interface VirtualProcess {
  id: string
  workspaceId: string
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
  subject: string
  status: string
  category: string
  createdAt: string
  updatedAt: string
  createdById: string
  creator?: { id: string; firstName: string; lastName: string; avatar?: string | null }
  documents?: VirtualProcessDocument[]
  _count?: { documents: number }
}

export interface VirtualProcessListResponse {
  data: VirtualProcess[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export interface CreateVirtualProcessPayload {
  workspaceId: string
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
  status?: string
}
