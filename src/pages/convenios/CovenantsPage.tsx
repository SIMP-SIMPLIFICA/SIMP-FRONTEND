import { useState } from 'react'
import {
  Search, Plus, Handshake, ChevronRight, Loader2, AlertTriangle, Trash2, Pencil,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useCovenants, useDeleteCovenant, useCovenantTypes } from '@/hooks/useCovenants'
import type { Covenant, CovenantStatus } from '@/lib/api/covenants'
import CovenantFormDialog from './CovenantFormDialog'
import CovenantDetailSheet from './CovenantDetailSheet'
import { useMe } from '@/hooks/useMe'
import { hasAnyPermission } from '@/lib/permissions'

// ── Label maps ────────────────────────────────────────────────────────────────


const STATUS_CONFIG: Record<CovenantStatus, { label: string; className: string }> = {
  EM_ANALISE:       { label: 'Em Análise',       className: 'bg-amber-100  text-amber-700' },
  APROVADO:         { label: 'Aprovado',          className: 'bg-blue-100   text-blue-700' },
  EM_EXECUCAO:      { label: 'Em Execução',       className: 'bg-emerald-100 text-emerald-700' },
  PRESTACAO_CONTAS: { label: 'Prestação de Contas', className: 'bg-violet-100 text-violet-700' },
  CONCLUIDO:        { label: 'Concluído',         className: 'bg-slate-100  text-slate-600' },
  DEVOLVIDO:        { label: 'Devolvido',         className: 'bg-red-100    text-red-600' },
}

function StatusBadge({ status }: { status: CovenantStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: 'bg-slate-100 text-slate-600' }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

function formatCurrency(value?: string | null) {
  if (!value) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))
}

function formatDate(iso?: string | null) {
  if (!iso) return '—'
  return format(new Date(iso), 'dd/MM/yyyy', { locale: ptBR })
}

// ── Row skeleton ──────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <tr className="border-b border-slate-100">
      <td className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
      <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-full" /></td>
      <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-4 w-full" /></td>
      <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-full" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-8" /></td>
    </tr>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CovenantsPage() {
  const { data: me } = useMe()
  const canDelete = hasAnyPermission(me, ['covenants:delete']) || !!me?.user?.isSuperAdmin

  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState<CovenantStatus | 'ALL'>('ALL')
  const [typeFilter, setType]     = useState<string>('')
  const [page, setPage]           = useState(1)

  const [formOpen, setFormOpen]             = useState(false)
  const [editing, setEditing]               = useState<Covenant | null>(null)
  const [sheetId, setSheetId]               = useState<string | null>(null)
  const [sheetOpen, setSheetOpen]           = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting]             = useState(false)

  const { data, isLoading, isError } = useCovenants({
    page,
    limit: 20,
    search:  search      || undefined,
    status:  statusFilter !== 'ALL' ? statusFilter : undefined,
    typeId:  typeFilter   || undefined,
  })
  const { data: covenantTypes = [] } = useCovenantTypes()

  const deleteMutation = useDeleteCovenant()

  async function handleConfirmDelete() {
    if (!confirmDeleteId) return
    setDeleting(true)
    try {
      await deleteMutation.mutateAsync(confirmDeleteId)
      toast({ title: 'Convênio excluído com sucesso.' })
      setConfirmDeleteId(null)
    } catch {
      toast({ title: 'Erro ao excluir convênio.', variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  function openEdit(e: React.MouseEvent, covenant: Covenant) {
    e.stopPropagation()
    setEditing(covenant)
    setFormOpen(true)
  }

  function openDetail(covenant: Covenant) {
    setSheetId(covenant.id)
    setSheetOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditing(null)
  }

  const covenants = data?.data ?? []
  const meta      = data?.meta

  return (
    <div className="flex flex-col h-full max-w-screen-2xl mx-auto w-full">
      {/* ── Header ── */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <nav className="mb-1 flex items-center gap-1 text-xs text-slate-400">
          <span>Início</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-600 font-medium">Convênios</span>
        </nav>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
              <Handshake className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Convênios e Transferências</h1>
              <p className="text-xs text-slate-500">Gestão de convênios, emendas e transferências de recursos</p>
            </div>
          </div>
          <Button
            size="sm"
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            onClick={() => { setEditing(null); setFormOpen(true) }}
          >
            <Plus className="h-4 w-4" />
            Novo Convênio
          </Button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="border-b border-slate-100 bg-slate-50 px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar por número ou objeto…"
              className="pl-9 h-8 text-sm bg-white"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={v => { setStatus(v as CovenantStatus | 'ALL'); setPage(1) }}
          >
            <SelectTrigger className="h-8 w-44 text-sm bg-white">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os status</SelectItem>
              {(Object.keys(STATUS_CONFIG) as CovenantStatus[]).map(s => (
                <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={typeFilter || 'ALL'}
            onValueChange={v => { setType(v === 'ALL' ? '' : v); setPage(1) }}
          >
            <SelectTrigger className="h-8 w-52 text-sm bg-white">
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os tipos</SelectItem>
              {covenantTypes.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {meta && (
            <span className="ml-auto text-xs text-slate-400">
              {meta.total} {meta.total === 1 ? 'registro' : 'registros'}
            </span>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {isError ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-slate-400">
            <AlertTriangle className="h-8 w-8 text-red-400" />
            <p className="text-sm">Falha ao carregar convênios.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Número</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Proponente</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 hidden md:table-cell">Tipo</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600 hidden sm:table-cell">Valor</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 hidden lg:table-cell">Vigência</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} />)
                  : covenants.length === 0
                    ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-slate-400 text-sm">
                          Nenhum convênio encontrado.
                        </td>
                      </tr>
                    )
                    : covenants.map(covenant => (
                      <tr
                        key={covenant.id}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => openDetail(covenant)}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-slate-700 whitespace-nowrap">
                          {covenant.number}
                        </td>
                        <td className="px-4 py-3 text-slate-800 max-w-[220px] truncate">
                          {covenant.proponent?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap hidden md:table-cell">
                          {covenant.covenantType?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800 whitespace-nowrap hidden sm:table-cell">
                          {formatCurrency(covenant.transferValue)}
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap hidden lg:table-cell">
                          {formatDate(covenant.validityEndDate)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={covenant.status} />
                        </td>
                        <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-400 hover:text-blue-600"
                              title="Editar"
                              onClick={e => openEdit(e, covenant)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-slate-400 hover:text-red-500"
                                title="Excluir"
                                onClick={e => { e.stopPropagation(); setConfirmDeleteId(covenant.id) }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ── */}
        {meta && meta.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
            <span>Página {meta.page} de {meta.totalPages}</span>
            <div className="flex gap-2">
              <Button
                variant="outline" size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline" size="sm"
                disabled={page >= meta.totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Create/Edit dialog ── */}
      <CovenantFormDialog
        key={editing?.id ?? 'new'}
        open={formOpen}
        onOpenChange={closeForm}
        covenant={editing}
      />

      {/* ── Detail sheet ── */}
      <CovenantDetailSheet
        covenantId={sheetId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

      {/* ── Delete confirmation ── */}
      <Dialog open={!!confirmDeleteId} onOpenChange={v => !v && setConfirmDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <DialogTitle className="text-center">Excluir Convênio?</DialogTitle>
            <DialogDescription className="text-center text-sm">
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-2">
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
