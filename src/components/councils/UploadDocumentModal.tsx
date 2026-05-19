import { useState, useRef } from 'react'
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
import { Loader2, ShieldCheck } from 'lucide-react'
import { useUploadDocument } from '@/hooks/useCouncils'
import { toast } from '@/hooks/use-toast'
import type { CouncilDocumentType } from '@/lib/api/councils'

const DOC_TYPES: { value: CouncilDocumentType; label: string }[] = [
  { value: 'ATA',        label: 'Ata'        },
  { value: 'RESOLUCAO',  label: 'Resolução'  },
  { value: 'CONVOCACAO', label: 'Convocação' },
  { value: 'PARECER',    label: 'Parecer'    },
  { value: 'OUTROS',     label: 'Outros'     },
]

async function sha256Hex(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

interface Props {
  open: boolean
  onClose: () => void
  councilId: string
  meetingId: string
}

export function UploadDocumentModal({ open, onClose, councilId, meetingId }: Props) {
  const [file, setFile]               = useState<File | null>(null)
  const [hash, setHash]               = useState<string | null>(null)
  const [hashLoading, setHashLoading] = useState(false)
  const [title, setTitle]             = useState('')
  const [documentType, setDocumentType] = useState<CouncilDocumentType>('OUTROS')
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = useUploadDocument(councilId, meetingId)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setHash(null)
    if (!f) return
    setHashLoading(true)
    try {
      setHash(await sha256Hex(f))
    } finally {
      setHashLoading(false)
    }
  }

  function handleSubmit() {
    if (!file) return
    upload.mutate(
      { file, fields: { title: title.trim() || undefined, documentType } },
      {
        onSuccess: () => {
          toast({ title: 'Documento enviado com sucesso.' })
          handleClose()
        },
        onError: () => {
          toast({ title: 'Erro ao enviar documento.', variant: 'destructive' })
        },
      },
    )
  }

  function reset() {
    setFile(null)
    setHash(null)
    setTitle('')
    setDocumentType('OUTROS')
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleClose() {
    if (upload.isPending) return
    onClose()
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload de Documento</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          {/* File picker — PDF only */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doc-file">Arquivo PDF</Label>
            <Input
              ref={inputRef}
              id="doc-file"
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
          </div>

          {/* SHA-256 fingerprint preview */}
          {(file || hashLoading) && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5 flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-700">
                  Impressão digital do documento
                </p>
                {hashLoading ? (
                  <div className="flex items-center gap-1.5 mt-1">
                    <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                    <span className="text-xs text-slate-400">Calculando SHA-256...</span>
                  </div>
                ) : hash ? (
                  <p className="font-mono text-xs text-slate-500 mt-0.5 truncate">
                    {hash.slice(0, 16)}…{hash.slice(-8)}
                  </p>
                ) : null}
              </div>
            </div>
          )}

          {/* Document type */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doc-type">Tipo do Documento</Label>
            <Select
              value={documentType}
              onValueChange={(v) => setDocumentType(v as CouncilDocumentType)}
            >
              <SelectTrigger id="doc-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Optional title */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doc-title">
              Título{' '}
              <span className="text-slate-400 font-normal">(opcional)</span>
            </Label>
            <Input
              id="doc-title"
              placeholder="Ex: Ata da Reunião Ordinária nº 01/2025"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={upload.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!file || hashLoading || upload.isPending}
          >
            {upload.isPending && (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            )}
            Enviar Documento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
