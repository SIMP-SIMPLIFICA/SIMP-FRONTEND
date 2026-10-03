import { api } from '../api'

/**
 * Trilha de auditoria (Painel de Auditoria / Logs).
 *
 * Frontend-only: `GET /api/v1/audit` já existe, já é multi-tenant (Super
 * Admin vê tudo e pode filtrar por organização; admin comum só vê a própria,
 * decidido no SERVIDOR a partir do token) e já é testado
 * (`audit-organization-scope.e2e.spec.ts`). Ver
 * `.specify/specs/audit-log-admin-panel.md`.
 */

export interface AuditLogUser {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
}

export interface AuditLogOrganization {
  id: string
  name: string
}

/**
 * Espelho exato do §4 da spec. Dois formatos de payload convivem no mesmo
 * registro (achado §1.3): o escritor canônico grava `metadata`; registros
 * antigos do escritor legado (hoje sem chamador) trazem `oldData`/`newData`
 * em vez disso. Nenhum dos três é garantido — a tela de detalhe não pode
 * presumir qual vai chegar.
 */
export interface AuditLogRecord {
  id: string
  userId: string | null
  /** Texto livre gravado pelo backend — ex: 'DAILY_ALLOWANCE_ISSUED', 'ORGANIZATION_SUSPENDED'. Não é um enum fechado. */
  action: string
  /** Texto livre — ex: 'DAILY_ALLOWANCE', 'VIRTUAL_PROCESS', 'ORGANIZATION'. Não é um enum fechado. */
  resource: string
  resourceId: string | null
  method: string | null
  endpoint: string | null
  ipAddress: string
  userAgent: string | null
  /** Legado — ver achado §1.3. */
  oldData: unknown | null
  /** Legado — ver achado §1.3. */
  newData: unknown | null
  /** Canônico — ver achado §1.3. */
  metadata: unknown | null
  success: boolean
  errorMessage: string | null
  createdAt: string
  organizationId: string | null
  user: AuditLogUser | null
  organization: AuditLogOrganization | null
}

export interface AuditLogFilter {
  page?: number
  limit?: number
  userId?: string
  /** Só tem efeito para Super Admin — o backend ignora/recusa para admin comum. */
  organizationId?: string
  /** Substring, case-insensitive — casado no servidor. */
  action?: string
  /** Exato — casado no servidor. */
  resource?: string
  startDate?: string
  endDate?: string
}

export interface AuditLogMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PaginatedAuditLogs {
  data: AuditLogRecord[]
  meta: AuditLogMeta
}

/**
 * Teto do `filterSchema` do backend (achado §1.4). Pedir mais do que isto
 * não devolve erro — devolve a página vazia, em silêncio. Este projeto já
 * teve esse mesmo bug em três telas do financeiro; a auditoria não pode
 * repeti-lo, então o limite é sempre grampeado aqui, mesmo que quem chame
 * peça mais.
 */
export const AUDIT_LOG_MAX_LIMIT = 100

const BASE = '/api/v1/audit'

function buildQuery(filter?: AuditLogFilter): string {
  if (!filter) return ''
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(filter)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}

export const auditService = {
  list: (filter?: AuditLogFilter) => {
    const safeFilter: AuditLogFilter | undefined = filter && {
      ...filter,
      limit:
        filter.limit !== undefined
          ? Math.min(filter.limit, AUDIT_LOG_MAX_LIMIT)
          : undefined,
    }
    return api
      .get<PaginatedAuditLogs>(`${BASE}${buildQuery(safeFilter)}`)
      .then(r => r.data)
  },
}
