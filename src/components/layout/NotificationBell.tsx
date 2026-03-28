import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
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
import { getAccessToken } from "@/lib/auth"; // Importante: pegar o token

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

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await api.get<{ data: Notification[], unreadCount: number }>("/notifications");
        setNotifications(response.data.data);
        setUnreadCount(response.data.unreadCount);
      } catch (error) {
        console.error("Erro ao buscar notificações", error);
      }
    };
    void fetchNotifications();

    const token = getAccessToken();
    if (!token) return;

    const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
    
    // CORREÇÃO: Passando o token na URL para o backend ler via query string
    const es = new EventSource(`${API_URL}/notifications/stream?token=${token}`);

    es.onopen = () => {
      console.log("✅ [SSE] Conectado às notificações");
    };

    es.onmessage = (event) => {
      // Ignora mensagens de 'retry' ou keep-alive que não sejam JSON
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

  const handleMarkAsRead = async (id: string, link?: string) => {
    try {
      await api.patch(`/notifications/${id}/read`, {});
      
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));

      setIsOpen(false);
      if (link) navigate(link);
    } catch (error) {
      console.error(error);
    }
  };

  const handleMarkAllRead = async () => {
    await api.patch("/notifications/read-all", {});
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-gray-500 hover:text-blue-600">
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <h4 className="font-semibold text-sm">Notificações</h4>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="text-xs text-blue-600 hover:underline">
              Marcar lidas
            </button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              Nenhuma notificação.
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${!n.read ? 'bg-blue-50/50' : ''}`}
                  onClick={() => handleMarkAsRead(n.id, n.link)}
                >
                  <div className="flex gap-3">
                    <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${!n.read ? 'bg-blue-500' : 'bg-transparent'}`} />
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{n.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(n.createdAt).toLocaleDateString()} às {new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}