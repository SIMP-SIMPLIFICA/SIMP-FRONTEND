import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

/**
 * Usuários da organização, para preencher seletores.
 *
 * Usado pelo campo "Secretário / Chefe do Setor" — é dele que sai o Ordenador
 * de Despesa impresso nos documentos.
 */

export interface OrganizationUser {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
}

/** Nome legível, com o e-mail como último recurso. */
export function formatUserLabel(user: OrganizationUser): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  return name || user.email
}

export function useOrganizationUsers() {
  return useQuery({
    queryKey: ['organization-users', 'options'],
    queryFn: async () => {
      // Limite alto e sem busca: o seletor é uma lista fechada e curta numa
      // prefeitura. Paginar aqui esconderia servidores do fim do alfabeto.
      const res = await api.get<{ data: OrganizationUser[] }>('/api/v1/users?limit=200')
      return res.data.data ?? []
    },
    staleTime: 1000 * 60 * 5,
  })
}
