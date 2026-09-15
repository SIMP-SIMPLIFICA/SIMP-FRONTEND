import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type CreateQddItemDTO,
  type UpdateQddItemDTO,
  qddItemService,
} from '@/lib/api/qdd-items'

const KEY = 'qdd-items'

export function useQddItems(params: { departmentId?: string; year?: number }) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => qddItemService.list(params),
    enabled: !!params.departmentId,
  })
}

export function useCreateQddItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateQddItemDTO) => qddItemService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useUpdateQddItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateQddItemDTO }) =>
      qddItemService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useDeleteQddItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => qddItemService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

/** Histórico de suplementação/redução do valor orçado (Épico 8, FR-013). */
export function useQddItemHistory(id: string | null) {
  return useQuery({
    queryKey: [KEY, 'history', id],
    queryFn: () => qddItemService.getHistory(id!),
    enabled: Boolean(id),
  })
}
