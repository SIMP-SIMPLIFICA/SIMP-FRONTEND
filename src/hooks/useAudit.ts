import { useQuery } from '@tanstack/react-query'
import { type AuditLogFilter, auditService } from '@/lib/api/audit'

const KEY = 'audit'

/**
 * Erro de permissão/autenticação (4xx) não se resolve tentando de novo — o
 * token e o papel do usuário não mudam entre uma tentativa e a próxima.
 *
 * Sem isto, o padrão do TanStack Query (`retry: 3` por padrão, aplicado a
 * QUALQUER erro que a `queryFn` lance — inclusive 401/403, não só falha de
 * rede) insiste três vezes contra uma parede que nunca abre, e cada
 * remontagem da página (troca de filtro, navegação) reinicia a contagem —
 * foi o que inundou o console quando `GET /api/v1/audit` estava devolvendo
 * 403 pro Super Admin (achado do Painel de Auditoria, 2026-09-22; a causa
 * raiz do 403 foi corrigida no backend, em `auth.middleware.ts`).
 */
function isRetryableError(error: unknown): boolean {
  const status = (error as { statusCode?: number } | undefined)?.statusCode
  if (typeof status === 'number' && status >= 400 && status < 500) return false
  return true
}

export function useAuditLogs(filter: AuditLogFilter) {
  return useQuery({
    queryKey: [KEY, filter],
    queryFn: () => auditService.list(filter),
    retry: (failureCount, error) => failureCount < 3 && isRetryableError(error),
  })
}
