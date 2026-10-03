import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type AccountForDTO,
  type CreateDailyAllowanceDTO,
  type DailyAllowanceListParams,
  type UpdateDailyAllowanceDTO,
  dailyAllowanceService,
} from '@/lib/api/daily-allowances'

const KEY = 'daily-allowances'

export function useDailyAllowances(params?: DailyAllowanceListParams) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => dailyAllowanceService.list(params),
  })
}

export function useDailyAllowance(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'detail', id],
    queryFn: () => dailyAllowanceService.getById(id!),
    enabled: Boolean(id),
  })
}

export function useCreateDailyAllowance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateDailyAllowanceDTO) => dailyAllowanceService.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useUpdateDailyAllowance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDailyAllowanceDTO }) =>
      dailyAllowanceService.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useDeleteDailyAllowance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => dailyAllowanceService.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  })
}

/**
 * Emissão do documento oficial.
 *
 * Invalida o cache porque a emissão muda o registro de forma visível — passa a
 * ter hash e some do estado editável. Sem a invalidação, a tela continuaria
 * oferecendo "Editar" num documento já congelado.
 */
export function useIssueDailyAllowance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => dailyAllowanceService.issue(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  })
}

/**
 * Prestação de contas (Anexo II, Épico 8).
 *
 * Mesma lógica de invalidação da emissão: o registro muda de status e ganha
 * hash próprio — a tela precisa parar de oferecer "Prestar Contas" assim que
 * a mutação volta.
 */
export function useAccountForDailyAllowance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AccountForDTO }) =>
      dailyAllowanceService.accountFor(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  })
}
