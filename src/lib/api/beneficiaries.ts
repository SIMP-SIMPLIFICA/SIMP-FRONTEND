import { api } from '../api'

/**
 * Cadastro de beneficiários de diárias.
 *
 * Alimenta o autocomplete do formulário. O nome escolhido é enviado como TEXTO
 * na diária — o cadastro não é a fonte de verdade do documento emitido, apenas
 * a lista de sugestões.
 */

export interface Beneficiary {
  id: string
  name: string
  /** JÁ MASCARADO pela API (`***.123.456-**`). O número inteiro nunca sai do backend. */
  cpf?: string | null
  /** Lotação do servidor — alimenta a sugestão de setor no formulário de diária. */
  departmentId?: string | null
  department?: { id: string; name: string; code: string } | null
  createdAt: string
}

const BASE = '/api/v1/beneficiaries'

export const beneficiaryService = {
  list: (search?: string) => {
    const query = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''
    return api.get<Beneficiary[]>(`${BASE}${query}`).then(r => r.data)
  },

  /**
   * Cria o beneficiário.
   *
   * É idempotente no backend: reenviar um nome já cadastrado devolve o registro
   * existente em vez de erro. Por isso a interface pode chamar sem antes
   * verificar se o nome já está na lista.
   */
  create: (name: string, extra?: { cpf?: string | null; departmentId?: string | null }) =>
    api.post<Beneficiary>(BASE, { name, ...extra }).then(r => r.data),

  remove: (id: string) => api.delete<void>(`${BASE}/${id}`).then(r => r.data),
}
