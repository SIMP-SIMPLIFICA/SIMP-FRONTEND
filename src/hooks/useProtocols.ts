import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { protocolService } from '@/lib/api/protocols'
import type { DocumentCategory, DocumentStatus, GenerateDocumentDTO, UpdateDocumentStatusDTO } from '@/lib/api/protocols'

export function useProtocols(params?: {
  page?: number
  limit?: number
  search?: string
  documentCategory?: DocumentCategory
  status?: DocumentStatus
  year?: number
  month?: number
  sector?: string
}) {
  return useQuery({
    queryKey: ['protocols', params],
    queryFn: () => protocolService.list(params),
  })
}

export function useGenerateProtocol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: GenerateDocumentDTO) => protocolService.generate(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['protocols'] }) },
  })
}

export function useUpdateProtocolStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDocumentStatusDTO }) =>
      protocolService.updateStatus(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['protocols'] }) },
  })
}

export function useDeleteProtocol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => protocolService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['protocols'] }) },
  })
}
