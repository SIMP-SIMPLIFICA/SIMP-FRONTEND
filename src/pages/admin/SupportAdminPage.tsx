import { useState, useRef, useEffect } from 'react'
import type { KeyboardEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Inbox, Send, Headphones } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
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
} from '@/hooks/useSupport'
import type { SupportRequest, SupportStatus } from '@/lib/api/support'

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

type TabStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SupportAdminPage() {
  const { data: me, isLoading: meLoading } = useMe()

  const [activeTab, setActiveTab] = useState<TabStatus>('OPEN')
  const [selected,  setSelected]  = useState<SupportRequest | null>(null)
  const [draft,     setDraft]     = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // All hooks must run before any conditional return
  const { data: listData, isLoading: listLoading } = useSupportRequests({
    status: activeTab,
    limit:  50,
  })

  const { data: messagesData } = useSupportMessages(selected?.id ?? null, !!selected)
  const { mutate: sendMessage, isPending: sending } = useSendSupportMessage(selected?.id ?? null)
  const { mutate: updateStatus }                    = useUpdateSupportStatus()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messagesData?.data?.length])

  // Redirect non-superAdmins after all hooks have been called
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
    <div className="flex h-full -m-6 overflow-hidden">

      {/* ── Left column — Inbox list ──────────────────────────────────── */}
      <div className="flex w-80 shrink-0 flex-col border-r bg-background">

        <div className="border-b px-4 py-3.5">
          <h1 className="flex items-center gap-2 text-sm font-semibold">
            <Inbox className="h-4 w-4 text-muted-foreground" />
            Central de Suporte
          </h1>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mx-3 mt-3 grid w-auto grid-cols-3 text-xs">
            <TabsTrigger value="OPEN"        className="text-xs">Abertos</TabsTrigger>
            <TabsTrigger value="IN_PROGRESS" className="text-xs">Andamento</TabsTrigger>
            <TabsTrigger value="RESOLVED"    className="text-xs">Resolvidos</TabsTrigger>
          </TabsList>
        </Tabs>

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
          ) : (
            <div className="space-y-px p-2">
              {requests.map(req => {
                const isSelected = selected?.id === req.id
                const isNew      = req.status === 'OPEN'
                const authorName = req.author?.firstName
                  ? `${req.author.firstName} ${req.author.lastName ?? ''}`.trim()
                  : 'Usuário'

                return (
                  <button
                    key={req.id}
                    onClick={() => setSelected(req)}
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
                          <p className={cn(
                            'truncate text-xs font-semibold',
                            isSelected && 'text-primary-foreground',
                          )}>
                            {authorName}
                          </p>
                        </div>
                        <p className={cn(
                          'truncate text-xs',
                          isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground',
                        )}>
                          {req.subject ?? (req.type === 'CHAT' ? 'Chat ao vivo' : 'Sem assunto')}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1">
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
                        <span className={cn(
                          'text-[10px]',
                          isSelected ? 'text-primary-foreground/60' : 'text-muted-foreground',
                        )}>
                          {formatDistanceToNow(new Date(req.updatedAt), { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* ── Right column — Conversation ───────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden bg-muted/10">
        {!selected ? (

          /* Empty state */
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

              {/* Status selector */}
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
  )
}
