import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { departmentService, type CreateDepartmentDTO, type UpdateDepartmentDTO } from '@/lib/api/departments'

const KEY = 'departments'

export function useDepartments(params?: { page?: number; limit?: number; search?: string }) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn:  () => departmentService.list(params),
  })
}

export function useDepartmentOptions() {
  return useQuery({
    queryKey:  [KEY, 'options'],
    queryFn:   () => departmentService.list({ limit: 200 }),
    staleTime: 1000 * 60 * 5,
  })
}

/** Um setor, com CNPJ, ordenador e as contagens dos vínculos. */
export function useDepartment(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => departmentService.getById(id!),
    enabled: !!id,
  })
}

export function useDepartmentCouncils(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, id, 'councils'],
    queryFn: () => departmentService.listCouncils(id!),
    enabled: !!id,
  })
}

export function useDepartmentCovenants(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, id, 'covenants'],
    queryFn: () => departmentService.listCovenants(id!),
    enabled: !!id,
  })
}

export function useDepartmentVirtualProcesses(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, id, 'virtual-processes'],
    queryFn: () => departmentService.listVirtualProcesses(id!),
    enabled: !!id,
  })
}

export function useCreateDepartment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateDepartmentDTO) => departmentService.create(data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useUpdateDepartment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDepartmentDTO }) =>
      departmentService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useDeleteDepartment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => departmentService.remove(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useDepartmentMembers(deptId: string | null) {
  return useQuery({
    queryKey: [KEY, deptId, 'members'],
    queryFn:  () => departmentService.listMembers(deptId!),
    enabled:  !!deptId,
  })
}

export function useAddDepartmentMembers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, userIds }: { id: string; userIds: string[] }) =>
      departmentService.addMembers(id, userIds),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: [KEY, vars.id, 'members'] })
      qc.invalidateQueries({ queryKey: [KEY] })
    },
  })
}

export function useRemoveDepartmentMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ deptId, userId }: { deptId: string; userId: string }) =>
      departmentService.removeMember(deptId, userId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: [KEY, vars.deptId, 'members'] })
      qc.invalidateQueries({ queryKey: [KEY] })
    },
  })
}
