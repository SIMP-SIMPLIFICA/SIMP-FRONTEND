import { useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { useCreateMeeting } from '@/hooks/useCouncils'
import { toast } from '@/hooks/use-toast'

// ── Types ─────────────────────────────────────────────────────────────────────

interface CreateMeetingModalProps {
  open: boolean
  onClose: () => void
  councilId: string
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Wrapper: o corpo é montado apenas quando aberto, então cada abertura começa
 * com estado limpo — substitui o useEffect de reset
 * (react-hooks/set-state-in-effect), que causava render em cascata.
 */
export function CreateMeetingModal({ open, onClose, councilId }: CreateMeetingModalProps) {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        {open && <CreateMeetingBody onClose={onClose} councilId={councilId} />}
      </DialogContent>
    </Dialog>
  )
}

function CreateMeetingBody({ onClose, councilId }: { onClose: () => void; councilId: string }) {
  const [title, setTitle]             = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation]       = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [titleError, setTitleError]   = useState('')
  const [dateError, setDateError]     = useState('')

  const mutation = useCreateMeeting(councilId)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    let valid = true

    if (!title.trim() || title.trim().length < 3) {
      setTitleError('Título é obrigatório (mínimo 3 caracteres).')
      valid = false
    } else {
      setTitleError('')
    }

    if (!scheduledAt) {
      setDateError('Data e hora são obrigatórias.')
      valid = false
    } else {
      setDateError('')
    }

    if (!valid) return

    mutation.mutate(
      {
        title:       title.trim(),
        description: description.trim() || undefined,
        location:    location.trim()    || undefined,
        scheduledAt: new Date(scheduledAt).toISOString(),
      },
      {
        onSuccess: () => {
          toast({ title: 'Reunião criada com sucesso.' })
          onClose()
        },
      },
    )
  }

  return (
    <>
        <DialogHeader>
          <DialogTitle>Nova Reunião</DialogTitle>
        </DialogHeader>

        <form id="meeting-form" onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mt-title">
              Título <span className="text-red-500">*</span>
            </Label>
            <Input
              id="mt-title"
              placeholder="Reunião Ordinária de Janeiro"
              value={title}
              onChange={e => { setTitle(e.target.value); setTitleError('') }}
              aria-invalid={!!titleError}
            />
            {titleError && <p className="text-xs text-red-500">{titleError}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mt-scheduled">
              Data e Hora <span className="text-red-500">*</span>
            </Label>
            <Input
              id="mt-scheduled"
              type="datetime-local"
              value={scheduledAt}
              onChange={e => { setScheduledAt(e.target.value); setDateError('') }}
              aria-invalid={!!dateError}
            />
            {dateError && <p className="text-xs text-red-500">{dateError}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mt-location">
              Local <span className="text-slate-400 text-xs font-normal">(opcional)</span>
            </Label>
            <Input
              id="mt-location"
              placeholder="Sala de Reuniões, Prefeitura"
              value={location}
              onChange={e => setLocation(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mt-description">
              Descrição <span className="text-slate-400 text-xs font-normal">(opcional)</span>
            </Label>
            <Textarea
              id="mt-description"
              placeholder="Pauta geral e objetivos da reunião…"
              rows={3}
              className="resize-none"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="meeting-form"
            disabled={mutation.isPending}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar Reunião
          </Button>
        </DialogFooter>
    </>
  )
}
