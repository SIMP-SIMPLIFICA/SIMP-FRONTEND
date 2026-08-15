import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import type { OfficialDocument, DocumentCategory, DocumentStatus } from '@/lib/api/protocols'

// ── Helpers ───────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  COMUNICACAO: 'Comunicação',
  NORMATIVO: 'Normativo',
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

interface ProtocolDetailsDialogProps {
  doc: OfficialDocument | null
  onClose: () => void
}

export default function ProtocolDetailsDialog({ doc, onClose }: ProtocolDetailsDialogProps) {
  if (!doc) return null

  const creatorName = doc.creator
    ? `${doc.creator.firstName} ${doc.creator.lastName}`
    : '—'

  const createdAt = format(new Date(doc.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })

  return (
    <Dialog open={!!doc} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg overflow-hidden p-0 gap-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="font-mono text-base">{doc.formattedNumber}</DialogTitle>
          <p className="text-xs text-slate-400 mt-1">{doc.documentType}</p>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-5 space-y-5">
            {/* Row 1: Status + Categoria */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Status">
                <StatusBadge status={doc.status} />
              </Field>
              <Field label="Categoria">
                {CATEGORY_LABELS[doc.documentCategory]}
              </Field>
            </div>

            {/* Row 2: Setor + Criador */}
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

            {/* Row 3: Data */}
            <Field label="Data de criação">
              {createdAt}
            </Field>

            {/* Destinatário (opcional) */}
            {doc.recipient && (
              <Field label="Destinatário">
                {doc.recipient}
              </Field>
            )}

            {/* Assunto — largura total, preserva quebras */}
            <Field label="Assunto / Ementa">
              <p className="whitespace-pre-wrap leading-relaxed">{doc.subject}</p>
            </Field>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
