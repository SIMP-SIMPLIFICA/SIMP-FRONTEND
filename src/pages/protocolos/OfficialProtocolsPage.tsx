import { useState } from 'react'
import {
  Search, Plus, Hash, XCircle, Loader2, AlertTriangle, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useMe } from '@/hooks/useMe'
import { hasAnyPermission } from '@/lib/permissions'
import { useProtocols, useUpdateProtocolStatus } from '@/hooks/useProtocols'
import type { OfficialDocument, DocumentCategory, DocumentStatus } from '@/lib/api/protocols'
import GenerateProtocolModal from './GenerateProtocolModal'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return format(new Date(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

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

function RowSkeleton() {
  return (
    <tr className="border-b border-slate-100">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
      ))}
    </tr>
  )
}

// ── Cancel Dialog ─────────────────────────────────────────────────────────────

interface CancelDialogProps {
  doc: OfficialDocument | null
  onClose: () => void
}

function CancelDialog({ doc, onClose }: CancelDialogProps) {
  const [reason, setReason] = useState('')
  const updateStatus = useUpdateProtocolStatus()

  async function handleConfirm() {
    if (!doc || !reason.trim()) return
    try {
      await updateStatus.mutateAsync({ id: doc.id, data: { status: 'CANCELADO', cancelReason: reason.trim() } })
      toast({ title: 'Documento cancelado.' })
      onClose()
    } catch {
      toast({ title: 'Erro ao cancelar documento.', variant: 'destructive' })
    }
  }

  return (
    <Dialog open={!!doc} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-red-100">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <DialogTitle className="text-center">Cancelar Documento?</DialogTitle>
          <DialogDescription className="text-center text-sm">
            {doc?.formattedNumber}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 py-2">
          <Label>Justificativa <span className="text-red-500">*</span></Label>
          <Textarea
            rows={3}
            placeholder="Descreva o motivo do cancelamento…"
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="resize-none"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={updateStatus.isPending}>Cancelar</Button>
          <Button
            variant="destructive"
            disabled={updateStatus.isPending || !reason.trim()}
            onClick={handleConfirm}
          >
            {updateStatus.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar cancelamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OfficialProtocolsPage() {
  const { data: me } = useMe()
  const isAdmin = hasAnyPermission(me, ['protocols:admin']) || !!me?.user?.isSuperAdmin

  const currentYear = new Date().getFullYear()
  const [search, setSearch]               = useState('')
  const [categoryFilter, setCategoryFilter] = useState<DocumentCategory | 'ALL'>('ALL')
  const [statusFilter, setStatusFilter]   = useState<DocumentStatus | 'ALL'>('ALL')
  const [yearFilter, setYearFilter]       = useState<number>(currentYear)
  const [page, setPage]                   = useState(1)
  const [cancelTarget, setCancelTarget]   = useState<OfficialDocument | null>(null)
  const [generateOpen, setGenerateOpen]   = useState(false)

  const { data, isLoading } = useProtocols({
    page,
    limit: 25,
    search: search || undefined,
    documentCategory: categoryFilter !== 'ALL' ? categoryFilter : undefined,
    status:           statusFilter   !== 'ALL' ? statusFilter   : undefined,
    year:             yearFilter,
  })

  const docs       = data?.data ?? []
  const totalPages = data?.meta?.totalPages ?? 1

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i)

  return (
    <div className="flex flex-col h-full gap-0">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">
            <Hash className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Protocolos e Ofícios</h1>
            <p className="text-xs text-slate-400">Controle de numeração oficial</p>
          </div>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700 gap-1.5" onClick={() => setGenerateOpen(true)}>
          <Plus className="h-4 w-4" />
          Gerar Novo Número
        </Button>
      </div>

      {/* ── Filters ── */}
      <div className="px-6 py-3 border-b border-slate-100 bg-slate-50 shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Buscar por número ou assunto…"
              className="pl-8 h-8 text-sm"
            />
          </div>
          <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v as DocumentCategory | 'ALL'); setPage(1) }}>
            <SelectTrigger className="h-8 text-xs w-40">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as categorias</SelectItem>
              <SelectItem value="COMUNICACAO">Comunicação</SelectItem>
              <SelectItem value="NORMATIVO">Normativo</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v as DocumentStatus | 'ALL'); setPage(1) }}>
            <SelectTrigger className="h-8 text-xs w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os status</SelectItem>
              <SelectItem value="RESERVADO">Reservado</SelectItem>
              <SelectItem value="EMITIDO">Emitido</SelectItem>
              <SelectItem value="CANCELADO">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={String(yearFilter)} onValueChange={v => { setYearFilter(Number(v)); setPage(1) }}>
            <SelectTrigger className="h-8 text-xs w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isAdmin && (
            <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
              Visão de auditoria
            </span>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <ScrollArea className="flex-1">
        <div className="min-w-[900px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left font-semibold">Número</th>
                <th className="px-4 py-3 text-left font-semibold">Categoria / Tipo</th>
                <th className="px-4 py-3 text-left font-semibold">Assunto</th>
                <th className="px-4 py-3 text-left font-semibold">Setor</th>
                <th className="px-4 py-3 text-left font-semibold">Criado por</th>
                <th className="px-4 py-3 text-left font-semibold">Data</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                {isAdmin && <th className="px-4 py-3 text-left font-semibold">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} />)
                : docs.length === 0
                  ? (
                    <tr>
                      <td colSpan={isAdmin ? 8 : 7} className="px-4 py-16 text-center text-slate-400">
                        <Hash className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Nenhum documento encontrado.</p>
                      </td>
                    </tr>
                  )
                  : docs.map(doc => (
                    <tr
                      key={doc.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold text-slate-800">
                          {doc.formattedNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs text-slate-400">{CATEGORY_LABELS[doc.documentCategory]}</span>
                          <span className="text-sm font-medium text-slate-700">{doc.documentType}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-sm text-slate-700 line-clamp-2">{doc.subject}</p>
                        {doc.recipient && (
                          <p className="text-xs text-slate-400 mt-0.5">Para: {doc.recipient}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                          {doc.sector}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {doc.creator
                          ? `${doc.creator.firstName} ${doc.creator.lastName}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(doc.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <StatusBadge status={doc.status} />
                          {doc.cancelReason && (
                            <p className="text-xs text-slate-400 line-clamp-1" title={doc.cancelReason}>
                              {doc.cancelReason}
                            </p>
                          )}
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          {doc.status !== 'CANCELADO' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 gap-1"
                              onClick={() => setCancelTarget(doc)}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Cancelar
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </ScrollArea>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-white shrink-0">
          <span className="text-xs text-slate-500">
            {data?.meta?.total ?? 0} documentos · página {page} de {totalPages}
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-7 w-7 p-0"
              disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 w-7 p-0"
              disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <CancelDialog doc={cancelTarget} onClose={() => setCancelTarget(null)} />
      <GenerateProtocolModal open={generateOpen} onOpenChange={setGenerateOpen} />
    </div>
  )
}
