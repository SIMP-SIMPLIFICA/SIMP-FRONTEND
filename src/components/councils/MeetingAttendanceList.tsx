import { useState, useEffect } from 'react'
import { Users, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { useMeetingAttendance, useSaveAttendance } from '@/hooks/useCouncils'
import { toast } from '@/hooks/use-toast'
import type { MeetingAttendanceEntry } from '@/lib/api/councils'

const ROLE_LABELS: Record<string, string> = {
  PRESIDENTE:       'Presidente',
  VICE_PRESIDENTE:  'Vice-Presidente',
  SECRETARIO:       'Secretário',
  MEMBRO_TITULAR:   'Membro Titular',
  MEMBRO_SUPLENTE:  'Membro Suplente',
}

interface AttendanceState {
  [membershipId: string]: { isPresent: boolean; justifiedAbsence: boolean }
}

function buildInitialState(entries: MeetingAttendanceEntry[]): AttendanceState {
  return Object.fromEntries(
    entries.map((e) => [
      e.membershipId,
      { isPresent: e.isPresent, justifiedAbsence: e.justifiedAbsence ?? false },
    ]),
  )
}

interface Props {
  councilId: string
  meetingId: string
  canWrite?: boolean
}

export function MeetingAttendanceList({ councilId, meetingId, canWrite = false }: Props) {
  const { data: entries = [], isLoading } = useMeetingAttendance(councilId, meetingId)
  const saveAttendance = useSaveAttendance(councilId, meetingId)

  const [state, setState] = useState<AttendanceState>({})

  useEffect(() => {
    if (entries.length > 0) setState(buildInitialState(entries))
  }, [entries])

  const presentCount = Object.values(state).filter((v) => v.isPresent).length
  const totalCount   = entries.length

  function togglePresent(membershipId: string, checked: boolean) {
    setState((prev) => ({
      ...prev,
      [membershipId]: {
        ...prev[membershipId],
        isPresent:        checked,
        justifiedAbsence: checked ? false : (prev[membershipId]?.justifiedAbsence ?? false),
      },
    }))
  }

  function toggleJustified(membershipId: string, checked: boolean) {
    setState((prev) => ({
      ...prev,
      [membershipId]: { ...prev[membershipId], justifiedAbsence: checked },
    }))
  }

  function handleSave() {
    const attendance = Object.entries(state).map(([membershipId, v]) => ({
      membershipId,
      isPresent:        v.isPresent,
      justifiedAbsence: v.justifiedAbsence,
    }))

    saveAttendance.mutate(
      { attendance },
      {
        onSuccess: () => toast({ title: 'Lista de presença salva.' }),
        onError:   () => toast({ title: 'Erro ao salvar presença.', variant: 'destructive' }),
      },
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-700">Lista de Presença</h2>
          {!isLoading && totalCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Users className="h-3.5 w-3.5" />
              {presentCount}/{totalCount} presentes
            </span>
          )}
        </div>
        {canWrite && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={handleSave}
            disabled={saveAttendance.isPending || isLoading}
          >
            {saveAttendance.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Save className="h-4 w-4" />
            }
            Salvar Lista de Presença
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-24 ml-auto" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="py-12 text-center text-slate-400 text-sm">
          Nenhum membro ativo neste conselho.
        </p>
      ) : (
        <div className="divide-y divide-slate-100">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs font-medium text-slate-500">
            <span>Membro</span>
            <span className="text-center w-20">Presente</span>
            <span className="text-center w-24">Falta Justif.</span>
          </div>

          {entries.map((entry) => {
            const memberState = state[entry.membershipId] ?? { isPresent: false, justifiedAbsence: false }

            return (
              <div
                key={entry.membershipId}
                className={`grid grid-cols-[1fr_auto_auto] gap-4 items-center px-4 py-3 transition-colors ${
                  memberState.isPresent ? 'bg-emerald-50/40' : ''
                }`}
              >
                {/* Member info */}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {entry.firstName} {entry.lastName}
                  </p>
                  <p className="text-xs text-slate-400">
                    {ROLE_LABELS[entry.role] ?? entry.role}
                  </p>
                </div>

                {/* Present checkbox */}
                <div className="w-20 flex justify-center">
                  <Checkbox
                    checked={memberState.isPresent}
                    onCheckedChange={(checked) =>
                      canWrite && togglePresent(entry.membershipId, Boolean(checked))
                    }
                    disabled={!canWrite}
                    aria-label={`${entry.firstName} presente`}
                  />
                </div>

                {/* Justified absence checkbox — only enabled if not present */}
                <div className="w-24 flex justify-center">
                  <Checkbox
                    checked={memberState.justifiedAbsence}
                    onCheckedChange={(checked) =>
                      canWrite && !memberState.isPresent && toggleJustified(entry.membershipId, Boolean(checked))
                    }
                    disabled={!canWrite || memberState.isPresent}
                    aria-label={`${entry.firstName} falta justificada`}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
