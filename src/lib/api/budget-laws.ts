import { api } from '../api'

/**
 * Leis Orçamentárias — LOA, PPA e LDO (Épico 4, Fase 2).
 *
 * Um registro por setor, tipo e exercício: o backend faz UPSERT — reenviar o
 * mesmo (departmentId, type, year) atualiza em vez de duplicar. A tela reflete
 * isso apresentando um card por tipo, sem noção separada de criar/editar.
 */

export type BudgetLawType = 'LOA' | 'PPA' | 'LDO'

export interface BudgetLaw {
  id: string
  organizationId: string
  departmentId: string
  department?: { id: string; name: string; code: string }
  type: BudgetLawType
  year: number
  lawNumber: string | null
  publishedAt: string | null
  details: string | null
  createdAt: string
  updatedAt: string
}

export interface UpsertBudgetLawDTO {
  departmentId: string
  type: BudgetLawType
  year: number
  lawNumber?: string | null
  publishedAt?: string | null
  details?: string | null
}

const BASE = '/budget-laws'

export const budgetLawService = {
  list: (params: { departmentId: string; year?: number }) => {
    const query = new URLSearchParams({ departmentId: params.departmentId })
    if (params.year) query.set('year', String(params.year))
    return api.get<BudgetLaw[]>(`${BASE}?${query.toString()}`).then(r => r.data)
  },

  upsert: (data: UpsertBudgetLawDTO) => api.post<BudgetLaw>(BASE, data).then(r => r.data),

  remove: (id: string) => api.delete<void>(`${BASE}/${id}`).then(r => r.data),
}
