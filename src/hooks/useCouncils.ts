import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { councilService } from '@/lib/api/councils'
import { toast } from '@/hooks/use-toast'
import type {
  CreateCouncilDTO,
  UpdateCouncilDTO,
  AddMemberDTO,
  UpdateMemberDTO,
  CreateMeetingDTO,
  UpdateMeetingDTO,
  MeetingStatus,
  AddAgendaItemDTO,
  UpdateAgendaItemDTO,
  CouncilDocumentType,
  SaveAttendanceDTO,
} from '@/lib/api/councils'

// ─── Conselhos ────────────────────────────────────────────────────────────────

export function useCouncils(params?: {
  page?: number
  limit?: number
  search?: string
  isActive?: boolean
}) {
  return useQuery({
    queryKey: ['councils', params],
    queryFn:  () => councilService.list(params),
  })
}

export function useCouncil(id: string) {
  return useQuery({
    queryKey: ['council', id],
    queryFn:  () => councilService.get(id),
    enabled:  !!id,
  })
}

export function useCreateCouncil() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCouncilDTO) => councilService.create(data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['councils'] }) },
    onError:    () => { toast({ title: 'Erro ao criar conselho.', variant: 'destructive' }) },
  })
}

export function useUpdateCouncil(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateCouncilDTO) => councilService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['councils'] })
      qc.invalidateQueries({ queryKey: ['council', id] })
    },
    onError: () => { toast({ title: 'Erro ao atualizar conselho.', variant: 'destructive' }) },
  })
}

export function useDeleteCouncil() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => councilService.remove(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['councils'] }) },
    onError:    () => { toast({ title: 'Erro ao excluir conselho.', variant: 'destructive' }) },
  })
}

// ─── Membros ──────────────────────────────────────────────────────────────────

export function useCouncilMembers(councilId: string) {
  return useQuery({
    queryKey: ['council-members', councilId],
    queryFn:  () => councilService.listMembers(councilId),
    enabled:  !!councilId,
  })
}

export function useAddCouncilMember(councilId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AddMemberDTO) => councilService.addMember(councilId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['council-members', councilId] })
      qc.invalidateQueries({ queryKey: ['council', councilId] })
    },
  })
}

export function useUpdateCouncilMember(councilId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ membershipId, data }: { membershipId: string; data: UpdateMemberDTO }) =>
      councilService.updateMember(councilId, membershipId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['council-members', councilId] })
    },
    onError: () => { toast({ title: 'Erro ao atualizar membro.', variant: 'destructive' }) },
  })
}

export function useRemoveCouncilMember(councilId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (membershipId: string) => councilService.removeMember(councilId, membershipId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['council-members', councilId] })
      qc.invalidateQueries({ queryKey: ['council', councilId] })
    },
  })
}

// ─── Reuniões ─────────────────────────────────────────────────────────────────

export function useCouncilMeetings(councilId: string) {
  return useQuery({
    queryKey: ['meetings', councilId],
    queryFn:  () => councilService.listMeetings(councilId),
    enabled:  !!councilId,
  })
}

export function useCouncilMeeting(councilId: string, meetingId: string) {
  return useQuery({
    queryKey: ['meeting', councilId, meetingId],
    queryFn:  () => councilService.getMeeting(councilId, meetingId),
    enabled:  !!councilId && !!meetingId,
  })
}

export function useCreateMeeting(councilId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateMeetingDTO) => councilService.createMeeting(councilId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meetings', councilId] })
      qc.invalidateQueries({ queryKey: ['council', councilId] })
    },
    onError: () => { toast({ title: 'Erro ao criar reunião.', variant: 'destructive' }) },
  })
}

export function useUpdateMeeting(councilId: string, meetingId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateMeetingDTO) => councilService.updateMeeting(councilId, meetingId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meetings', councilId] })
      qc.invalidateQueries({ queryKey: ['meeting', councilId, meetingId] })
    },
    onError: () => { toast({ title: 'Erro ao atualizar reunião.', variant: 'destructive' }) },
  })
}

export function useDeleteMeeting(councilId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (meetingId: string) => councilService.deleteMeeting(councilId, meetingId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meetings', councilId] })
      qc.invalidateQueries({ queryKey: ['council', councilId] })
    },
    onError: () => { toast({ title: 'Erro ao excluir reunião.', variant: 'destructive' }) },
  })
}

export function useUpdateMeetingStatus(councilId: string, meetingId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (status: MeetingStatus) =>
      councilService.updateMeetingStatus(councilId, meetingId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meetings', councilId] })
      qc.invalidateQueries({ queryKey: ['meeting', councilId, meetingId] })
    },
    onError: () => { toast({ title: 'Erro ao alterar status da reunião.', variant: 'destructive' }) },
  })
}

// ─── Pautas ───────────────────────────────────────────────────────────────────

export function useAddAgendaItem(councilId: string, meetingId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AddAgendaItemDTO) =>
      councilService.addAgendaItem(councilId, meetingId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meeting', councilId, meetingId] })
    },
  })
}

export function useUpdateAgendaItem(councilId: string, meetingId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: UpdateAgendaItemDTO }) =>
      councilService.updateAgendaItem(councilId, meetingId, itemId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meeting', councilId, meetingId] })
    },
  })
}

export function useRemoveAgendaItem(councilId: string, meetingId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (itemId: string) =>
      councilService.removeAgendaItem(councilId, meetingId, itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meeting', councilId, meetingId] })
    },
  })
}

// ─── Presença ─────────────────────────────────────────────────────────────────

export function useMeetingAttendance(councilId: string, meetingId: string) {
  return useQuery({
    queryKey: ['attendance', councilId, meetingId],
    queryFn:  () => councilService.getAttendance(councilId, meetingId),
    enabled:  !!councilId && !!meetingId,
  })
}

export function useSaveAttendance(councilId: string, meetingId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SaveAttendanceDTO) =>
      councilService.saveAttendance(councilId, meetingId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', councilId, meetingId] })
    },
    onError: () => { toast({ title: 'Erro ao salvar lista de presença.', variant: 'destructive' }) },
  })
}

// ─── Documentos ───────────────────────────────────────────────────────────────

export function useMeetingDocuments(councilId: string, meetingId: string) {
  return useQuery({
    queryKey: ['documents', councilId, meetingId],
    queryFn:  () => councilService.listDocuments(councilId, meetingId),
    enabled:  !!councilId && !!meetingId,
  })
}

export function useUploadDocument(councilId: string, meetingId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      file,
      fields,
    }: {
      file: File
      fields?: { title?: string; documentType?: CouncilDocumentType }
    }) => councilService.uploadDocument(councilId, meetingId, file, fields),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents', councilId, meetingId] })
      qc.invalidateQueries({ queryKey: ['meeting', councilId, meetingId] })
    },
  })
}

export function useDeleteDocument(councilId: string, meetingId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (docId: string) => councilService.deleteDocument(councilId, meetingId, docId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents', councilId, meetingId] })
      qc.invalidateQueries({ queryKey: ['meeting', councilId, meetingId] })
    },
    onError: () => { toast({ title: 'Erro ao excluir documento.', variant: 'destructive' }) },
  })
}

export function useDocumentDownload(councilId: string, meetingId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (docId: string) =>
      councilService.getDocumentDownloadUrl(councilId, meetingId, docId),
    onSuccess: (data) => {
      // Open signed URL in a new tab — browser handles the download
      window.open(data.url, '_blank', 'noopener,noreferrer')
      // Ensure the query cache is fresh for subsequent status checks
      qc.invalidateQueries({ queryKey: ['documents', councilId, meetingId] })
    },
    onError: () => { toast({ title: 'Erro ao gerar link de download.', variant: 'destructive' }) },
  })
}
