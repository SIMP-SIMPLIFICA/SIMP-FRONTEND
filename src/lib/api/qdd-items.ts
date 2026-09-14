import { api } from '../api'

/**
 * QDD — Quadro de Detalhamento da Despesa (Épico 4, Fase 2).
 *
 * Os nomes dos campos ficam em português (`ficha`, `fonte`, `valorOrcado`)
 * porque são termos do domínio orçamentário público, sem tradução corrente —
 * espelham o contrato do backend, que segue a mesma convenção (Princípio III).
 */

export interface QddItem {
  id: string
  organizationId: string
  departmentId: string
  department?: { id: string; name: string; code: string }
  year: number
  ficha: string
  fonte: string
  projetoAtividade: string
  naturezaDespesa: string
  /** Decimal do Prisma chega como string — usar `parseBRL`/`Number()` antes de calcular. */
  valorOrcado: string
  createdAt: string
  updatedAt: string
}

export interface CreateQddItemDTO {
  departmentId: string
  year: number
  ficha: string
  fonte: string
  projetoAtividade: string
  naturezaDespesa: string
  valorOrcado: number
}

/** O departamento não muda na edição — mover a ficha de setor reescreveria o
 *  lastro de despesas já imputadas. Para trocar, exclui-se e recadastra-se. */
export type UpdateQddItemDTO = Partial<Omit<CreateQddItemDTO, 'departmentId'>>

const BASE = '/qdd-items'

export const qddItemService = {
  list: (params?: { departmentId?: string; year?: number }) => {
    const query = new URLSearchParams()
    if (params?.departmentId) query.set('departmentId', params.departmentId)
    if (params?.year) query.set('year', String(params.year))
    const qs = query.toString() ? `?${query.toString()}` : ''
    return api.get<QddItem[]>(`${BASE}${qs}`).then(r => r.data)
  },

  create: (data: CreateQddItemDTO) => api.post<QddItem>(BASE, data).then(r => r.data),

  update: (id: string, data: UpdateQddItemDTO) =>
    api.patch<QddItem>(`${BASE}/${id}`, data).then(r => r.data),

  remove: (id: string) => api.delete<void>(`${BASE}/${id}`).then(r => r.data),
}
