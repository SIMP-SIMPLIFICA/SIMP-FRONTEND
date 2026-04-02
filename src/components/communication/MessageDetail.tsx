import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Paperclip, Download, Reply, Trash2, Users, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Message } from "@/types/communication";

type Props = {
  message: Message | null;
  loading: boolean;
  onReply: () => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

function roleLabel(role: string) {
  if (role === "CC") return "CC";
  if (role === "BCC") return "BCC";
  return null;
}

export function MessageDetail({ message, loading, onReply, onDelete, isDeleting }: Props) {
  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-6 w-3/4" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <Separator />
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/6" />
        </div>
      </div>
    );
  }

  if (!message) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
        <Mail className="h-12 w-12 text-slate-200" />
        <p className="text-sm">Selecione uma mensagem para visualizar</p>
      </div>
    );
  }

  const canDelete = message.isCreator && message.status === "DRAFT";

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col p-6 gap-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold text-slate-900 leading-snug">
            {message.title}
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            {!message.isCreator && (
              <Button
                size="sm"
                variant="outline"
                onClick={onReply}
                className="gap-1.5 text-slate-600"
              >
                <Reply className="h-4 w-4" />
                Responder
              </Button>
            )}
            {canDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(message.id)}
                disabled={isDeleting}
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Remetente */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-600 flex items-center justify-center text-sm font-semibold text-white shrink-0">
            {getInitials(message.creator.firstName, message.creator.lastName)}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">
              {message.creator.firstName} {message.creator.lastName}
              {message.creator.jobTitle && (
                <span className="text-slate-400 font-normal ml-1.5">
                  · {message.creator.jobTitle}
                </span>
              )}
            </p>
            {message.sentAt && (
              <p className="text-xs text-slate-400">
                {format(new Date(message.sentAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            )}
          </div>
        </div>

        {/* Destinatários */}
        {message.recipients.length > 0 && (
          <div className="flex items-start gap-2 text-xs text-slate-500">
            <Users className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <div className="flex flex-wrap gap-1.5">
              {message.recipients.map((r) => (
                <div key={r.id} className="flex items-center gap-1">
                  <span className="text-slate-700">
                    {r.user.firstName} {r.user.lastName}
                  </span>
                  {roleLabel(r.role) && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                      {roleLabel(r.role)}
                    </Badge>
                  )}
                  {r.readAt && (
                    <span className="text-emerald-500" title={`Lido em ${format(new Date(r.readAt), "dd/MM/yyyy HH:mm")}`}>
                      ✓
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Corpo */}
        <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap min-h-[120px]">
          {message.content}
        </div>

        {/* Anexos */}
        {message.attachments.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5" />
                Anexos ({message.attachments.length})
              </p>
              <div className="flex flex-col gap-2">
                {message.attachments.map((att) => (
                  <a
                    key={att.id}
                    href={`/api/v1/communication/messages/${message.id}/attachments/${att.id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border border-slate-200",
                      "hover:bg-slate-50 hover:border-slate-300 transition-colors group"
                    )}
                  >
                    <div className="h-8 w-8 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                      <Paperclip className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{att.fileName}</p>
                      <p className="text-xs text-slate-400">{formatFileSize(att.fileSize)}</p>
                    </div>
                    <Download className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 transition-colors shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
}
