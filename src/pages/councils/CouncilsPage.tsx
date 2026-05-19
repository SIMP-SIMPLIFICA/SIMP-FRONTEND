import { useState } from 'react'
import { Search, Plus, Users, ChevronRight, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useCouncils } from '@/hooks/useCouncils'
import type { Council } from '@/lib/api/councils'

// ── Active status config ──────────────────────────────────────────────────────

const ACTIVE_CONFIG: Record<'true' | 'false', { label: string; className: string }> = {
  true:  { label: 'Ativo',   className: 'bg-emerald-100 text-emerald-700' },
  false: { label: 'Inativo', className: 'bg-slate-100   text-slate-500'   },
}

function ActiveBadge({ isActive }: { isActive: boolean }) {
  const cfg = ACTIVE_CONFIG[String(isActive) as 'true' | 'false']
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

// ── Row skeleton ──────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <tr className="border-b border-slate-100">
      <td className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
      <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-4 w-20" /></td>
      <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
      <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-10" /></td>
      <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-28" /></td>
    </tr>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type ActiveFilter = 'ALL' | 'true' | 'false'

export default function CouncilsPage() {
  const navigate = useNavigate()

  const [search, setSearch]             = useState('')
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('ALL')
  const [page, setPage]                 = useState(1)

  const { data, isLoading, isError } = useCouncils({
    page,
    limit:    20,
    search:   search || undefined,
    isActive: activeFilter !== 'ALL' ? activeFilter === 'true' : undefined,
  })

  const councils = data?.data ?? []
  const meta     = data?.meta

  function handleRowClick(council: Council) {
    navigate(`/conselhos/${council.id}`)
  }

  return (
    <div className="flex flex-col h-full max-w-screen-2xl mx-auto w-full">
      {/* ── Header ── */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <nav className="mb-1 flex items-center gap-1 text-xs text-slate-400">
          <span>Início</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-600 font-medium">Conselhos Municipais</span>
        </nav>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
              <Users className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Conselhos Municipais</h1>
              <p className="text-xs text-slate-500">Gestão de conselhos, membros e reuniões</p>
            </div>
          </div>
          {/* TODO: wire up create-council modal */}
          <Button
            size="sm"
            className="gap-1.5 bg-violet-600 hover:bg-violet-700"
            disabled
          >
            <Plus className="h-4 w-4" />
            Novo Conselho
          </Button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="border-b border-slate-100 bg-slate-50 px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar por nome ou sigla…"
              className="pl-9 h-8 text-sm bg-white"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>

          <Select
            value={activeFilter}
            onValueChange={v => { setActiveFilter(v as ActiveFilter); setPage(1) }}
          >
            <SelectTrigger className="h-8 w-40 text-sm bg-white">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="true">Ativos</SelectItem>
              <SelectItem value="false">Inativos</SelectItem>
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
            <p className="text-sm">Falha ao carregar conselhos.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Nome</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 hidden sm:table-cell">Sigla</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600 hidden md:table-cell">Nº de Membros</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 hidden lg:table-cell">Próxima Reunião</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)
                  : councils.length === 0
                    ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center text-slate-400 text-sm">
                          Nenhum conselho encontrado.
                        </td>
                      </tr>
                    )
                    : councils.map(council => (
                      <tr
                        key={council.id}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => handleRowClick(council)}
                      >
                        <td className="px-4 py-3 text-slate-800 max-w-[280px] truncate font-medium">
                          {council.name}
                        </td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap hidden sm:table-cell">
                          {council.acronym ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <ActiveBadge isActive={council.isActive} />
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700 whitespace-nowrap hidden md:table-cell">
                          {council._count?.memberships ?? 0}
                        </td>
                        {/* TODO: list endpoint doesn't return meetings — populate after detail page */}
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap hidden lg:table-cell">
                          —
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
    </div>
  )
}
