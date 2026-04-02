import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { virtualProcessService } from '@/lib/api/virtual-processes'
import { useWorkspaces } from './useWorkspaces'
import type { CreateVirtualProcessPayload } from '@/types/virtual-process'

function useWorkspaceId(workspaceId: string | undefined) {
  const { data: workspaces } = useWorkspaces()
  return workspaceId || workspaces?.[0]?.id
}

export function useVirtualProcesses(workspaceId: string | undefined, filters?: {
  page?: number; limit?: number; search?: string; status?: string;
  secretaria?: string; category?: string; startDate?: string; endDate?: string
}) {
  const resolvedId = useWorkspaceId(workspaceId)
  return useQuery({
    queryKey: ['virtualProcesses', resolvedId, filters],
    queryFn: () => {
      if (!resolvedId) throw new Error('Workspace ID required')
      return virtualProcessService.list(resolvedId, filters)
    },
    enabled: !!resolvedId,
  })
}

export function useVirtualProcessDetail(id: string | null) {
  return useQuery({
    queryKey: ['virtualProcess', id],
    queryFn: () => virtualProcessService.getDetail(id!),
    enabled: !!id,
  })
}

export function useCreateVirtualProcess(workspaceId: string | undefined) {
  const queryClient = useQueryClient()
  const resolvedId = useWorkspaceId(workspaceId)

  return useMutation({
    mutationFn: (data: Omit<CreateVirtualProcessPayload, 'workspaceId'>) => {
      if (!resolvedId) throw new Error('Workspace ID required')
      return virtualProcessService.create(resolvedId, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtualProcesses', resolvedId] })
    },
  })
}

export function useUpdateProcessStatus(workspaceId: string | undefined) {
  const queryClient = useQueryClient()
  const resolvedId = useWorkspaceId(workspaceId)

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      virtualProcessService.updateStatus(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['virtualProcesses', resolvedId] })
      queryClient.invalidateQueries({ queryKey: ['virtualProcess', id] })
    },
  })
}

export function useUpdateProcessCompany(workspaceId: string | undefined) {
  const queryClient = useQueryClient()
  const resolvedId = useWorkspaceId(workspaceId)

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { companyName?: string; companyCnpj?: string } }) =>
      virtualProcessService.updateCompany(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['virtualProcesses', resolvedId] })
      queryClient.invalidateQueries({ queryKey: ['virtualProcess', id] })
    },
  })
}

export function useDeleteVirtualProcess(workspaceId: string | undefined) {
  const queryClient = useQueryClient()
  const resolvedId = useWorkspaceId(workspaceId)

  return useMutation({
    mutationFn: (id: string) => virtualProcessService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtualProcesses', resolvedId] })
    },
  })
}

export function useUploadProcessDocument(processId: string | null, _workspaceId: string | undefined) {
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

export function useDeleteProcessDocument(processId: string | null, _workspaceId: string | undefined) {
  const queryClient = useQueryClient()
  const resolvedId = useWorkspaceId(undefined)

  return useMutation({
    mutationFn: (documentId: string) => {
      if (!processId) throw new Error('Process ID required')
      return virtualProcessService.deleteDocument(processId, documentId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtualProcess', processId] })
      queryClient.invalidateQueries({ queryKey: ['virtualProcesses', resolvedId] })
    },
  })
}

export function useVirtualProcessCategories(workspaceId: string | undefined) {
  const resolvedId = useWorkspaceId(workspaceId)
  return useQuery({
    queryKey: ['virtualProcessCategories', resolvedId],
    queryFn: () => {
      if (!resolvedId) throw new Error('Workspace ID required')
      return virtualProcessService.listCategories(resolvedId)
    },
    enabled: !!resolvedId,
  })
}

export function useCreateVirtualProcessCategory(workspaceId: string | undefined) {
  const queryClient = useQueryClient()
  const resolvedId = useWorkspaceId(workspaceId)

  return useMutation({
    mutationFn: (data: { name: string }) => {
      if (!resolvedId) throw new Error('Workspace ID required')
      return virtualProcessService.createCategory(resolvedId, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtualProcessCategories', resolvedId] })
    },
  })
}

export function useUpdateVirtualProcessCategory(workspaceId: string | undefined) {
  const queryClient = useQueryClient()
  const resolvedId = useWorkspaceId(workspaceId)

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string } }) =>
      virtualProcessService.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtualProcessCategories', resolvedId] })
    },
  })
}

export function useVirtualProcessSources(workspaceId: string | undefined) {
  const resolvedId = useWorkspaceId(workspaceId)
  return useQuery({
    queryKey: ['virtualProcessSources', resolvedId],
    queryFn: () => {
      if (!resolvedId) throw new Error('Workspace ID required')
      return virtualProcessService.listSources(resolvedId)
    },
    enabled: !!resolvedId,
  })
}

export function useCreateVirtualProcessSource(workspaceId: string | undefined) {
  const queryClient = useQueryClient()
  const resolvedId = useWorkspaceId(workspaceId)
  return useMutation({
    mutationFn: (data: { name: string }) => {
      if (!resolvedId) throw new Error('Workspace ID required')
      return virtualProcessService.createSource(resolvedId, data)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['virtualProcessSources', resolvedId] }),
  })
}

export function useUpdateVirtualProcessSource(workspaceId: string | undefined) {
  const queryClient = useQueryClient()
  const resolvedId = useWorkspaceId(workspaceId)
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string } }) =>
      virtualProcessService.updateSource(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['virtualProcessSources', resolvedId] }),
  })
}

export function useDeleteVirtualProcessSource(workspaceId: string | undefined) {
  const queryClient = useQueryClient()
  const resolvedId = useWorkspaceId(workspaceId)
  return useMutation({
    mutationFn: (id: string) => virtualProcessService.deleteSource(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['virtualProcessSources', resolvedId] }),
  })
}

export function useVirtualProcessCompanies(workspaceId: string | undefined) {
  const resolvedId = useWorkspaceId(workspaceId)
  return useQuery({
    queryKey: ['virtualProcessCompanies', resolvedId],
    queryFn: () => {
      if (!resolvedId) throw new Error('Workspace ID required')
      return virtualProcessService.listCompanyItems(resolvedId)
    },
    enabled: !!resolvedId,
  })
}

export function useCreateVirtualProcessCompany(workspaceId: string | undefined) {
  const queryClient = useQueryClient()
  const resolvedId = useWorkspaceId(workspaceId)
  return useMutation({
    mutationFn: (data: { name: string; cnpj?: string | null }) => {
      if (!resolvedId) throw new Error('Workspace ID required')
      return virtualProcessService.createCompanyItem(resolvedId, data)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['virtualProcessCompanies', resolvedId] }),
  })
}

export function useUpdateVirtualProcessCompany(workspaceId: string | undefined) {
  const queryClient = useQueryClient()
  const resolvedId = useWorkspaceId(workspaceId)
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; cnpj?: string | null } }) =>
      virtualProcessService.updateCompanyItem(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['virtualProcessCompanies', resolvedId] }),
  })
}

export function useDeleteVirtualProcessCompany(workspaceId: string | undefined) {
  const queryClient = useQueryClient()
  const resolvedId = useWorkspaceId(workspaceId)
  return useMutation({
    mutationFn: (id: string) => virtualProcessService.deleteCompanyItem(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['virtualProcessCompanies', resolvedId] }),
  })
}

export function useDeleteVirtualProcessCategory(workspaceId: string | undefined) {
  const queryClient = useQueryClient()
  const resolvedId = useWorkspaceId(workspaceId)

  return useMutation({
    mutationFn: (id: string) => virtualProcessService.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtualProcessCategories', resolvedId] })
    },
  })
}
