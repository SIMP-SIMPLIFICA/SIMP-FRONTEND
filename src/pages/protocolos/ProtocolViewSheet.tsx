import { useState } from 'react'
import { Loader2, Paperclip, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { libraryService } from '@/lib/api/library'
import { useUpdateProtocolStatus } from '@/hooks/useProtocols'
import type { OfficialDocument, DocumentCategory, DocumentStatus } from '@/lib/api/protocols'

// ── Helpers ───────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  COMUNICACAO: 'Comunicação',
  NORMATIVO:   'Normativo',
}

const STATUS_CONFIG: Record<DocumentStatus, { label: string; className: string }> = {
  RESERVADO: { label: 'Reservado', className: 'bg-blue-100 text-blue-700' },
  EMITIDO:   { label: 'Emitido',   className: 'bg-emerald-100 text-emerald-700' },
  CANCELADO: { label: 'Cancelado', className: 'bg-red-100 text-red-600' },
}

function StatusBadge({ status }: { status: DocumentStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: 'bg-slate-100 text-slate-600' }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <div className="text-sm text-slate-800">{children}</div>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ProtocolViewSheetProps {
  doc: OfficialDocument | null
  canAct: boolean
  onClose: () => void
}

export default function ProtocolViewSheet({ doc, canAct, onClose }: ProtocolViewSheetProps) {
  const updateStatus = useUpdateProtocolStatus()
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [downloading, setDownloading]             = useState(false)
  const [emitting, setEmitting]                   = useState(false)

  if (!doc) return null

  const creatorName = doc.creator
    ? `${doc.creator.firstName} ${doc.creator.lastName}`
    : '—'

  const createdAt = format(new Date(doc.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })

  const showEmit   = canAct && doc.status === 'RESERVADO'
  const showCancel = canAct && doc.status !== 'CANCELADO'
  const hasActions = showEmit || showCancel || !!doc.libraryDocumentId

  async function handleEmit() {
    setEmitting(true)
    try {
      await updateStatus.mutateAsync({ id: doc!.id, data: { status: 'EMITIDO' } })
      toast({ title: 'Documento marcado como Emitido.' })
      onClose()
    } catch {
      toast({ title: 'Erro ao emitir.', variant: 'destructive' })
    } finally {
      setEmitting(false)
    }
  }

  async function handleDownload() {
    if (!doc!.libraryDocumentId) return
    setDownloading(true)
    try {
      const { url } = await libraryService.download(doc!.libraryDocumentId)
      window.open(url, '_blank')
    } catch {
      toast({ title: 'Erro ao baixar documento.', variant: 'destructive' })
    } finally {
      setDownloading(false)
    }
  }

  async function handleCancelConfirm() {
    try {
      await updateStatus.mutateAsync({ id: doc!.id, data: { status: 'CANCELADO' } })
      toast({ title: 'Documento cancelado.' })
      setShowCancelConfirm(false)
      onClose()
    } catch {
      toast({ title: 'Erro ao cancelar.', variant: 'destructive' })
    }
  }

  return (
    <>
      <Sheet open={!!doc} onOpenChange={v => !v && onClose()}>
        <SheetContent side="right" className="w-[480px] sm:max-w-lg flex flex-col p-0 gap-0">
          {/* Header */}
          <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <SheetTitle className="font-mono text-base leading-tight">
              {doc.formattedNumber}
            </SheetTitle>
            <p className="text-xs text-slate-400 mt-0.5">{doc.documentType}</p>
          </SheetHeader>

          {/* Body */}
          <ScrollArea className="flex-1">
            <div className="px-6 py-5 space-y-5">
              {/* Status + Categoria */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Status">
                  <StatusBadge status={doc.status} />
                </Field>
                <Field label="Categoria">
                  {CATEGORY_LABELS[doc.documentCategory]}
                </Field>
              </div>

              {/* Setor + Criador */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Setor de Origem">
                  <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600">
                    {doc.sector}
                  </span>
                </Field>
                <Field label="Criado por">
                  {creatorName}
                </Field>
              </div>

              {/* Data */}
              <Field label="Data de criação">
                {createdAt}
              </Field>

              {/* Destinatário */}
              {doc.recipient && (
                <Field label="Destinatário">
                  <p className="leading-relaxed">{doc.recipient}</p>
                </Field>
              )}

              {/* Assunto — texto completo sem truncate */}
              <Field label="Assunto / Ementa">
                <p className="whitespace-pre-wrap leading-relaxed">{doc.subject}</p>
              </Field>

              {/* Motivo de cancelamento */}
              {doc.cancelReason && (
                <Field label="Motivo do cancelamento">
                  <p className="text-red-600 leading-relaxed">{doc.cancelReason}</p>
                </Field>
              )}
            </div>
          </ScrollArea>

          {/* Actions footer */}
          {hasActions && (
            <div className="px-6 py-4 border-t shrink-0 flex flex-col gap-2">
              {doc.libraryDocumentId && (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  disabled={downloading}
                  onClick={handleDownload}
                >
                  {downloading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Paperclip className="h-4 w-4" />
                  }
                  Baixar PDF Vinculado
                </Button>
              )}
              {showEmit && (
                <Button
                  className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
                  disabled={emitting}
                  onClick={handleEmit}
                >
                  {emitting
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <CheckCircle2 className="h-4 w-4" />
                  }
                  Marcar como Emitido
                </Button>
              )}
              {showCancel && (
                <Button
                  variant="outline"
                  className="w-full gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                  onClick={() => setShowCancelConfirm(true)}
                >
                  <XCircle className="h-4 w-4" />
                  Cancelar Documento
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirmação de cancelamento */}
      <Dialog open={showCancelConfirm} onOpenChange={v => !v && setShowCancelConfirm(false)}>
        <DialogContent className="max-w-md p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <DialogTitle className="text-center">Cancelar Documento?</DialogTitle>
            <DialogDescription className="text-center text-sm">
              {doc.formattedNumber}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-slate-500 text-center px-6 py-4">
            Tem certeza que deseja cancelar este documento? Esta ação não poderá ser desfeita.
          </p>
          <DialogFooter className="px-6 py-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowCancelConfirm(false)}
              disabled={updateStatus.isPending}
            >
              Voltar
            </Button>
            <Button
              variant="destructive"
              disabled={updateStatus.isPending}
              onClick={handleCancelConfirm}
            >
              {updateStatus.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sim, cancelar documento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
