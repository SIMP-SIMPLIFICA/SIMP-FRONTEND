import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { useUpdateCouncilMember } from '@/hooks/useCouncils'
import { toast } from '@/hooks/use-toast'
import type { CouncilMembership, CouncilMemberRole } from '@/lib/api/councils'

// ── Constants ──────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<CouncilMemberRole, string> = {
  PRESIDENTE:      'Presidente',
  VICE_PRESIDENTE: 'Vice-Presidente',
  SECRETARIO:      'Secretário',
  MEMBRO_TITULAR:  'Membro Titular',
  MEMBRO_SUPLENTE: 'Membro Suplente',
}

const ROLES = Object.entries(ROLE_LABELS) as [CouncilMemberRole, string][]

// ── Helpers ────────────────────────────────────────────────────────────────────

function toDateInput(iso: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface EditMemberModalProps {
  open: boolean
  onClose: () => void
  councilId: string
  membership: CouncilMembership | null
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EditMemberModal({ open, onClose, councilId, membership }: EditMemberModalProps) {
  const [role, setRole]           = useState<CouncilMemberRole>('MEMBRO_TITULAR')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate]     = useState('')

  const mutation = useUpdateCouncilMember(councilId)

  useEffect(() => {
    if (open && membership) {
      setRole(membership.role)
      setStartDate(toDateInput(membership.startDate))
      setEndDate(toDateInput(membership.endDate))
    }
  }, [open, membership])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!membership) return

    mutation.mutate(
      {
        membershipId: membership.id,
        data: {
          role,
          startDate: startDate || undefined,
          endDate:   endDate   || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: 'Membro atualizado com sucesso.' })
          onClose()
        },
      },
    )
  }

  if (!membership) return null

  return (
    <Dialog open={open} onOpenChange={v => { if (!v && !mutation.isPending) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            Editar Membro —{' '}
            <span className="font-normal text-slate-600">
              {membership.user.firstName} {membership.user.lastName}
            </span>
          </DialogTitle>
        </DialogHeader>

        <form id="edit-member-form" onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="em-role">Cargo</Label>
            <Select value={role} onValueChange={v => setRole(v as CouncilMemberRole)}>
              <SelectTrigger id="em-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <Label htmlFor="em-start">
                Início <span className="text-slate-400 text-xs font-normal">(opcional)</span>
              </Label>
              <Input
                id="em-start"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <Label htmlFor="em-end">
                Fim <span className="text-slate-400 text-xs font-normal">(opcional)</span>
              </Label>
              <Input
                id="em-end"
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="edit-member-form"
            disabled={mutation.isPending}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
