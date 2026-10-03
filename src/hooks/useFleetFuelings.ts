import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type CreateFleetFuelingDTO,
  type FleetFuelingListParams,
  type UpdateFleetFuelingDTO,
  fleetFuelingService,
} from '@/lib/api/fleet-fuelings'

const KEY = 'fleet-fuelings'

export function useFleetFuelings(params?: FleetFuelingListParams) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => fleetFuelingService.list(params),
  })
}

export function useFleetFueling(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'detail', id],
    queryFn: () => fleetFuelingService.getById(id!),
    enabled: Boolean(id),
  })
}

export function useCreateFleetFueling() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateFleetFuelingDTO) => fleetFuelingService.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useUpdateFleetFueling() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFleetFuelingDTO }) =>
      fleetFuelingService.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useDeleteFleetFueling() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => fleetFuelingService.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useIssueFleetFueling() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => fleetFuelingService.issue(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  })
}
