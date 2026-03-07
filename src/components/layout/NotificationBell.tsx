import { useState, useEffect, useRef, useMemo } from "react";
import {
  Bell,
  Send,
  Building,
  FileSearch,
  Trash2,
  Check,
  BellOff,
  X,
  Clock,
  Settings as SettingsIcon,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { getAccessToken } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: string;
  type: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchNotifications = async () => {
    try {
      const response = await api.get<{ data: Notification[], unreadCount: number }>("/notifications");
      setNotifications(response.data.data);
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      console.error("Erro ao buscar notificações", error);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const token = getAccessToken();
    if (!token) return;

    const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
    const es = new EventSource(`${API_URL}/notifications/stream?token=${token}`);

    es.onopen = () => {
      console.log("✅ [SSE] Conectado às notificações");
    };

    es.onmessage = (event) => {
      if (!event.data || event.data.startsWith('retry')) return;

      try {
        const newNotification = JSON.parse(event.data);
        setNotifications((prev) => [newNotification, ...prev]);
        setUnreadCount((prev) => prev + 1);

        toast({
          title: newNotification.title,
          description: newNotification.message,
          duration: 5000,
        });
      } catch (e) {
        console.error("Erro ao processar notificação", e);
      }
    };

    es.onerror = (err) => {
      console.error("❌ [SSE] Erro na conexão", err);
      es.close();
    };

    eventSourceRef.current = es;

    return () => {
      es.close();
    };
  }, []);

  // Filter notifications older than 30 days
  const activeNotifications = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return notifications.filter(n => new Date(n.createdAt) > thirtyDaysAgo);
  }, [notifications]);

  const handleMarkAsRead = async (id: string, link?: string) => {
    try {
      await api.patch(`/notifications/${id}/read`, {});
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));

      if (link) {
        setIsOpen(false);
        navigate(link);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch("/notifications/read-all", {});
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast({ title: "Sucesso", description: "Todas as notificações foram marcadas como lidas." });
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      fetchNotifications();
      toast({ title: "Sucesso", description: "Notificação excluída." });
    } catch (error) {
      console.error(error);
      toast({ title: "Erro", description: "Não foi possível excluir a notificação.", variant: "destructive" });
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm("Tem certeza que deseja excluir todas as notificações?")) return;
    try {
      await api.delete("/notifications");
      setNotifications([]);
      setUnreadCount(0);
      toast({ title: "Sucesso", description: "Todas as notificações foram removidas." });
    } catch (error) {
      console.error(error);
      toast({ title: "Erro", description: "Não foi possível remover as notificações.", variant: "destructive" });
    }
  };

  const getNotificationDetails = (type: string) => {
    switch (type) {
      case "COMMUNICATION":
        return {
          icon: <Send className="h-4 w-4 text-blue-600" />,
          color: "bg-blue-50 border-blue-200 text-blue-700",
          label: "Comunicação"
        };
      case "WORKSPACE":
        return {
          icon: <Building className="h-4 w-4 text-purple-600" />,
          color: "bg-purple-50 border-purple-200 text-purple-700",
          label: "Workspace"
        };
      case "DOCUMENT":
        return {
          icon: <FileSearch className="h-4 w-4 text-orange-600" />,
          color: "bg-orange-50 border-orange-200 text-orange-700",
          label: "Documento"
        };
      case "SYSTEM":
        return {
          icon: <SettingsIcon className="h-4 w-4 text-slate-600" />,
          color: "bg-slate-100 border-slate-200 text-slate-700",
          label: "Sistema"
        };
      case "SECURITY":
        return {
          icon: <ShieldCheck className="h-4 w-4 text-green-600" />,
          color: "bg-green-50 border-green-200 text-green-700",
          label: "Segurança"
        };
      default:
        return {
          icon: <Bell className="h-4 w-4 text-slate-500" />,
          color: "bg-slate-50 border-slate-100 text-slate-500",
          label: "Geral"
        };
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative group p-2 rounded-full hover:bg-slate-100 transition-all">
          <Bell className={`h-5 w-5 transition-colors ${unreadCount > 0 ? "text-blue-600 fill-blue-50" : "text-slate-500 group-hover:text-blue-600"}`} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-600 border-2 border-white text-[8px] font-bold text-white items-center justify-center shadow-sm">
                {unreadCount > 9 ? "+9" : unreadCount}
              </span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[450px] p-0 shadow-2xl border-slate-200 rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" align="end" sideOffset={8}>
        <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-slate-900">Notificações</h4>
            {unreadCount > 0 && <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-none px-2 h-5 text-[10px] font-bold">{unreadCount} novas</Badge>}
          </div>
          <div className="flex items-center gap-1">
            {activeNotifications.length > 0 && (
              <>
                <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="h-8 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1.5 font-bold">
                  <Check className="h-3.5 w-3.5" />
                  Lidas
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDeleteAll} className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 gap-1.5 font-bold">
                  <Trash2 className="h-3.5 w-3.5" />
                  Limpar
                </Button>
              </>
            )}
          </div>
        </div>

        <ScrollArea className="h-[480px]">
          {activeNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-10 text-center opacity-60">
              <div className="h-20 w-20 rounded-full bg-slate-50 grid place-items-center mb-4 border border-slate-100 shadow-inner">
                <BellOff className="h-10 w-10 text-slate-300" />
              </div>
              <p className="text-sm font-bold text-slate-900">Nenhuma notificação</p>
              <p className="text-xs text-slate-500 mt-1 max-w-[200px]">Fique tranquilo! Avisaremos quando algo novo aparecer por aqui.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {activeNotifications.map((n) => {
                const details = getNotificationDetails(n.type);
                return (
                  <div
                    key={n.id}
                    className={`group relative p-4 hover:bg-slate-50/80 cursor-pointer transition-all border-l-4 ${!n.read ? 'border-blue-600 bg-blue-50/20' : 'border-transparent'}`}
                    onClick={() => handleMarkAsRead(n.id, n.link)}
                  >
                    <div className="flex gap-4">
                      <div className={`mt-1 h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border-2 shadow-sm ${details.color}`}>
                        {details.icon}
                      </div>
                      <div className="flex-1 space-y-1 pr-6">
                        <div className="flex items-center justify-between mb-1">
                          <Badge className={`h-5 text-[9px] font-black uppercase tracking-tighter rounded-full border px-1.5 ${details.color}`}>
                            {details.label}
                          </Badge>
                          <p className="text-[10px] text-slate-400 font-bold tabular-nums">
                            {new Date(n.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short' })} • {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <p className={`text-sm font-bold leading-tight ${!n.read ? 'text-slate-900' : 'text-slate-600'}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-medium">{n.message}</p>
                        {!n.read && (
                          <div className="flex items-center gap-1.5 mt-2 transition-opacity duration-300">
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
                            <span className="text-[10px] text-blue-600 font-black uppercase tracking-wider">Novo</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-4 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all rounded-xl shadow-sm border border-transparent hover:border-red-100"
                      onClick={(e) => handleDelete(e, n.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        {activeNotifications.length > 5 && (
          <div className="p-3 bg-slate-50 border-t border-slate-100/50 flex items-center justify-center gap-2">
            <Clock className="h-3 w-3 text-slate-400" />
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Apenas últimos 30 dias</p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}