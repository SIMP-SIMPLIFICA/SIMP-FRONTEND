import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { virtualProcessService } from '@/lib/api/virtual-processes'
import type { CreateVirtualProcessPayload } from '@/types/virtual-process'

export function useVirtualProcesses(_workspaceId?: string | undefined, filters?: {
  page?: number; limit?: number; search?: string; status?: string;
  secretaria?: string; category?: string; startDate?: string; endDate?: string
}) {
  return useQuery({
    queryKey: ['virtualProcesses', filters],
    queryFn: () => virtualProcessService.list(filters),
  })
}

export function useVirtualProcessDetail(id: string | null) {
  return useQuery({
    queryKey: ['virtualProcess', id],
    queryFn: () => virtualProcessService.getDetail(id!),
    enabled: !!id,
  })
}

export function useCreateVirtualProcess(_workspaceId?: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateVirtualProcessPayload) => virtualProcessService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtualProcesses'] })
    },
  })
}

export function useUpdateProcessStatus(_workspaceId?: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      virtualProcessService.updateStatus(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['virtualProcesses'] })
      queryClient.invalidateQueries({ queryKey: ['virtualProcess', id] })
    },
  })
}

export function useUpdateProcessCompany(_workspaceId?: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { companyName?: string; companyCnpj?: string } }) =>
      virtualProcessService.updateCompany(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['virtualProcesses'] })
      queryClient.invalidateQueries({ queryKey: ['virtualProcess', id] })
    },
  })
}

export function useDeleteVirtualProcess(_workspaceId?: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => virtualProcessService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtualProcesses'] })
    },
  })
}

export function useUploadProcessDocument(processId: string | null, _workspaceId?: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ file, tag, description }: { file: File; tag: string; description?: string }) => {
      if (!processId) throw new Error('Process ID required')
      return virtualProcessService.uploadDocument(processId, file, tag, description)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtualProcess', processId] })
    },
  })
}

export function useDeleteProcessDocument(processId: string | null, _workspaceId?: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (documentId: string) => {
      if (!processId) throw new Error('Process ID required')
      return virtualProcessService.deleteDocument(processId, documentId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtualProcess', processId] })
      queryClient.invalidateQueries({ queryKey: ['virtualProcesses'] })
    },
  })
}

export function useVirtualProcessCategories(_workspaceId?: string | undefined) {
  return useQuery({
    queryKey: ['virtualProcessCategories'],
    queryFn: () => virtualProcessService.listCategories(),
  })
}

export function useCreateVirtualProcessCategory(_workspaceId?: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string }) => virtualProcessService.createCategory(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['virtualProcessCategories'] }) },
  })
}

export function useUpdateVirtualProcessCategory(_workspaceId?: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string } }) =>
      virtualProcessService.updateCategory(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['virtualProcessCategories'] }) },
  })
}

export function useDeleteVirtualProcessCategory(_workspaceId?: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => virtualProcessService.deleteCategory(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['virtualProcessCategories'] }) },
  })
}

export function useVirtualProcessSources(_workspaceId?: string | undefined) {
  return useQuery({
    queryKey: ['virtualProcessSources'],
    queryFn: () => virtualProcessService.listSources(),
  })
}

export function useCreateVirtualProcessSource(_workspaceId?: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string }) => virtualProcessService.createSource(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['virtualProcessSources'] }),
  })
}

export function useUpdateVirtualProcessSource(_workspaceId?: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string } }) =>
      virtualProcessService.updateSource(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['virtualProcessSources'] }),
  })
}

export function useDeleteVirtualProcessSource(_workspaceId?: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => virtualProcessService.deleteSource(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['virtualProcessSources'] }),
  })
}

export function useVirtualProcessCompanies(_workspaceId?: string | undefined) {
  return useQuery({
    queryKey: ['virtualProcessCompanies'],
    queryFn: () => virtualProcessService.listCompanyItems(),
  })
}

export function useCreateVirtualProcessCompany(_workspaceId?: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; cnpj?: string | null }) => virtualProcessService.createCompanyItem(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['virtualProcessCompanies'] }),
  })
}

export function useUpdateVirtualProcessCompany(_workspaceId?: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; cnpj?: string | null } }) =>
      virtualProcessService.updateCompanyItem(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['virtualProcessCompanies'] }),
  })
}

export function useDeleteVirtualProcessCompany(_workspaceId?: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => virtualProcessService.deleteCompanyItem(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['virtualProcessCompanies'] }),
  })
}
