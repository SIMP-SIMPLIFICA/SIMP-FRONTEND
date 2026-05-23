import { useRef, useEffect, useState } from 'react'
import type { KeyboardEvent } from 'react'
import {
  MessageCircle,
  X,
  ChevronLeft,
  Send,
  Headphones,
  TicketCheck,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import {
  useSupportRequests,
  useSupportMessages,
  useCreateSupportRequest,
  useSendSupportMessage,
} from '@/hooks/useSupport'
import type { SupportRequest, SupportType } from '@/lib/api/support'
import { cn } from '@/lib/utils'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  OPEN:        'Aberto',
  IN_PROGRESS: 'Em andamento',
  RESOLVED:    'Resolvido',
  CLOSED:      'Encerrado',
}

const STATUS_VARIANTS: Record<string, string> = {
  OPEN:        'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  RESOLVED:    'bg-green-100 text-green-700',
  CLOSED:      'bg-gray-100 text-gray-500',
}

// ─── View types ───────────────────────────────────────────────────────────────

type View = 'home' | 'new-ticket' | 'chat'

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_VARIANTS[status] ?? 'bg-gray-100 text-gray-500')}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

// ─── Home View ────────────────────────────────────────────────────────────────

interface HomeViewProps {
  onNewTicket: () => void
  onNewChat:   () => void
  onOpenChat:  (req: SupportRequest) => void
}

function HomeView({ onNewTicket, onNewChat, onOpenChat }: HomeViewProps) {
  const { data } = useSupportRequests({ limit: 5 })
  const recents  = data?.data.filter(r => r.status !== 'CLOSED') ?? []

  return (
    <div className="flex flex-col gap-4 p-4">
      <p className="text-sm text-muted-foreground">Como podemos te ajudar hoje?</p>

      <div className="flex flex-col gap-2">
        <button
          onClick={onNewChat}
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-accent"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <Headphones className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium">Conversar ao vivo</p>
            <p className="text-xs text-muted-foreground">Inicie um bate-papo com o suporte</p>
          </div>
        </button>

        <button
          onClick={onNewTicket}
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-accent"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-violet-600">
            <TicketCheck className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium">Abrir chamado</p>
            <p className="text-xs text-muted-foreground">Registre um ticket de suporte</p>
          </div>
        </button>
      </div>

      {recents.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Seus chamados
          </p>
          <div className="flex flex-col gap-1">
            {recents.map(req => (
              <button
                key={req.id}
                onClick={() => onOpenChat(req)}
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    {req.subject ?? (req.type === 'CHAT' ? 'Chat' : 'Chamado sem título')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(req.updatedAt), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
                <StatusBadge status={req.status} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── New Ticket View ──────────────────────────────────────────────────────────

interface NewTicketViewProps {
  type:   SupportType
  onDone: (req: SupportRequest) => void
}

function NewTicketView({ type, onDone }: NewTicketViewProps) {
  const [subject,     setSubject]     = useState('')
  const [description, setDescription] = useState('')
  const { mutate, isPending } = useCreateSupportRequest()

  function handleSubmit() {
    if (!description.trim()) return
    if (type === 'TICKET' && !subject.trim()) return

    mutate(
      { type, subject: subject.trim() || undefined, message: description.trim() },
      { onSuccess: onDone },
    )
  }

  const isTicket = type === 'TICKET'

  return (
    <div className="flex flex-col gap-4 p-4">
      {isTicket && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium">Assunto</label>
          <Input
            placeholder="Descreva o problema brevemente"
            value={subject}
            onChange={e => setSubject(e.target.value)}
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium">
          {isTicket ? 'Descrição' : 'Como podemos ajudar?'}
        </label>
        <Textarea
          placeholder="Descreva com mais detalhes..."
          rows={4}
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isPending || !description.trim() || (isTicket && !subject.trim())}
        className="w-full"
        size="sm"
      >
        {isPending ? 'Enviando...' : isTicket ? 'Abrir chamado' : 'Iniciar conversa'}
      </Button>
    </div>
  )
}

// ─── Chat View ────────────────────────────────────────────────────────────────

interface ChatViewProps {
  request:   SupportRequest
  currentId: string
  isOpen:    boolean
}

function ChatView({ request, currentId, isOpen }: ChatViewProps) {
  const [draft, setDraft] = useState('')
  const bottomRef         = useRef<HTMLDivElement>(null)
  const { data, isLoading } = useSupportMessages(request.id, isOpen)
  const { mutate, isPending } = useSendSupportMessage(request.id)

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [data?.data.length])

  function handleSend() {
    const content = draft.trim()
    if (!content || isPending) return
    mutate({ content }, { onSuccess: () => setDraft('') })
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isClosed = request.status === 'CLOSED' || request.status === 'RESOLVED'

  return (
    <div className="flex flex-col" style={{ height: 360 }}>
      {/* Messages */}
      <ScrollArea className="flex-1 px-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-xs text-muted-foreground">Carregando...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 py-3">
            {data?.data.map(msg => {
              const isMe = msg.senderId === currentId
              return (
                <div key={msg.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[78%] rounded-2xl px-3 py-2 text-sm',
                      isMe
                        ? 'rounded-br-sm bg-primary text-primary-foreground'
                        : 'rounded-bl-sm bg-muted text-foreground',
                    )}
                  >
                    {!isMe && (
                      <p className="mb-0.5 text-[10px] font-semibold opacity-60">
                        {msg.sender?.firstName ?? 'Suporte'}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p className={cn('mt-0.5 text-[10px] opacity-50', isMe ? 'text-right' : '')}>
                      {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-3">
        {isClosed ? (
          <p className="text-center text-xs text-muted-foreground">Este chamado está encerrado.</p>
        ) : (
          <div className="flex gap-2">
            <Input
              placeholder="Digite sua mensagem..."
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isPending}
              className="h-8 text-sm"
            />
            <Button
              size="sm"
              className="h-8 w-8 shrink-0 p-0"
              onClick={handleSend}
              disabled={!draft.trim() || isPending}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Widget ──────────────────────────────────────────────────────────────

export function SupportWidget() {
  const { user, isSuperAdmin } = useAuth()
  const [isOpen,          setIsOpen]          = useState(false)
  const [view,            setView]            = useState<View>('home')
  const [newType,         setNewType]         = useState<SupportType>('TICKET')
  const [activeRequest,   setActiveRequest]   = useState<SupportRequest | null>(null)

  // SuperAdmins use the dedicated admin panel — hide the widget for them
  if (isSuperAdmin || !user) return null

  function openNewForm(type: SupportType) {
    setNewType(type)
    setView('new-ticket')
  }

  function openChat(req: SupportRequest) {
    setActiveRequest(req)
    setView('chat')
  }

  function handleCreated(req: SupportRequest) {
    openChat(req)
  }

  function goHome() {
    setView('home')
    setActiveRequest(null)
  }

  function handleOpenChange(open: boolean) {
    setIsOpen(open)
    if (!open) {
      // Reset to home after close animation
      setTimeout(goHome, 200)
    }
  }

  const headerTitle =
    view === 'home'       ? 'Suporte'          :
    view === 'new-ticket' ? (newType === 'TICKET' ? 'Novo chamado' : 'Novo chat') :
    (activeRequest?.subject ?? (activeRequest?.type === 'CHAT' ? 'Chat' : 'Chamado'))

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg"
            aria-label="Abrir suporte"
          >
            <MessageCircle className="h-5 w-5" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          side="top"
          align="end"
          sideOffset={12}
          className="w-[380px] p-0 shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center gap-2 border-b px-4 py-3">
            {view !== 'home' && (
              <button
                onClick={goHome}
                className="mr-1 rounded p-0.5 transition-colors hover:bg-accent"
                aria-label="Voltar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <span className="flex-1 truncate text-sm font-semibold">{headerTitle}</span>
            {view === 'chat' && activeRequest && (
              <StatusBadge status={activeRequest.status} />
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="rounded p-0.5 transition-colors hover:bg-accent"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          {view === 'home' && (
            <HomeView
              onNewTicket={() => openNewForm('TICKET')}
              onNewChat={()   => openNewForm('CHAT')}
              onOpenChat={openChat}
            />
          )}

          {view === 'new-ticket' && (
            <NewTicketView
              type={newType}
              onDone={handleCreated}
            />
          )}

          {view === 'chat' && activeRequest && (
            <ChatView
              request={activeRequest}
              currentId={user.id}
              isOpen={isOpen}
            />
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
