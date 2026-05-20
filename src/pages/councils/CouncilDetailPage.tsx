import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Landmark, AlertTriangle, Plus, Users } from 'lucide-react'
import { ManageMembersModal } from '@/components/councils/ManageMembersModal'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useCouncil, useCouncilMembers, useCouncilMeetings } from '@/hooks/useCouncils'
import { useMe } from '@/hooks/useMe'
import { hasAnyPermission } from '@/lib/permissions'
import type { CouncilMemberRole, MeetingStatus, CouncilMembership, CouncilMeeting } from '@/lib/api/councils'

// ── Label maps ────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<CouncilMemberRole, string> = {
  PRESIDENTE:       'Presidente',
  VICE_PRESIDENTE:  'Vice-Presidente',
  SECRETARIO:       'Secretário',
  MEMBRO_TITULAR:   'Membro Titular',
  MEMBRO_SUPLENTE:  'Membro Suplente',
}

const MEETING_STATUS_CONFIG: Record<MeetingStatus, { label: string; className: string }> = {
  AGENDADA:     { label: 'Agendada',     className: 'bg-amber-100   text-amber-700'   },
  EM_ANDAMENTO: { label: 'Em Andamento', className: 'bg-blue-100    text-blue-700'    },
  CONCLUIDA:    { label: 'Concluída',    className: 'bg-emerald-100  text-emerald-700' },
  CANCELADA:    { label: 'Cancelada',    className: 'bg-slate-100    text-slate-500'   },
}

// ── Badge helpers ─────────────────────────────────────────────────────────────

function ActiveBadge({ isActive }: { isActive: boolean }) {
  const cfg = isActive
    ? { label: 'Ativo',   className: 'bg-emerald-100 text-emerald-700' }
    : { label: 'Inativo', className: 'bg-slate-100   text-slate-500'   }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

function MeetingStatusBadge({ status }: { status: MeetingStatus }) {
  const cfg = MEETING_STATUS_CONFIG[status] ?? { label: status, className: 'bg-slate-100 text-slate-600' }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

// ── Skeleton rows ─────────────────────────────────────────────────────────────

function MemberRowSkeleton() {
  return (
    <tr className="border-b border-slate-100">
      <td className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
      <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-4 w-full" /></td>
      <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-28" /></td>
      <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-20" /></td>
      <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-20" /></td>
      <td className="px-4 py-3"><Skeleton className="h-5 w-14 rounded-full" /></td>
    </tr>
  )
}

function MeetingRowSkeleton() {
  return (
    <tr className="border-b border-slate-100">
      <td className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
      <td className="px-4 py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
      <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-28" /></td>
      <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-4 w-32" /></td>
      <td className="px-4 py-3 hidden lg:table-cell text-right"><Skeleton className="h-4 w-8 ml-auto" /></td>
      <td className="px-4 py-3 hidden lg:table-cell text-right"><Skeleton className="h-4 w-8 ml-auto" /></td>
    </tr>
  )
}

// ── Full-page loading skeleton ────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="flex flex-col h-full max-w-screen-2xl mx-auto w-full">
      {/* Header skeleton */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <Skeleton className="h-3 w-40 mb-3" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </div>
      {/* Info card skeleton */}
      <div className="px-6 py-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5 flex flex-col gap-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      {/* Tabs outline */}
      <div className="px-6 pb-4">
        <Skeleton className="h-10 w-52 rounded-md mb-4" />
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 flex gap-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-4 w-20" />)}
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border-b border-slate-100 px-4 py-3 flex gap-4">
              {Array.from({ length: 5 }).map((_, j) => <Skeleton key={j} className="h-4 flex-1" />)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Members table ─────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return format(new Date(iso), 'dd/MM/yyyy', { locale: ptBR })
}

function formatDateTime(iso: string): string {
  return format(new Date(iso), 'dd/MM/yyyy HH:mm', { locale: ptBR })
}

interface MembersTabProps {
  councilId: string
}

function MembersTab({ councilId }: MembersTabProps) {
  const { data: members = [], isLoading } = useCouncilMembers(councilId)

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-3 text-left font-medium text-slate-600">Nome</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600 hidden sm:table-cell">Email</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600 hidden md:table-cell">Cargo</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600 hidden lg:table-cell">Desde</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600 hidden lg:table-cell">Até</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
          </tr>
        </thead>
        <tbody>
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => <MemberRowSkeleton key={i} />)
            : members.length === 0
              ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400 text-sm">
                    Nenhum membro cadastrado.
                  </td>
                </tr>
              )
              : members.map((membership: CouncilMembership) => (
                <tr
                  key={membership.id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3 text-slate-800 font-medium">
                    {membership.user.firstName} {membership.user.lastName}
                  </td>
                  <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">
                    {membership.user.email ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 hidden md:table-cell whitespace-nowrap">
                    {ROLE_LABELS[membership.role] ?? membership.role}
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap hidden lg:table-cell">
                    {formatDate(membership.startDate)}
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap hidden lg:table-cell">
                    {formatDate(membership.endDate)}
                  </td>
                  <td className="px-4 py-3">
                    <ActiveBadge isActive={membership.isActive} />
                  </td>
                </tr>
              ))
          }
        </tbody>
      </table>
    </div>
  )
}

// ── Meetings table ────────────────────────────────────────────────────────────

interface MeetingsTabProps {
  councilId: string
}

function MeetingsTab({ councilId }: MeetingsTabProps) {
  const navigate = useNavigate()
  const { data: meetings = [], isLoading } = useCouncilMeetings(councilId)

  function handleRowClick(meeting: CouncilMeeting) {
    navigate(`/conselhos/${councilId}/reunioes/${meeting.id}`)
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-3 text-left font-medium text-slate-600">Título</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600 hidden md:table-cell">Local</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600 hidden sm:table-cell">Data/Hora</th>
            <th className="px-4 py-3 text-right font-medium text-slate-600 hidden lg:table-cell">Nº Pautas</th>
            <th className="px-4 py-3 text-right font-medium text-slate-600 hidden lg:table-cell">Nº Docs</th>
          </tr>
        </thead>
        <tbody>
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => <MeetingRowSkeleton key={i} />)
            : meetings.length === 0
              ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400 text-sm">
                    Nenhuma reunião cadastrada.
                  </td>
                </tr>
              )
              : meetings.map((meeting: CouncilMeeting) => (
                <tr
                  key={meeting.id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => handleRowClick(meeting)}
                >
                  <td className="px-4 py-3 text-slate-800 font-medium max-w-[200px] truncate">
                    {meeting.title}
                  </td>
                  <td className="px-4 py-3">
                    <MeetingStatusBadge status={meeting.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-500 max-w-[160px] truncate hidden md:table-cell">
                    {meeting.location ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap hidden sm:table-cell">
                    {formatDateTime(meeting.scheduledAt)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700 whitespace-nowrap hidden lg:table-cell">
                    {meeting._count?.agendaItems ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700 whitespace-nowrap hidden lg:table-cell">
                    {meeting._count?.documents ?? 0}
                  </td>
                </tr>
              ))
          }
        </tbody>
      </table>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CouncilDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const councilId = id ?? ''
  const [showManageMembers, setShowManageMembers] = useState(false)
  const { data: me } = useMe()
  const canWrite = hasAnyPermission(me, ['councils:write', 'councils:admin'])
  const { data: council, isLoading, isError } = useCouncil(councilId)

  if (isLoading) {
    return <PageSkeleton />
  }

  if (isError || !council) {
    return (
      <div className="flex flex-col h-full max-w-screen-2xl mx-auto w-full">
        <div className="border-b border-slate-200 bg-white px-6 py-4">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-slate-500 hover:text-slate-900 -ml-2 mb-2"
            onClick={() => navigate('/conselhos')}
          >
            <ArrowLeft className="h-4 w-4" />
            Conselhos
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 py-20 text-slate-400">
          <AlertTriangle className="h-8 w-8 text-red-400" />
          <p className="text-sm">Falha ao carregar dados do conselho.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full max-w-screen-2xl mx-auto w-full">
      {/* ── Header ── */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-slate-500 hover:text-slate-900 -ml-2 mb-2"
          onClick={() => navigate('/conselhos')}
        >
          <ArrowLeft className="h-4 w-4" />
          Conselhos
        </Button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
              <Landmark className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-slate-900">{council.name}</h1>
                {council.acronym && (
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-600">
                    {council.acronym}
                  </span>
                )}
                <ActiveBadge isActive={council.isActive} />
              </div>
              {council.description && (
                <p className="text-xs text-slate-500 mt-0.5">{council.description}</p>
              )}
            </div>
          </div>
        </div>
        {council.legalBasis && (
          <p className="mt-2 text-xs text-slate-400">
            <span className="font-medium text-slate-500">Base legal:</span> {council.legalBasis}
          </p>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <Tabs defaultValue="members">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="members">
                <Users className="h-4 w-4 mr-1.5" />
                Membros
              </TabsTrigger>
              <TabsTrigger value="meetings">
                <Landmark className="h-4 w-4 mr-1.5" />
                Reuniões
              </TabsTrigger>
            </TabsList>

          </div>

          <TabsContent value="members">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-500">
                Membros vinculados a este conselho.
              </p>
              {canWrite && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setShowManageMembers(true)}
                >
                  <Plus className="h-4 w-4" />
                  Gerenciar Membros
                </Button>
              )}
            </div>
            <MembersTab councilId={councilId} />
          </TabsContent>

          <TabsContent value="meetings">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-500">
                Reuniões agendadas e realizadas por este conselho.
              </p>
              {canWrite && (
                <Button
                  size="sm"
                  className="gap-1.5 bg-violet-600 hover:bg-violet-700"
                  disabled
                >
                  <Plus className="h-4 w-4" />
                  Nova Reunião
                </Button>
              )}
            </div>
            <MeetingsTab councilId={councilId} />
          </TabsContent>
        </Tabs>
      </div>

      <ManageMembersModal
        open={showManageMembers}
        onClose={() => setShowManageMembers(false)}
        councilId={councilId}
      />
    </div>
  )
}
