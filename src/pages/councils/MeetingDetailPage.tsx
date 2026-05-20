import { useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeft,
  AlertTriangle,
  MapPin,
  CalendarDays,
  Users,
  Download,
  PenLine,
  Loader2,
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  useCouncilMeeting,
  useMeetingDocuments,
  useDocumentDownload,
  useUpdateMeetingStatus,
} from '@/hooks/useCouncils'
import { useMe } from '@/hooks/useMe'
import { hasAnyPermission } from '@/lib/permissions'
import { toast } from '@/hooks/use-toast'
import { initiateGovBrSigning } from '@/hooks/useGovBrSigning'
import { AgendaItemsEditor } from '@/components/councils/AgendaItemsEditor'
import { MeetingAttendanceList } from '@/components/councils/MeetingAttendanceList'
import { UploadDocumentModal } from '@/components/councils/UploadDocumentModal'
import { SignatureStatusBadge } from '@/components/councils/SignatureStatusBadge'
import type {
  MeetingStatus,
  CouncilDocumentType,
  CouncilDocument,
} from '@/lib/api/councils'

// ── Label maps ────────────────────────────────────────────────────────────────

const MEETING_STATUS_CONFIG: Record<MeetingStatus, { label: string; className: string }> = {
  AGENDADA:     { label: 'Agendada',     className: 'bg-amber-100   text-amber-700'   },
  EM_ANDAMENTO: { label: 'Em Andamento', className: 'bg-blue-100    text-blue-700'    },
  CONCLUIDA:    { label: 'Concluída',    className: 'bg-emerald-100  text-emerald-700' },
  CANCELADA:    { label: 'Cancelada',    className: 'bg-slate-100    text-slate-500'   },
}

const DOC_TYPE_LABELS: Record<CouncilDocumentType, string> = {
  ATA:        'Ata',
  RESOLUCAO:  'Resolução',
  CONVOCACAO: 'Convocação',
  PARECER:    'Parecer',
  OUTROS:     'Outros',
}

// ── Utility ───────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  return format(new Date(iso), 'dd/MM/yyyy HH:mm', { locale: ptBR })
}

function formatFileSize(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

// ── Badge helpers ─────────────────────────────────────────────────────────────

function MeetingStatusBadge({ status }: { status: MeetingStatus }) {
  const cfg = MEETING_STATUS_CONFIG[status] ?? { label: status, className: 'bg-slate-100 text-slate-600' }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

// ── Skeleton helpers ──────────────────────────────────────────────────────────

function AgendaRowSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-slate-100">
      <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />
      <div className="flex-1 flex flex-col gap-1.5">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}

function DocumentRowSkeleton() {
  return (
    <tr className="border-b border-slate-100">
      <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
      <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-24" /></td>
      <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-20" /></td>
      <td className="px-4 py-3"><Skeleton className="h-5 w-18 rounded-full" /></td>
      <td className="px-4 py-3"><Skeleton className="h-8 w-24" /></td>
    </tr>
  )
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4 max-w-screen-2xl mx-auto w-full px-6 py-4">
      {/* Header card skeleton */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 flex flex-col gap-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-6 w-1/2" />
        <div className="flex gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-4 w-3/4" />
      </div>
      {/* Agenda section skeleton */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-8 w-32 rounded-md" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => <AgendaRowSkeleton key={i} />)}
      </div>
      {/* Documents section skeleton */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-36 rounded-md" />
        </div>
        <table className="w-full text-sm">
          <tbody>
            {Array.from({ length: 3 }).map((_, i) => <DocumentRowSkeleton key={i} />)}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Documents section ─────────────────────────────────────────────────────────

interface DocumentsSectionProps {
  documents: CouncilDocument[]
  isLoading: boolean
  councilId: string
  meetingId: string
  onUpload: () => void
  returnPath: string
  canWrite: boolean
  canSign: boolean
}

function DocumentsSection({
  documents,
  isLoading,
  councilId,
  meetingId,
  onUpload,
  returnPath,
  canWrite,
  canSign,
}: DocumentsSectionProps) {
  const [pendingDocId, setPendingDocId] = useState<string | null>(null)
  const [signingDocId, setSigningDocId] = useState<string | null>(null)
  const documentDownload = useDocumentDownload(councilId, meetingId)

  async function handleSign(docId: string) {
    setSigningDocId(docId)
    try {
      await initiateGovBrSigning(docId, returnPath)
    } catch {
      toast({ title: 'Erro ao iniciar assinatura Gov.br.', variant: 'destructive' })
      setSigningDocId(null)
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      {/* Section header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
        <h2 className="text-sm font-semibold text-slate-700">Documentos</h2>
        {canWrite && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onUpload}>
            <Upload className="h-4 w-4" />
            Upload Documento
          </Button>
        )}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-3 text-left font-medium text-slate-600">Tipo</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Nome</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Tamanho</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600 hidden md:table-cell">Enviado por</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600 hidden lg:table-cell">SHA-256</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Assinatura</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Ações</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <DocumentRowSkeleton key={i} />)
          ) : documents.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-16 text-center text-slate-400 text-sm">
                Nenhum documento enviado.
              </td>
            </tr>
          ) : (
            documents.map((doc) => {
              const latestSignature =
                doc.signatureRequests && doc.signatureRequests.length > 0
                  ? doc.signatureRequests[doc.signatureRequests.length - 1]
                  : null

              return (
                <tr
                  key={doc.id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {DOC_TYPE_LABELS[doc.documentType] ?? doc.documentType}
                  </td>
                  <td className="px-4 py-3 text-slate-800 font-medium max-w-[200px]">
                    <span className="block truncate">{doc.title || doc.fileName}</span>
                    <span className="block text-xs text-slate-400 truncate">{doc.fileName}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {formatFileSize(doc.fileSize)}
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap hidden md:table-cell">
                    {doc.uploadedBy
                      ? `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-400 font-mono text-xs hidden lg:table-cell whitespace-nowrap">
                    {doc.sha256Hash ? `${doc.sha256Hash.slice(0, 8)}...` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {latestSignature ? (
                      <SignatureStatusBadge status={latestSignature.status} />
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 h-8 px-2.5"
                        onClick={() => {
                          setPendingDocId(doc.id)
                          documentDownload.mutate(doc.id, {
                            onSettled: () => setPendingDocId(null),
                          })
                        }}
                        disabled={pendingDocId === doc.id && documentDownload.isPending}
                        title="Baixar documento"
                      >
                        {pendingDocId === doc.id && documentDownload.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      {canSign && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 h-8 px-2.5"
                          onClick={() => handleSign(doc.id)}
                          disabled={signingDocId === doc.id}
                          title="Assinar via Gov.br"
                        >
                          {signingDocId === doc.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <PenLine className="h-3.5 w-3.5" />
                          )}
                          <span className="hidden sm:inline text-xs">Assinar Gov.br</span>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MeetingDetailPage() {
  const { id, meetingId } = useParams<{ id: string; meetingId: string }>()
  const navigate  = useNavigate()
  const location  = useLocation()

  const councilId = id        ?? ''
  const mId       = meetingId ?? ''

  const [showUpload, setShowUpload] = useState(false)

  const { data: me } = useMe()
  const canWrite = hasAnyPermission(me, ['councils:write', 'councils:admin'])
  const canSign  = hasAnyPermission(me, ['councils:sign'])

  const { data: meeting, isLoading, isError } = useCouncilMeeting(councilId, mId)
  const { data: documents = [], isLoading: docsLoading } = useMeetingDocuments(councilId, mId)
  const updateStatus = useUpdateMeetingStatus(councilId, mId)

  if (isLoading) {
    return <PageSkeleton />
  }

  if (isError || !meeting) {
    return (
      <div className="flex flex-col h-full max-w-screen-2xl mx-auto w-full px-6 py-4">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-slate-500 hover:text-slate-900 -ml-2 mb-4 self-start"
          onClick={() => navigate(`/conselhos/${councilId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
          Reuniões
        </Button>
        <div className="flex flex-col items-center justify-center gap-2 py-20 text-slate-400">
          <AlertTriangle className="h-8 w-8 text-red-400" />
          <p className="text-sm">Falha ao carregar dados da reunião.</p>
        </div>
      </div>
    )
  }

  const agendaItems = meeting.agendaItems ?? []

  return (
    <div className="flex flex-col gap-4 max-w-screen-2xl mx-auto w-full px-6 py-4">

      {/* ── 1. Header card ── */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="p-5">
          {/* Back button */}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-slate-500 hover:text-slate-900 -ml-2 mb-3"
            onClick={() => navigate(`/conselhos/${councilId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
            Reuniões
          </Button>

          {/* Title + status */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <h1 className="text-xl font-semibold text-slate-900">{meeting.title}</h1>
            <MeetingStatusBadge status={meeting.status} />
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
            {meeting.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
                {meeting.location}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-slate-400 flex-shrink-0" />
              {formatDateTime(meeting.scheduledAt)}
            </span>
            {meeting.quorum !== null && (
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4 text-slate-400 flex-shrink-0" />
                {meeting.quorum} presentes
              </span>
            )}
          </div>

          {/* Description */}
          {meeting.description && (
            <p className="mt-3 text-sm text-slate-500">{meeting.description}</p>
          )}

          {/* Status transition */}
          {canWrite && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs text-slate-500">Alterar status:</span>
              <Select
                value={meeting.status}
                onValueChange={(v) =>
                  updateStatus.mutate(v as MeetingStatus, {
                    onSuccess: () => toast({ title: 'Status da reunião atualizado.' }),
                    onError:   () => toast({ title: 'Erro ao alterar status.', variant: 'destructive' }),
                  })
                }
                disabled={updateStatus.isPending}
              >
                <SelectTrigger className="w-44 h-8 text-sm">
                  {updateStatus.isPending
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <SelectValue />
                  }
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(MEETING_STATUS_CONFIG) as MeetingStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {MEETING_STATUS_CONFIG[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* ── 2. Pauta section ── */}
      <AgendaItemsEditor
        items={agendaItems}
        isLoading={false}
        councilId={councilId}
        meetingId={mId}
        canWrite={canWrite}
      />

      {/* ── 3. Presença section ── */}
      <MeetingAttendanceList
        councilId={councilId}
        meetingId={mId}
        canWrite={canWrite}
      />

      {/* ── 4. Documentos section ── */}
      <DocumentsSection
        documents={documents}
        isLoading={docsLoading}
        councilId={councilId}
        meetingId={mId}
        onUpload={() => setShowUpload(true)}
        returnPath={location.pathname}
        canWrite={canWrite}
        canSign={canSign}
      />

      <UploadDocumentModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        councilId={councilId}
        meetingId={mId}
      />
    </div>
  )
}
