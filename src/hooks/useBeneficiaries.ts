import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { beneficiaryService } from '@/lib/api/beneficiaries'

const KEY = 'beneficiaries'

/**
 * Lista de beneficiários da organização.
 *
 * Carrega a lista INTEIRA e filtra no cliente, em vez de consultar o servidor a
 * cada tecla. O universo é pequeno — os servidores de uma prefeitura — e a
 * filtragem local dá resposta instantânea enquanto se digita, sem inundar a API
 * de requisições. Se a lista crescer a ponto de incomodar, a busca por termo já
 * existe no backend.
 */
export function useBeneficiaries(enabled = true) {
  return useQuery({
    queryKey: [KEY],
    queryFn: () => beneficiaryService.list(),
    enabled,
    staleTime: 60_000,
  })
}

export function useCreateBeneficiary() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => beneficiaryService.create(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useDeleteBeneficiary() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => beneficiaryService.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  })
}
