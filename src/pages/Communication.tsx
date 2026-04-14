import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SquarePen, Inbox, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { MessageList } from "@/components/communication/MessageList";
import { MessageDetail } from "@/components/communication/MessageDetail";
import { NewMessageModal } from "@/components/communication/NewMessageModal";
import type { Message, MessageListItem } from "@/types/communication";

type Tab = "inbox" | "sent";

export default function Communication() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("inbox");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<{
    id: string;
    subject: string;
    creatorId: string;
    creatorName: string;
  } | null>(null);

  const [searchParams] = useSearchParams();

  // --- Queries ---
  const inboxQuery = useQuery<MessageListItem[]>({
    queryKey: ["communication", "inbox"],
    queryFn: () => apiRequest("/api/v1/communication/inbox"),
    staleTime: 30_000,
  });

  const sentQuery = useQuery<MessageListItem[]>({
    queryKey: ["communication", "sent"],
    queryFn: () => apiRequest("/api/v1/communication/sent"),
    staleTime: 30_000,
  });

  const detailQuery = useQuery<Message>({
    queryKey: ["communication", "message", selectedId],
    queryFn: () => apiRequest(`/api/v1/communication/messages/${selectedId}`),
    enabled: !!selectedId,
    staleTime: 0,
  });

  // Deep linking: ?msgId=<id> auto-selects the message on page load
  useEffect(() => {
    const msgId = searchParams.get("msgId");
    if (msgId && msgId !== selectedId) {
      setSelectedId(msgId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Mutations ---
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/v1/communication/messages/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({ title: "Mensagem excluída" });
      setSelectedId(null);
      qc.invalidateQueries({ queryKey: ["communication", "inbox"] });
      qc.invalidateQueries({ queryKey: ["communication", "sent"] });
    },
    onError: () => {
      toast({ title: "Erro ao excluir mensagem", variant: "destructive" });
    }
  });

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    // After fetching detail, invalidate list so unread badge updates
    qc.invalidateQueries({ queryKey: ["communication", tab] });
  }, [qc, tab]);

  function handleReply() {
    if (!detailQuery.data) return;
    setReplyTo({
      id: detailQuery.data.id,
      subject: detailQuery.data.title,
      creatorId: detailQuery.data.creator.id,
      creatorName: `${detailQuery.data.creator.firstName} ${detailQuery.data.creator.lastName}`
    });
    setNewMessageOpen(true);
  }

  function handleNewMessage() {
    setReplyTo(null);
    setNewMessageOpen(true);
  }

  function handleMessageSent() {
    qc.invalidateQueries({ queryKey: ["communication", "inbox"] });
    qc.invalidateQueries({ queryKey: ["communication", "sent"] });
  }

  const activeMessages = tab === "inbox"
    ? (inboxQuery.data ?? [])
    : (sentQuery.data ?? []);

  const activeLoading = tab === "inbox" ? inboxQuery.isLoading : sentQuery.isLoading;

  const unreadCount = (inboxQuery.data ?? []).filter(m => !m.isRead).length;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">

      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Comunicação</h1>
          <p className="text-sm text-slate-500 mt-0.5">Mensagens internas do sistema</p>
        </div>
        <Button
          onClick={handleNewMessage}
          className="bg-emerald-600 hover:bg-emerald-700 gap-2 shadow-sm"
        >
          <SquarePen className="h-4 w-4" />
          Nova Mensagem
        </Button>
      </div>

      <Separator />

      {/* Main split layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left panel — list */}
        <div className="w-80 shrink-0 flex flex-col border-r border-slate-200 bg-white">
          <div className="px-3 pt-3 pb-2 shrink-0">
            <Tabs value={tab} onValueChange={(v) => { setTab(v as Tab); setSelectedId(null); }}>
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="inbox" className="gap-1.5 text-xs">
                  <Inbox className="h-3.5 w-3.5" />
                  Caixa de Entrada
                  {unreadCount > 0 && (
                    <span className="ml-1 bg-emerald-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                      {unreadCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="sent" className="gap-1.5 text-xs">
                  <Send className="h-3.5 w-3.5" />
                  Enviados
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex-1 overflow-hidden">
            <MessageList
              tab={tab}
              messages={activeMessages}
              loading={activeLoading}
              selectedId={selectedId}
              onSelect={handleSelect}
            />
          </div>
        </div>

        {/* Right panel — detail */}
        <div className="flex-1 bg-white overflow-hidden">
          <MessageDetail
            message={detailQuery.data ?? null}
            loading={detailQuery.isLoading}
            onReply={handleReply}
            onDelete={(id) => deleteMutation.mutate(id)}
            isDeleting={deleteMutation.isPending}
          />
        </div>
      </div>

      {/* Modal */}
      <NewMessageModal
        open={newMessageOpen}
        onOpenChange={setNewMessageOpen}
        onSuccess={handleMessageSent}
        replyTo={replyTo}
      />
    </div>
  );
}
