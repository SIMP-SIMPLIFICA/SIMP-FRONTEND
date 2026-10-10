import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type ContractInput,
  type ContractListParams,
  type FuelingInput,
  type FuelingListParams,
  fleetFuelingService,
} from '@/lib/api/fleet-fueling'

const FUELINGS = 'fleet-fuelings'
const CONTRACTS = 'fleet-contracts'

// ─── Contratos ───────────────────────────────────────────────────────────────

export function useFleetContracts(params?: ContractListParams) {
  return useQuery({ queryKey: [CONTRACTS, params], queryFn: () => fleetFuelingService.listContracts(params) })
}

export function useCreateFleetContract() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ContractInput) => fleetFuelingService.createContract(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CONTRACTS] }),
  })
}

export function useUpdateFleetContract() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ContractInput> }) => fleetFuelingService.updateContract(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CONTRACTS] }),
  })
}

export function useDeleteFleetContract() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => fleetFuelingService.removeContract(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CONTRACTS] }),
  })
}

// ─── Autorizações ────────────────────────────────────────────────────────────

export function useFleetFuelings(params?: FuelingListParams) {
  return useQuery({ queryKey: [FUELINGS, params], queryFn: () => fleetFuelingService.list(params) })
}

export function useFleetFueling(id: string | undefined) {
  return useQuery({
    queryKey: [FUELINGS, 'detail', id],
    queryFn: () => fleetFuelingService.get(id as string),
    enabled: Boolean(id),
  })
}

export function useFuelingDepartments() {
  return useQuery({
    queryKey: [FUELINGS, 'departments'],
    queryFn: () => fleetFuelingService.departments(),
    staleTime: 5 * 60_000,
  })
}

export function useFuelingOptions(departmentId: string | undefined) {
  return useQuery({
    queryKey: [FUELINGS, 'options', departmentId],
    queryFn: () => fleetFuelingService.options(departmentId as string),
    enabled: Boolean(departmentId),
  })
}

export function useFuelingSuggestions(departmentId: string | undefined, vehicleId: string | undefined) {
  return useQuery({
    queryKey: [FUELINGS, 'suggestions', departmentId, vehicleId],
    queryFn: () => fleetFuelingService.suggestions(departmentId as string, vehicleId as string),
    enabled: Boolean(departmentId && vehicleId),
  })
}

/** Toda escrita invalida autorizações E contratos (o saldo do contrato muda). */
function useInvalidateAll() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: [FUELINGS] }),
      queryClient.invalidateQueries({ queryKey: [CONTRACTS] }),
    ])
}

export function useCreateFleetFueling() {
  const invalidate = useInvalidateAll()
  return useMutation({ mutationFn: (data: FuelingInput) => fleetFuelingService.create(data), onSuccess: invalidate })
}

export function useUpdateFleetFueling() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FuelingInput> }) => fleetFuelingService.update(id, data),
    onSuccess: invalidate,
  })
}

export function useDeleteFleetFueling() {
  const invalidate = useInvalidateAll()
  return useMutation({ mutationFn: (id: string) => fleetFuelingService.remove(id), onSuccess: invalidate })
}

export function useIssueFleetFueling() {
  const invalidate = useInvalidateAll()
  return useMutation({ mutationFn: (id: string) => fleetFuelingService.issue(id), onSuccess: invalidate })
}

export function useCancelFleetFueling() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => fleetFuelingService.cancel(id, reason),
    onSuccess: invalidate,
  })
}
