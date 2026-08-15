import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supportService } from '@/lib/api/support'
import { toast } from '@/hooks/use-toast'
import type { CreateSupportRequestDTO, SendMessageDTO, SupportStatus, SupportType } from '@/lib/api/support'

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useSupportRequests(params?: {
  status?: SupportStatus
  type?:   SupportType
  page?:   number
  limit?:  number
}) {
  return useQuery({
    queryKey: ['support-requests', params],
    queryFn:  () => supportService.list(params),
  })
}

export function useSupportMessages(requestId: string | null, isOpen = false) {
  return useQuery({
    queryKey:       ['support-messages', requestId],
    queryFn:        () => supportService.getMessages(requestId!),
    enabled:        !!requestId,
    refetchInterval: isOpen ? 3000 : false,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateSupportRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateSupportRequestDTO) => supportService.create(data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['support-requests'] }) },
    onError:    () => { toast({ title: 'Erro ao abrir chamado.', variant: 'destructive' }) },
  })
}

export function useSendSupportMessage(requestId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SendMessageDTO) => supportService.addMessage(requestId!, data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['support-messages', requestId] }) },
    onError:    () => { toast({ title: 'Erro ao enviar mensagem.', variant: 'destructive' }) },
  })
}

export function useUpdateSupportStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, status }: { requestId: string; status: SupportStatus }) =>
      supportService.updateStatus(requestId, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support-requests'] })
      qc.invalidateQueries({ queryKey: ['support-messages'] })
    },
    onError: () => { toast({ title: 'Erro ao atualizar status.', variant: 'destructive' }) },
  })
}

export function useSupportInsights() {
  return useQuery({
    queryKey: ['support-insights'],
    queryFn:  () => supportService.getInsights(),
  })
}
