import { useState, useRef, useEffect } from 'react'
import type { KeyboardEvent } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Inbox, Send, Headphones,
  LayoutGrid, LayoutList, AlignJustify, BarChart2,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useMe } from '@/hooks/useMe'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  useSupportRequests,
  useSupportMessages,
  useSendSupportMessage,
  useUpdateSupportStatus,
  useSupportInsights,
} from '@/hooks/useSupport'
import type { SupportRequest, SupportStatus, SupportInsights } from '@/lib/api/support'

// ─── Recharts formatter types ─────────────────────────────────────────────────
// Mirrors recharts/types/component/DefaultTooltipContent.d.ts exactly.
// Defined locally to avoid depending on recharts internal path exports.
type ChartValue = number | string | ReadonlyArray<number | string>
type ChartName  = number | string

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<SupportStatus, string> = {
  OPEN:        'Aberto',
  IN_PROGRESS: 'Em andamento',
  RESOLVED:    'Resolvido',
  CLOSED:      'Encerrado',
}

const STATUS_COLORS: Record<SupportStatus, string> = {
  OPEN:        'bg-blue-50 text-blue-700',
  IN_PROGRESS: 'bg-amber-50 text-amber-700',
  RESOLVED:    'bg-green-50 text-green-700',
  CLOSED:      'bg-gray-100 text-gray-500',
}

const STATUS_CHART_FILL: Record<string, string> = {
  OPEN:        '#3b82f6',
  IN_PROGRESS: '#f59e0b',
  RESOLVED:    '#22c55e',
  CLOSED:      '#9ca3af',
}

const TYPE_CHART_FILL: Record<string, string> = {
  CHAT:   '#3b82f6',
  TICKET: '#8b5cf6',
}

type TabStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'
type ViewMode  = 'grid' | 'detailed' | 'list'
type MainTab   = 'inbox' | 'insights'

// ─── Request list sub-views ───────────────────────────────────────────────────

interface RequestListProps {
  requests: SupportRequest[]
  selected: SupportRequest | null
  onSelect: (req: SupportRequest) => void
}

function GridView({ requests, selected, onSelect }: RequestListProps) {
  return (
    <div className="grid grid-cols-2 gap-1.5 p-2">
      {requests.map(req => {
        const isSelected = selected?.id === req.id
        const authorName = req.author?.firstName
          ? `${req.author.firstName} ${req.author.lastName ?? ''}`.trim()
          : 'Usuário'
        return (
          <button
            key={req.id}
            onClick={() => onSelect(req)}
            className={cn(
              'flex flex-col gap-1.5 rounded-lg border p-2.5 text-left transition-colors',
              isSelected
                ? 'border-primary/30 bg-primary text-primary-foreground'
                : 'border-border bg-card hover:bg-accent',
            )}
          >
            <div className="flex items-center justify-between gap-1">
              <span className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                isSelected
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : req.type === 'CHAT'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-violet-100 text-violet-700',
              )}>
                {req.type === 'CHAT' ? 'Chat' : 'Ticket'}
              </span>
              {req.status === 'OPEN' && !isSelected && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
              )}
            </div>
            <p className={cn('truncate text-xs font-semibold', isSelected && 'text-primary-foreground')}>
              {authorName}
            </p>
            <p className={cn('truncate text-[10px]', isSelected ? 'text-primary-foreground/60' : 'text-muted-foreground')}>
              {req.subject ?? (req.type === 'CHAT' ? 'Chat ao vivo' : 'Sem assunto')}
            </p>
            <p className={cn('text-[10px]', isSelected ? 'text-primary-foreground/50' : 'text-muted-foreground/70')}>
              {formatDistanceToNow(new Date(req.updatedAt), { locale: ptBR })}
            </p>
          </button>
        )
      })}
    </div>
  )
}

function DetailedView({ requests, selected, onSelect }: RequestListProps) {
  return (
    <div className="space-y-px p-2">
      {requests.map(req => {
        const isSelected = selected?.id === req.id
        const isNew      = req.status === 'OPEN'
        const authorName = req.author?.firstName
          ? `${req.author.firstName} ${req.author.lastName ?? ''}`.trim()
          : 'Usuário'
        const msgCount = req._count?.messages ?? 0
        return (
          <button
            key={req.id}
            onClick={() => onSelect(req)}
            className={cn(
              'w-full rounded-lg px-3 py-2.5 text-left transition-colors',
              isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {isNew && !isSelected && (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                  )}
                  <p className={cn('truncate text-xs font-semibold', isSelected && 'text-primary-foreground')}>
                    {authorName}
                  </p>
                </div>
                <p className={cn('truncate text-xs', isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                  {req.subject ?? (req.type === 'CHAT' ? 'Chat ao vivo' : 'Sem assunto')}
                </p>
                <p className={cn('text-[10px]', isSelected ? 'text-primary-foreground/50' : 'text-muted-foreground/60')}>
                  {msgCount} {msgCount === 1 ? 'mensagem' : 'mensagens'} · {formatDistanceToNow(new Date(req.updatedAt), { locale: ptBR })}
                </p>
              </div>
              <span className={cn(
                'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                isSelected
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : req.type === 'CHAT' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700',
              )}>
                {req.type === 'CHAT' ? 'Chat' : 'Ticket'}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function ListView({ requests, selected, onSelect }: RequestListProps) {
  return (
    <div className="flex flex-col divide-y">
      {requests.map(req => {
        const isSelected = selected?.id === req.id
        const authorName = req.author?.firstName
          ? `${req.author.firstName} ${req.author.lastName ?? ''}`.trim()
          : 'Usuário'
        return (
          <button
            key={req.id}
            onClick={() => onSelect(req)}
            className={cn(
              'flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors',
              isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
            )}
          >
            <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', req.status === 'OPEN' && !isSelected ? 'bg-blue-500' : 'bg-transparent')} />
            <p className={cn('w-24 shrink-0 truncate text-xs font-medium', isSelected && 'text-primary-foreground')}>
              {authorName}
            </p>
            <p className={cn('min-w-0 flex-1 truncate text-xs', isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
              {req.subject ?? (req.type === 'CHAT' ? 'Chat ao vivo' : '—')}
            </p>
            <span className={cn('shrink-0 text-[10px]', isSelected ? 'text-primary-foreground/60' : 'text-muted-foreground')}>
              {formatDistanceToNow(new Date(req.updatedAt), { locale: ptBR })}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Insights Dashboard ───────────────────────────────────────────────────────

function InsightsDashboard({ data }: { data?: SupportInsights }) {
  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando métricas...</p>
      </div>
    )
  }

  const total = data.byStatus.reduce((s, d) => s + d.count, 0)

  const statusData = data.byStatus.map(d => ({
    name:  STATUS_LABELS[d.status as SupportStatus] ?? d.status,
    value: d.count,
    fill:  STATUS_CHART_FILL[d.status] ?? '#9ca3af',
  }))

  const typeData = data.byType.map(d => ({
    name:  d.type === 'CHAT' ? 'Chat' : 'Ticket',
    value: d.count,
    fill:  TYPE_CHART_FILL[d.type] ?? '#6b7280',
  }))

  return (
    <div className="flex-1 overflow-auto bg-muted/5 p-6">
      <div className="mx-auto max-w-3xl space-y-6">

        <div>
          <h2 className="text-sm font-semibold">Visão Geral</h2>
          <p className="text-xs text-muted-foreground">{total} chamados no total</p>
        </div>

        {total === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border bg-card text-muted-foreground">
            <BarChart2 className="h-8 w-8 opacity-30" />
            <p className="text-sm">Nenhum dado disponível ainda</p>
          </div>
        ) : (
          <>
            {/* Charts row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border bg-card p-4">
                <p className="mb-3 text-xs font-semibold">Distribuição por Status</p>
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="45%"
                      innerRadius={42}
                      outerRadius={66}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: ChartValue | undefined, name: ChartName | undefined) => [value, name]}
                      contentStyle={{ fontSize: 11 }}
                    />
                    <Legend
                      iconSize={8}
                      iconType="circle"
                      wrapperStyle={{ fontSize: 10 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <p className="mb-3 text-xs font-semibold">Tickets vs Chats</p>
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={typeData} barSize={40}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip
                      formatter={(value: ChartValue | undefined) => [value, 'chamados']}
                      contentStyle={{ fontSize: 11 }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {typeData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Status summary cards */}
            <div className="grid grid-cols-4 gap-3">
              {(Object.entries(STATUS_LABELS) as [SupportStatus, string][]).map(([status, label]) => {
                const found = data.byStatus.find(d => d.status === status)
                return (
                  <div key={status} className="rounded-lg border bg-card p-3 text-center">
                    <p className={cn('text-xl font-bold', {
                      'text-blue-600':  status === 'OPEN',
                      'text-amber-600': status === 'IN_PROGRESS',
                      'text-green-600': status === 'RESOLVED',
                      'text-gray-400':  status === 'CLOSED',
                    })}>
                      {found?.count ?? 0}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SupportAdminPage() {
  const { data: me, isLoading: meLoading } = useMe()

  const [mainTab,   setMainTab]   = useState<MainTab>('inbox')
  const [activeTab, setActiveTab] = useState<TabStatus>('OPEN')
  const [selected,  setSelected]  = useState<SupportRequest | null>(null)
  const [viewMode,  setViewMode]  = useState<ViewMode>('detailed')
  const [draft,     setDraft]     = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // All hooks must run before any conditional return
  const { data: listData, isLoading: listLoading } = useSupportRequests({
    status: activeTab,
    limit:  50,
  })

  const { data: messagesData } = useSupportMessages(selected?.id ?? null, !!selected)
  const { data: insightsData } = useSupportInsights()
  const { mutate: sendMessage, isPending: sending } = useSendSupportMessage(selected?.id ?? null)
  const { mutate: updateStatus }                    = useUpdateSupportStatus()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messagesData?.data?.length])

  if (!meLoading && !me?.user?.isSuperAdmin) {
    return <Navigate to="/" replace />
  }

  const requests      = listData?.data ?? []
  const messages      = messagesData?.data ?? []
  const currentUserId = me?.user?.id
  const isClosed      = selected?.status === 'CLOSED' || selected?.status === 'RESOLVED'

  function handleTabChange(tab: string) {
    setActiveTab(tab as TabStatus)
    setSelected(null)
  }

  function handleSend() {
    const content = draft.trim()
    if (!content || sending || !selected) return
    sendMessage({ content }, { onSuccess: () => setDraft('') })
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleStatusChange(val: string) {
    if (!selected) return
    const status = val as SupportStatus
    updateStatus(
      { requestId: selected.id, status },
      { onSuccess: () => setSelected(prev => prev ? { ...prev, status } : prev) },
    )
  }

  return (
    <div className="flex h-full flex-col -m-6 overflow-hidden">

      {/* ── Top nav ──────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-stretch border-b bg-background">
        <div className="flex items-center gap-2 px-4 py-3.5">
          <Inbox className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Central de Suporte</span>
        </div>

        <div className="flex items-end">
          {(['inbox', 'insights'] as MainTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setMainTab(tab)}
              className={cn(
                'flex items-center gap-1.5 border-b-2 px-4 pb-3.5 pt-3.5 text-xs font-medium transition-colors',
                mainTab === tab
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab === 'inbox'
                ? <Inbox className="h-3.5 w-3.5" />
                : <BarChart2 className="h-3.5 w-3.5" />
              }
              {tab === 'inbox' ? 'Inbox' : 'Métricas'}
            </button>
          ))}
        </div>
      </div>

      {mainTab === 'inbox' ? (
        <div className="flex flex-1 overflow-hidden">

          {/* ── Left column — Inbox list ──────────────────────────────── */}
          <div className="flex w-80 shrink-0 flex-col border-r bg-background">

            {/* Status tabs + view toggles */}
            <div className="flex items-center gap-2 border-b px-3 py-2">
              <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1">
                <TabsList className="grid w-auto grid-cols-3">
                  <TabsTrigger value="OPEN"        className="text-xs">Abertos</TabsTrigger>
                  <TabsTrigger value="IN_PROGRESS" className="text-xs">Andamento</TabsTrigger>
                  <TabsTrigger value="RESOLVED"    className="text-xs">Resolvidos</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  title="Grade"
                  className={cn('rounded p-1 text-muted-foreground transition-colors hover:text-foreground', viewMode === 'grid' && 'bg-accent text-foreground')}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('detailed')}
                  title="Detalhado"
                  className={cn('rounded p-1 text-muted-foreground transition-colors hover:text-foreground', viewMode === 'detailed' && 'bg-accent text-foreground')}
                >
                  <LayoutList className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  title="Lista compacta"
                  className={cn('rounded p-1 text-muted-foreground transition-colors hover:text-foreground', viewMode === 'list' && 'bg-accent text-foreground')}
                >
                  <AlignJustify className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              {listLoading ? (
                <div className="space-y-1.5 p-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-[60px] animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              ) : requests.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                  <Inbox className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Nenhum chamado aqui</p>
                </div>
              ) : viewMode === 'grid' ? (
                <GridView requests={requests} selected={selected} onSelect={setSelected} />
              ) : viewMode === 'list' ? (
                <ListView requests={requests} selected={selected} onSelect={setSelected} />
              ) : (
                <DetailedView requests={requests} selected={selected} onSelect={setSelected} />
              )}
            </ScrollArea>
          </div>

          {/* ── Right column — Conversation ───────────────────────────── */}
          <div className="flex flex-1 flex-col overflow-hidden bg-muted/10">
            {!selected ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Headphones className="h-7 w-7 opacity-40" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Nenhuma conversa selecionada</p>
                  <p className="mt-0.5 text-xs opacity-70">
                    Selecione um chamado para iniciar o atendimento
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Conversation header */}
                <div className="flex items-center gap-4 border-b bg-background px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {selected.author?.firstName
                        ? `${selected.author.firstName} ${selected.author.lastName ?? ''}`.trim()
                        : 'Usuário'}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-medium',
                        selected.type === 'CHAT' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700',
                      )}>
                        {selected.type === 'CHAT' ? 'Chat' : 'Ticket'}
                      </span>
                      {selected.subject && (
                        <span className="truncate text-xs text-muted-foreground">
                          {selected.subject}
                        </span>
                      )}
                    </div>
                  </div>

                  <Select value={selected.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="h-8 w-44 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(STATUS_LABELS) as [SupportStatus, string][]).map(([val, label]) => (
                        <SelectItem key={val} value={val} className="text-xs">
                          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', STATUS_COLORS[val])}>
                            {label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 px-5">
                  <div className="flex flex-col gap-3 py-5">
                    {messages.map(msg => {
                      const isMe = msg.senderId === currentUserId
                      return (
                        <div key={msg.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
                          {!isMe && (
                            <div className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold uppercase text-muted-foreground">
                              {msg.sender?.firstName?.[0] ?? 'U'}
                            </div>
                          )}
                          <div className={cn(
                            'max-w-[65%] rounded-2xl px-4 py-2.5 text-sm',
                            isMe
                              ? 'rounded-br-sm bg-primary text-primary-foreground'
                              : 'rounded-bl-sm bg-background text-foreground shadow-sm',
                          )}>
                            {!isMe && (
                              <p className="mb-0.5 text-[10px] font-semibold opacity-60">
                                {msg.sender?.firstName ?? 'Usuário'}
                              </p>
                            )}
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                            <p className={cn('mt-1 text-[10px] opacity-50', isMe && 'text-right')}>
                              {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={bottomRef} />
                  </div>
                </ScrollArea>

                {/* Reply footer */}
                <div className="border-t bg-background p-4">
                  {isClosed ? (
                    <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-2.5">
                      <p className="text-sm text-muted-foreground">
                        Chamado encerrado. Altere o status acima para reabrir.
                      </p>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Escreva uma resposta..."
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={sending}
                        className="flex-1 text-sm"
                      />
                      <Button
                        onClick={handleSend}
                        disabled={!draft.trim() || sending}
                        size="sm"
                        className="gap-1.5"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Enviar
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        /* ── Métricas tab ────────────────────────────────────────────── */
        <InsightsDashboard data={insightsData} />
      )}
    </div>
  )
}
