import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { covenantService } from '@/lib/api/covenants'
import type { CreateCovenantDTO, UpdateCovenantDTO, CovenantStatus } from '@/lib/api/covenants'

export function useCovenants(filters?: {
  page?: number; limit?: number; search?: string
  typeId?: string; status?: CovenantStatus
}) {
  return useQuery({
    queryKey: ['covenants', filters],
    queryFn:  () => covenantService.list(filters),
  })
}

export function useCreateCovenant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCovenantDTO) => covenantService.create(data),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['covenants'] }) },
  })
}

export function useUpdateCovenant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCovenantDTO }) =>
      covenantService.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['covenants'] }) },
  })
}

export function useDeleteCovenant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => covenantService.delete(id),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['covenants'] }) },
  })
}

// ── CovenantType hooks ────────────────────────────────────────────────────────

export function useCovenantTypes() {
  return useQuery({
    queryKey: ['covenant-types'],
    queryFn:  () => covenantService.listTypes(),
  })
}

export function useCreateCovenantType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => covenantService.createType(name),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['covenant-types'] }) },
  })
}

// ── Convenente hooks ──────────────────────────────────────────────────────────

export function useConvenentes() {
  return useQuery({
    queryKey: ['convenentes'],
    queryFn:  () => covenantService.listConvenentes(),
  })
}

export function useCreateConvenente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; cnpj?: string }) => covenantService.createConvenente(data),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['convenentes'] }) },
  })
}

// ── Concedente hooks ──────────────────────────────────────────────────────────

export function useConcedentes() {
  return useQuery({
    queryKey: ['concedentes'],
    queryFn:  () => covenantService.listConcedentes(),
  })
}

export function useCreateConcedente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; cnpj?: string }) => covenantService.createConcedente(data),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['concedentes'] }) },
  })
}

// ── Process link / unlink hooks ───────────────────────────────────────────────

export function useLinkProcess(covenantId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (processId: string) => covenantService.linkProcess(covenantId, processId),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['covenant', covenantId] }) },
  })
}

export function useUnlinkProcess(covenantId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (processId: string) => covenantService.unlinkProcess(covenantId, processId),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['covenant', covenantId] }) },
  })
}
