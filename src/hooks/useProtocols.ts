import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { protocolService } from '@/lib/api/protocols'
import { libraryService } from '@/lib/api/library'
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

/**
 * Anexa um PDF a um protocolo: sobe o arquivo para a Biblioteca e vincula o
 * documento resultante ao protocolo, marcando-o como EMITIDO.
 *
 * Fonte única dos dois pontos de uso (tela de sucesso da geração e ação
 * "Anexar" na listagem) — evita que as duas telas divirjam.
 */
export function useAttachProtocolDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ protocol, file }: { protocol: { id: string; formattedNumber: string }; file: File }) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', protocol.formattedNumber)
      formData.append('accessLevel', '1')

      const uploaded = await libraryService.upload(formData)

      return protocolService.updateStatus(protocol.id, {
        status: 'EMITIDO',
        libraryDocumentId: uploaded.id,
      })
    },
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
