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
  create: (name: string) => api.post<Beneficiary>(BASE, { name }).then(r => r.data),

  remove: (id: string) => api.delete<void>(`${BASE}/${id}`).then(r => r.data),
}
