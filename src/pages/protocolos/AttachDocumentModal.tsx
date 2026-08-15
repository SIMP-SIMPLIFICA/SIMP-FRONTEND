import { useRef, useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Paperclip, Loader2, FileText, X } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useAttachProtocolDocument } from '@/hooks/useProtocols'
import type { OfficialDocument } from '@/lib/api/protocols'

interface Props {
  /** Protocolo alvo — `null` mantém o modal fechado. */
  doc: OfficialDocument | null
  onClose: () => void
}

/**
 * Anexa o PDF oficial a um protocolo já gerado ("Pendente de Anexo" na listagem).
 * Reutiliza exatamente o mesmo fluxo da tela de sucesso da geração, via
 * useAttachProtocolDocument.
 */
export default function AttachDocumentModal({ doc, onClose }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const attachDocument = useAttachProtocolDocument()

  function handleClose() {
    setFile(null)
    onClose()
  }

  async function handleConfirm() {
    if (!doc || !file) return
    try {
      await attachDocument.mutateAsync({ protocol: doc, file })
      toast({ title: 'PDF anexado. Documento marcado como Emitido.' })
      handleClose()
    } catch (err: unknown) {
      const data = err as { message?: string; issues?: Array<{ message: string }> }
      const msg = data?.message ?? data?.issues?.[0]?.message ?? 'Verifique o arquivo e tente novamente.'
      toast({ title: 'Erro ao anexar PDF', description: msg, variant: 'destructive' })
    }
  }

  return (
    <Dialog open={!!doc} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Anexar Documento</DialogTitle>
          <DialogDescription>
            Anexe o PDF oficial de <span className="font-mono font-semibold">{doc?.formattedNumber}</span>.
            O documento será arquivado na Biblioteca e o protocolo passará para <strong>Emitido</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
          />

          {file ? (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm">
              <FileText className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="flex-1 truncate text-slate-700 font-medium">{file.name}</span>
              <button
                type="button"
                onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                className="text-slate-400 hover:text-red-500 transition-colors shrink-0"
                disabled={attachDocument.isPending}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-200 rounded-lg py-8 flex flex-col items-center gap-2 hover:border-indigo-400 hover:bg-slate-50 transition-colors"
            >
              <Paperclip className="h-6 w-6 text-slate-400" />
              <span className="text-sm text-slate-600 font-medium">Selecionar PDF</span>
              <span className="text-xs text-slate-400">Apenas arquivos PDF</span>
            </button>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={attachDocument.isPending}>
            Cancelar
          </Button>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 gap-2"
            onClick={handleConfirm}
            disabled={!file || attachDocument.isPending}
          >
            {attachDocument.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Paperclip className="h-4 w-4" />}
            Anexar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
