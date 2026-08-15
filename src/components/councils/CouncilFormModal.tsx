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
import { useCreateCouncil, useUpdateCouncil } from '@/hooks/useCouncils'
import type { Council, CreateCouncilDTO } from '@/lib/api/councils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface CouncilFormModalProps {
  open: boolean
  onClose: () => void
  council?: Council
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Wrapper: só monta o corpo quando aberto, com `key` derivada do conselho.
 *
 * Isso substitui o useEffect que ressincronizava o estado a cada abertura
 * (react-hooks/set-state-in-effect): remontando o corpo, o estado inicializa
 * direto das props, sem render em cascata.
 */
export function CouncilFormModal({ open, onClose, council }: CouncilFormModalProps) {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        {open && <CouncilFormBody key={council?.id ?? 'new'} onClose={onClose} council={council} />}
      </DialogContent>
    </Dialog>
  )
}

function CouncilFormBody({ onClose, council }: { onClose: () => void; council?: Council }) {
  const isEditing = !!council

  const [name, setName]               = useState(council?.name        ?? '')
  const [acronym, setAcronym]         = useState(council?.acronym     ?? '')
  const [description, setDescription] = useState(council?.description ?? '')
  const [legalBasis, setLegalBasis]   = useState(council?.legalBasis  ?? '')
  const [nameError, setNameError]     = useState('')

  const createMutation = useCreateCouncil()
  const updateMutation = useUpdateCouncil(council?.id ?? '')
  const isPending = createMutation.isPending || updateMutation.isPending

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || trimmed.length < 3) {
      setNameError('Nome é obrigatório (mínimo 3 caracteres).')
      return
    }
    setNameError('')

    const payload: CreateCouncilDTO = {
      name:        trimmed,
      acronym:     acronym.trim()     || undefined,
      description: description.trim() || undefined,
      legalBasis:  legalBasis.trim()  || undefined,
    }

    if (isEditing) {
      updateMutation.mutate(payload, { onSuccess: onClose })
    } else {
      createMutation.mutate(payload, { onSuccess: onClose })
    }
  }

  return (
    <>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Conselho' : 'Novo Conselho'}</DialogTitle>
        </DialogHeader>

        <form id="council-form" onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cf-name">
              Nome <span className="text-red-500">*</span>
            </Label>
            <Input
              id="cf-name"
              placeholder="Conselho Municipal de Saúde"
              value={name}
              onChange={e => { setName(e.target.value); setNameError('') }}
              aria-invalid={!!nameError}
            />
            {nameError && <p className="text-xs text-red-500">{nameError}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cf-acronym">
              Sigla{' '}
              <span className="text-slate-400 text-xs font-normal">(opcional)</span>
            </Label>
            <Input
              id="cf-acronym"
              placeholder="CMS"
              className="uppercase"
              value={acronym}
              onChange={e => setAcronym(e.target.value.toUpperCase())}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cf-description">
              Descrição{' '}
              <span className="text-slate-400 text-xs font-normal">(opcional)</span>
            </Label>
            <Textarea
              id="cf-description"
              placeholder="Descrição do conselho e suas atribuições…"
              rows={3}
              className="resize-none"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cf-legalbasis">
              Base Legal{' '}
              <span className="text-slate-400 text-xs font-normal">(opcional)</span>
            </Label>
            <Input
              id="cf-legalbasis"
              placeholder="Lei Municipal nº 1.234/2020"
              value={legalBasis}
              onChange={e => setLegalBasis(e.target.value)}
            />
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="council-form"
            disabled={isPending}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Salvar' : 'Criar Conselho'}
          </Button>
        </DialogFooter>
    </>
  )
}
