import { useState, useEffect, useRef } from "react"
import {
  Bell,
  Settings,
  X,
  CheckCheck,
  ChevronLeft,
  DollarSign,
  Users,
  FileText,
  Calendar,
  AlertCircle,
  ClipboardList,
  MessageSquare,
  Building2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToastAction } from "@/components/ui/toast"
import { api } from "@/lib/api"
import { useNavigate } from "react-router-dom"
import { useToast } from "@/hooks/use-toast"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Notification {
  id: string
  title: string
  message: string
  read: boolean
  link?: string
  entityId?: string
  createdAt: string
  type: string
}

interface Preferences {
  emailNotifications: boolean
  autoClearDays: number
}

// ─── Type → icon / color mapping ─────────────────────────────────────────────

interface TypeConfig {
  icon: React.ReactNode
  color: string
}

const TYPE_MAP: Record<string, TypeConfig> = {
  FINANCE:    { icon: <DollarSign size={13} />,   color: "bg-emerald-100 text-emerald-600" },
  finance:    { icon: <DollarSign size={13} />,   color: "bg-emerald-100 text-emerald-600" },
  WORKSPACE:  { icon: <Users size={13} />,         color: "bg-blue-100 text-blue-600" },
  workspace:  { icon: <Users size={13} />,         color: "bg-blue-100 text-blue-600" },
  TASK_STATUS:{ icon: <ClipboardList size={13} />, color: "bg-violet-100 text-violet-600" },
  task:       { icon: <ClipboardList size={13} />, color: "bg-violet-100 text-violet-600" },
  DOCUMENT:   { icon: <FileText size={13} />,      color: "bg-amber-100 text-amber-600" },
  document:   { icon: <FileText size={13} />,      color: "bg-amber-100 text-amber-600" },
  CALENDAR:   { icon: <Calendar size={13} />,      color: "bg-pink-100 text-pink-600" },
  calendar:   { icon: <Calendar size={13} />,      color: "bg-pink-100 text-pink-600" },
  MESSAGE:    { icon: <MessageSquare size={13} />, color: "bg-sky-100 text-sky-600" },
  message:    { icon: <MessageSquare size={13} />, color: "bg-sky-100 text-sky-600" },
  PROCESS:    { icon: <Building2 size={13} />,     color: "bg-orange-100 text-orange-600" },
  process:    { icon: <Building2 size={13} />,     color: "bg-orange-100 text-orange-600" },
}

const DEFAULT_TYPE_CONFIG: TypeConfig = {
  icon: <AlertCircle size={13} />,
  color: "bg-gray-100 text-gray-500",
}

function getTypeConfig(type: string): TypeConfig {
  return TYPE_MAP[type] ?? DEFAULT_TYPE_CONFIG
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60_000)
  const h = Math.floor(diff / 3_600_000)
  const d = Math.floor(diff / 86_400_000)

  if (m < 1)  return "agora"
  if (m < 60) return `${m}m`
  if (h < 24) return `${h}h`
  if (d < 7)  return `${d}d`
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}

// ─── Sub-component: lista de notificações ────────────────────────────────────

interface NotificationListProps {
  items: Notification[]
  onItemClick: (n: Notification) => void
  onDelete: (e: React.MouseEvent, id: string) => void
  emptyLabel?: string
}

function NotificationList({ items, onItemClick, onDelete, emptyLabel }: NotificationListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <Bell size={28} className="text-gray-200" />
        <p className="text-sm text-gray-400">{emptyLabel ?? "Nenhuma notificação."}</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-50">
      {items.map((n) => {
        const cfg = getTypeConfig(n.type)
        return (
          <div
            key={n.id}
            onClick={() => onItemClick(n)}
            className={`group relative flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-colors hover:bg-gray-50 ${
              !n.read ? "bg-blue-50/40" : ""
            }`}
          >
            {/* Dot de não lida */}
            <span
              className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
                !n.read ? "bg-blue-500" : "bg-transparent"
              }`}
            />

            {/* Ícone de tipo */}
            <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${cfg.color}`}>
              {cfg.icon}
            </span>

            {/* Conteúdo */}
            <div className="min-w-0 flex-1 space-y-0.5 pr-6">
              <p className={`text-sm leading-snug ${!n.read ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                {n.title}
              </p>
              <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{n.message}</p>
              <p className="text-[10px] text-gray-400">{formatRelativeTime(n.createdAt)}</p>
            </div>

            {/* Botão deletar — aparece no hover */}
            <button
              onClick={(e) => onDelete(e, n.id)}
              title="Remover notificação"
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full text-gray-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
            >
              <X size={13} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount]     = useState(0)
  const [isOpen, setIsOpen]               = useState(false)
  const [view, setView]                   = useState<"list" | "settings">("list")
  const [prefs, setPrefs]                 = useState<Preferences>({
    emailNotifications: true,
    autoClearDays: 30,
  })

  const navigate = useNavigate()
  const { toast } = useToast()
  const eventSourceRef  = useRef<EventSource | null>(null)
  const sseErrorCount   = useRef(0)
  const pollFallbackRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Fetch inicial ──────────────────────────────────────────────────────────

  const fetchNotifications = async () => {
    try {
      const res = await api.get<{ data: Notification[]; unreadCount: number }>("/notifications")
      setNotifications(res.data.data)
      setUnreadCount(res.data.unreadCount)
    } catch {
      // silent — retry on next poll
    }
  }

  // ── SSE ───────────────────────────────────────────────────────────────────
  // Strategy:
  //   1. Exchange the Bearer JWT for a short-lived single-use nonce (POST /notifications/stream-token).
  //      The nonce — not the JWT — goes in the EventSource URL, keeping the JWT out of server logs.
  //   2. On connection error, close the stale EventSource and re-init with a fresh nonce
  //      (backoff: 1s × attempt, max 10s).
  //   3. After MAX_SSE_ERRORS consecutive init failures, degrade to 30-second polling.

  const MAX_SSE_ERRORS = 3
  const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

  // useRef wrapper so the closure inside onerror can call the latest version
  const initSSERef = useRef<(() => Promise<void>) | undefined>(undefined)

  const initSSE = async () => {
    // Clear any pending retry timer
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }

    let nonce: string
    try {
      const res = await api.post<{ token: string }>("/notifications/stream-token", {})
      nonce = res.data.token
    } catch {
      // Could not obtain nonce (network error, auth failure) — fall back to polling
      sseErrorCount.current += 1
      if (sseErrorCount.current >= MAX_SSE_ERRORS) {
        pollFallbackRef.current = setInterval(fetchNotifications, 30_000)
      } else {
        const delay = Math.min(1_000 * sseErrorCount.current, 10_000)
        retryTimeoutRef.current = setTimeout(() => initSSERef.current?.(), delay)
      }
      return
    }

    const es = new EventSource(`${API_URL}/notifications/stream?token=${nonce}`)

    es.onopen = () => {
      sseErrorCount.current = 0
    }

    es.onmessage = (event) => {
      if (!event.data || event.data.startsWith("retry")) return
      try {
        const incoming: Notification = JSON.parse(event.data)
        setNotifications((prev) => [incoming, ...prev])
        setUnreadCount((prev) => prev + 1)
        toast({
          title: incoming.title,
          description: incoming.message,
          duration: 6000,
          action: incoming.link ? (
            <ToastAction altText="Ver" onClick={() => navigate(incoming.link!)}>
              Ver
            </ToastAction>
          ) : undefined,
        })
      } catch {
        // malformed SSE payload — ignore
      }
    }

    es.onerror = () => {
      // The nonce is single-use: after the first connection the server has consumed
      // it, so browser auto-reconnect with the same URL would get a 401.
      // Close and re-init with a fresh nonce instead.
      es.close()
      sseErrorCount.current += 1

      if (sseErrorCount.current >= MAX_SSE_ERRORS) {
        console.warn(
          `[Notifications] SSE failed after ${MAX_SSE_ERRORS} attempts — ` +
          "falling back to 30s polling."
        )
        pollFallbackRef.current = setInterval(fetchNotifications, 30_000)
        return
      }

      const delay = Math.min(1_000 * sseErrorCount.current, 10_000)
      retryTimeoutRef.current = setTimeout(() => initSSERef.current?.(), delay)
    }

    eventSourceRef.current = es
  }

  initSSERef.current = initSSE

  useEffect(() => {
    fetchNotifications()
    initSSE()

    return () => {
      eventSourceRef.current?.close()
      if (pollFallbackRef.current) {
        clearInterval(pollFallbackRef.current)
        pollFallbackRef.current = null
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) setView("list")
  }

  /** Deep link otimista: marca como lida localmente e navega sem esperar o PATCH. */
  const handleNotificationClick = (n: Notification) => {
    if (!n.read) {
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
      api.patch(`/notifications/${n.id}/read`, {}).catch(() => {})
    }
    if (n.link) {
      setIsOpen(false)
      navigate(n.link)
    }
  }

  /** Remove otimisticamente e chama DELETE em background. */
  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const target = notifications.find((n) => n.id === id)
    if (target && !target.read) setUnreadCount((c) => Math.max(0, c - 1))
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    api.delete(`/notifications/${id}`).catch(() => {})
  }

  const handleMarkAllRead = async () => {
    await api.patch("/notifications/read-all", {})
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  /** Atualiza preferências de forma otimista: aplica local e bate no backend em background. */
  const handlePrefChange = (patch: Partial<Preferences>) => {
    setPrefs((prev) => ({ ...prev, ...patch }))
    api.patch("/notifications/preferences", patch).catch(() => {})
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const unreadItems = notifications.filter((n) => !n.read)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      {/* Trigger */}
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-gray-500 hover:text-blue-600"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-red-500 text-[9px] font-bold leading-none text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      {/* Popover */}
      <PopoverContent
        className="w-96 overflow-hidden rounded-xl p-0 shadow-xl"
        align="end"
        sideOffset={8}
      >
        {/* ── HEADER ── */}
        <div className="flex items-center justify-between border-b bg-white px-4 py-3">
          {view === "settings" ? (
            <button
              onClick={() => setView("list")}
              className="flex items-center gap-1 text-sm font-semibold text-gray-700 transition-colors hover:text-blue-600"
            >
              <ChevronLeft size={16} />
              Preferências
            </button>
          ) : (
            <>
              <span className="text-sm font-semibold text-gray-800">Notificações</span>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1 text-xs text-blue-600 transition-colors hover:text-blue-700"
                    title="Marcar todas como lidas"
                  >
                    <CheckCheck size={13} />
                    Marcar lidas
                  </button>
                )}
                <button
                  onClick={() => setView("settings")}
                  className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                  title="Preferências de notificação"
                >
                  <Settings size={14} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── SETTINGS VIEW ── */}
        {view === "settings" && (
          <div className="space-y-5 bg-white p-5">
            {/* Toggle: alertas por e-mail */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">Alertas por e-mail</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Receba notificações importantes no seu e-mail
                </p>
              </div>
              <button
                role="switch"
                aria-checked={prefs.emailNotifications}
                onClick={() =>
                  handlePrefChange({ emailNotifications: !prefs.emailNotifications })
                }
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  prefs.emailNotifications ? "bg-blue-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                    prefs.emailNotifications ? "translate-x-[18px]" : "translate-x-[3px]"
                  }`}
                />
              </button>
            </div>

            <div className="border-t border-gray-100" />

            {/* Select: limpeza automática */}
            <div className="space-y-2.5">
              <div>
                <p className="text-sm font-medium text-gray-800">Limpeza automática</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Excluir notificações lidas após
                </p>
              </div>
              <Select
                value={String(prefs.autoClearDays)}
                onValueChange={(val) => handlePrefChange({ autoClearDays: Number(val) })}
              >
                <SelectTrigger className="h-8 w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 dia</SelectItem>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="0">Nunca</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* ── LIST VIEW ── */}
        {view === "list" && (
          <Tabs defaultValue="all" className="bg-white">
            {/* Abas: underline style */}
            <div className="border-b bg-white px-4">
              <TabsList className="h-9 w-full justify-start gap-5 rounded-none bg-transparent p-0">
                <TabsTrigger
                  value="all"
                  className="h-9 rounded-none border-b-2 border-transparent bg-transparent px-0 text-xs font-medium text-gray-500 shadow-none transition-colors data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none"
                >
                  Todas
                </TabsTrigger>
                <TabsTrigger
                  value="unread"
                  className="h-9 rounded-none border-b-2 border-transparent bg-transparent px-0 text-xs font-medium text-gray-500 shadow-none transition-colors data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none"
                >
                  Não lidas
                  {unreadCount > 0 && (
                    <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-100 px-1 text-[10px] font-semibold text-blue-700">
                      {unreadCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="mt-0 focus-visible:outline-none">
              <ScrollArea className="h-[360px]">
                <NotificationList
                  items={notifications}
                  onItemClick={handleNotificationClick}
                  onDelete={handleDelete}
                />
              </ScrollArea>
            </TabsContent>

            <TabsContent value="unread" className="mt-0 focus-visible:outline-none">
              <ScrollArea className="h-[360px]">
                <NotificationList
                  items={unreadItems}
                  onItemClick={handleNotificationClick}
                  onDelete={handleDelete}
                  emptyLabel="Nenhuma notificação não lida."
                />
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </PopoverContent>
    </Popover>
  )
}
