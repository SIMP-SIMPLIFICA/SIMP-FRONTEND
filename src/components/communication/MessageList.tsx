import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Inbox, Send, Circle, CornerDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { MessageListItem } from "@/types/communication";

type Props = {
  tab: "inbox" | "sent";
  messages: MessageListItem[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

function formatTime(dateStr: string | null) {
  if (!dateStr) return "";
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
}

export function MessageList({ tab, messages, loading, selectedId, onSelect }: Props) {
  if (loading) {
    return (
      <div className="flex flex-col gap-1 p-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
        {tab === "inbox" ? (
          <Inbox className="h-10 w-10 text-slate-300" />
        ) : (
          <Send className="h-10 w-10 text-slate-300" />
        )}
        <p className="text-sm">
          {tab === "inbox" ? "Nenhuma mensagem recebida" : "Nenhuma mensagem enviada"}
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-0.5 p-2">
        {messages.map((msg) => {
          const isSelected = msg.id === selectedId;
          const isUnread = tab === "inbox" && !msg.isRead;
          const person = tab === "inbox" ? msg.creator : msg.recipients?.[0]?.user;
          const personName = person
            ? `${person.firstName} ${person.lastName}`
            : "Usuário";
          const initials = person
            ? getInitials(person.firstName, person.lastName)
            : "?";
          const date = msg.sentAt ?? msg.sentAt;

          return (
            <button
              key={msg.id}
              onClick={() => onSelect(msg.id)}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all",
                isSelected
                  ? "bg-emerald-50 border border-emerald-200"
                  : "hover:bg-slate-50 border border-transparent"
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  "h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0",
                  isSelected
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-200 text-slate-600"
                )}
              >
                {initials}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span
                    className={cn(
                      "text-sm truncate min-w-0",
                      isUnread ? "font-semibold text-slate-900" : "font-medium text-slate-700"
                    )}
                  >
                    {personName}
                  </span>
                  <span className="text-xs text-slate-400 shrink-0 whitespace-nowrap">
                    {formatTime(date)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                  {isUnread && (
                    <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500 shrink-0" />
                  )}
                  <p
                    className={cn(
                      "text-xs truncate min-w-0 flex-1",
                      isUnread ? "text-slate-800 font-medium" : "text-slate-500"
                    )}
                  >
                    {msg.title}
                  </p>
                  {tab === "sent" && msg.replyToId && (
                    <span className="shrink-0 flex items-center gap-0.5 text-[10px] font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-1.5 py-0.5 leading-none">
                      <CornerDownRight className="h-2.5 w-2.5" />
                      Resposta
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
