import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type DriverInput,
  type DriverListParams,
  type VehicleInput,
  type VehicleListParams,
  fleetService,
} from '@/lib/api/fleet'

const VEHICLES = 'fleet-vehicles'
const DRIVERS = 'fleet-drivers'

export function useFleetVehicles(params?: VehicleListParams) {
  return useQuery({
    queryKey: [VEHICLES, params],
    queryFn: () => fleetService.listVehicles(params),
  })
}

export function useCreateFleetVehicle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: VehicleInput) => fleetService.createVehicle(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [VEHICLES] }),
  })
}

export function useUpdateFleetVehicle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<VehicleInput, 'odometerKm'>> }) =>
      fleetService.updateVehicle(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [VEHICLES] }),
  })
}

export function useDeleteFleetVehicle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => fleetService.removeVehicle(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [VEHICLES] }),
  })
}

export function useFleetDrivers(params?: DriverListParams) {
  return useQuery({
    queryKey: [DRIVERS, params],
    queryFn: () => fleetService.listDrivers(params),
  })
}

export function useCreateFleetDriver() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: DriverInput) => fleetService.createDriver(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [DRIVERS] }),
  })
}

export function useUpdateFleetDriver() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DriverInput> }) => fleetService.updateDriver(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [DRIVERS] }),
  })
}

export function useDeleteFleetDriver() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => fleetService.removeDriver(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [DRIVERS] }),
  })
}
