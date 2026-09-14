import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type UpsertBudgetLawDTO, budgetLawService } from '@/lib/api/budget-laws'

const KEY = 'budget-laws'

export function useBudgetLaws(params: { departmentId: string; year?: number }) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => budgetLawService.list(params),
    enabled: !!params.departmentId,
  })
}

export function useUpsertBudgetLaw() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpsertBudgetLawDTO) => budgetLawService.upsert(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useDeleteBudgetLaw() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => budgetLawService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
