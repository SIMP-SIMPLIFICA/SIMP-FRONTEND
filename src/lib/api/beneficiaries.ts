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

  // Dados de registro (Épico 4) — SEM máscara: ao contrário do CPF, nada aqui
  // é sensível, então alimentam o preenchimento automático do formulário de
  // diária sem restrição, do mesmo jeito que o departamento já fazia.
  registrationNumber?: string | null
  rg?: string | null
  jobTitle?: string | null
  lotacao?: string | null
  bankName?: string | null
  bankAgency?: string | null
  bankAccount?: string | null
}

/** Os 7 campos de registro opcionais — usados tanto para criar quanto para completar um cadastro. */
export interface BeneficiaryRegistryInput {
  registrationNumber?: string | null
  rg?: string | null
  jobTitle?: string | null
  lotacao?: string | null
  bankName?: string | null
  bankAgency?: string | null
  bankAccount?: string | null
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
   * existente em vez de erro, completando apenas os campos que ainda estavam
   * vazios — nunca sobrescreve o que já foi cadastrado. Por isso a interface
   * pode chamar sem antes verificar se o nome já está na lista.
   */
  create: (
    name: string,
    extra?: { cpf?: string | null; departmentId?: string | null } & BeneficiaryRegistryInput
  ) => api.post<Beneficiary>(BASE, { name, ...extra }).then(r => r.data),

  remove: (id: string) => api.delete<void>(`${BASE}/${id}`).then(r => r.data),
}
