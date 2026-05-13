import { useState } from 'react'
import {
  Search, Plus, Hash, Loader2, ChevronLeft, ChevronRight, Eye, Printer,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useMe } from '@/hooks/useMe'
import { hasAnyPermission } from '@/lib/permissions'
import { useProtocols } from '@/hooks/useProtocols'
import type { OfficialDocument, DocumentCategory, DocumentStatus } from '@/lib/api/protocols'
import GenerateProtocolModal from './GenerateProtocolModal'
import ProtocolViewSheet from './ProtocolViewSheet'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return format(new Date(iso), 'dd/MM/yyyy', { locale: ptBR })
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

const MONTH_NAMES = [
  '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

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
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
      ))}
    </tr>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OfficialProtocolsPage() {
  const { data: me } = useMe()
  const isAdmin      = hasAnyPermission(me, ['protocols:admin']) || !!me?.user?.isSuperAdmin
  const currentUserId = me?.user?.id

  function canActOnDoc(doc: OfficialDocument) {
    return isAdmin || doc.creatorId === currentUserId
  }

  const currentYear = new Date().getFullYear()

  const [search, setSearch]               = useState('')
  const [categoryFilter, setCategoryFilter] = useState<DocumentCategory | 'ALL'>('ALL')
  const [statusFilter, setStatusFilter]   = useState<DocumentStatus | 'ALL'>('ALL')
  const [yearFilter, setYearFilter]       = useState<number>(currentYear)
  const [monthFilter, setMonthFilter]     = useState<number>(0)
  const [page, setPage]                   = useState(1)
  const [viewTarget, setViewTarget]       = useState<OfficialDocument | null>(null)
  const [generateOpen, setGenerateOpen]   = useState(false)

  const { data, isLoading } = useProtocols({
    page,
    limit: 25,
    search:           search || undefined,
    documentCategory: categoryFilter !== 'ALL' ? categoryFilter : undefined,
    status:           statusFilter   !== 'ALL' ? statusFilter   : undefined,
    year:             yearFilter,
    month:            monthFilter !== 0 ? monthFilter : undefined,
  })

  const docs       = data?.data ?? []
  const totalPages = data?.meta?.totalPages ?? 1

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i)

  // Título do extrato para impressão
  const extractTitle = [
    monthFilter !== 0 ? `${MONTH_NAMES[monthFilter]}/${yearFilter}` : `Ano ${yearFilter}`,
    categoryFilter !== 'ALL' ? CATEGORY_LABELS[categoryFilter] : null,
    statusFilter   !== 'ALL' ? STATUS_CONFIG[statusFilter].label : null,
  ].filter(Boolean).join(' · ')

  function handlePrint() {
    window.print()
  }

  return (
    <>
      {/* CSS de impressão — ocultar controles, mostrar cabeçalho de extrato */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; inset: 0; }
          .no-print { display: none !important; }
          .print-header { display: block !important; }
          @page { margin: 1.5cm; }
        }
        .print-header { display: none; }
      `}</style>

      <div className="print-area flex flex-col h-full gap-0 max-w-screen-2xl mx-auto w-full">

        {/* Cabeçalho de impressão (visível apenas no print) */}
        <div className="print-header mb-4 pb-4 border-b">
          <h2 className="text-lg font-bold text-slate-900">Relatório de Protocolos</h2>
          <p className="text-sm text-slate-600 mt-0.5">{extractTitle}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>

        {/* ── Page header ── */}
        <div className="no-print flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">
              <Hash className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Protocolos e Ofícios</h1>
              <p className="text-xs text-slate-400">Controle de numeração oficial</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-1.5" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              Imprimir Extrato
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 gap-1.5" onClick={() => setGenerateOpen(true)}>
              <Plus className="h-4 w-4" />
              Gerar Novo Número
            </Button>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="no-print px-6 py-3 border-b border-slate-100 bg-slate-50 shrink-0">
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
              <SelectTrigger className="h-8 text-xs w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(monthFilter)} onValueChange={v => { setMonthFilter(Number(v)); setPage(1) }}>
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue placeholder="Todos os meses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Todos os meses</SelectItem>
                {MONTH_NAMES.slice(1).map((name, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
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
        <div className="flex-1 overflow-auto">
          <div className="min-w-[560px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left font-semibold">Número</th>
                  <th className="px-4 py-3 text-left font-semibold hidden sm:table-cell">Tipo</th>
                  <th className="px-4 py-3 text-left font-semibold">Assunto</th>
                  <th className="px-4 py-3 text-left font-semibold hidden md:table-cell">Setor</th>
                  <th className="px-4 py-3 text-left font-semibold hidden md:table-cell">Data</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold no-print">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} />)
                  : docs.length === 0
                    ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-16 text-center text-slate-400">
                          <Hash className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">Nenhum documento encontrado.</p>
                        </td>
                      </tr>
                    )
                    : docs.map(doc => (
                      <tr
                        key={doc.id}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => setViewTarget(doc)}
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-semibold text-slate-800 whitespace-nowrap">
                            {doc.formattedNumber}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-slate-400">{CATEGORY_LABELS[doc.documentCategory]}</span>
                            <span className="text-xs font-medium text-slate-700">{doc.documentType}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <p className="text-sm text-slate-700 line-clamp-1">{doc.subject}</p>
                          {doc.recipient && (
                            <p className="text-xs text-slate-400 truncate max-w-[180px]">
                              Para: {doc.recipient}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                            {doc.sector}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap hidden md:table-cell">
                          {formatDate(doc.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={doc.status} />
                        </td>
                        <td className="px-4 py-3 no-print" onClick={e => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 gap-1"
                            onClick={() => setViewTarget(doc)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Visualizar
                          </Button>
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="no-print flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-white shrink-0">
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
      </div>

      {/* ── Modais ── */}
      <ProtocolViewSheet
        doc={viewTarget}
        canAct={viewTarget ? canActOnDoc(viewTarget) : false}
        onClose={() => setViewTarget(null)}
      />
      <GenerateProtocolModal open={generateOpen} onOpenChange={setGenerateOpen} />
    </>
  )
}
