import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Paperclip, Download, Reply, Trash2, Users, Mail, Loader2, CheckCheck, Clock, CornerDownRight, ArrowUpLeft } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getAccessToken } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import type { Message } from "@/types/communication";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

async function downloadAttachment(messageId: string, attachmentId: string, fileName: string, forPreview = false) {
  const token = getAccessToken();
  const res = await fetch(
    `${API_URL}/api/v1/communication/messages/${messageId}/attachments/${attachmentId}/download`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  );
  if (!res.ok) throw new Error("Falha ao baixar arquivo");
  const { url } = await res.json();
  if (forPreview) {
    window.open(url, "_blank");
  } else {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
  }
}

type Props = {
  message: Message | null;
  loading: boolean;
  onReply: () => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  onNavigateToParent?: (id: string) => void;
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

export function MessageDetail({ message, loading, onReply, onDelete, isDeleting, onNavigateToParent }: Props) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  async function handleAttachment(attachmentId: string, fileName: string, forPreview: boolean) {
    setDownloadingId(attachmentId);
    try {
      await downloadAttachment(message!.id, attachmentId, fileName, forPreview);
    } catch {
      toast({ title: "Erro ao baixar anexo", variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  }
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

        {/* Banner: esta mensagem é uma resposta */}
        {message.replyTo && (
          <button
            type="button"
            onClick={() => onNavigateToParent?.(message.replyTo!.id)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-left hover:bg-slate-100 hover:border-slate-300 transition-colors group"
          >
            <ArrowUpLeft className="h-4 w-4 text-slate-400 shrink-0 group-hover:text-emerald-600 transition-colors" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-500">Esta é uma resposta para:</p>
              <p className="text-xs font-medium text-slate-700 truncate group-hover:text-emerald-700">
                {message.replyTo.title}
              </p>
            </div>
            <span className="text-[10px] text-slate-400 shrink-0 group-hover:text-emerald-600">
              Ver original →
            </span>
          </button>
        )}

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
            <div className="flex flex-col gap-1">
              {message.recipients.map((r) => (
                <div key={r.id} className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-700 font-medium">
                    {r.user.firstName} {r.user.lastName}
                  </span>
                  {roleLabel(r.role) && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                      {roleLabel(r.role)}
                    </Badge>
                  )}
                  {r.readAt ? (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <CheckCheck className="h-3.5 w-3.5" />
                      <span>
                        Visualizado em{" "}
                        {format(new Date(r.readAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </span>
                  ) : (
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Aguardando leitura
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
                {message.attachments.map((att) => {
                  const isImage = att.fileType.startsWith("image/");
                  const isPdf = att.fileType === "application/pdf";
                  const canPreview = isImage || isPdf;
                  const isLoading = downloadingId === att.id;

                  return (
                    <div
                      key={att.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white"
                    >
                      <div className="h-8 w-8 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                        <Paperclip className="h-4 w-4 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{att.fileName}</p>
                        <p className="text-xs text-slate-400">{formatFileSize(att.fileSize)}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {canPreview && (
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleAttachment(att.id, att.fileName, true)}
                            className={cn(
                              "text-xs px-2 py-1 rounded text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors",
                              isLoading && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            Visualizar
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleAttachment(att.id, att.fileName, false)}
                          className={cn(
                            "p-1.5 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors",
                            isLoading && "opacity-50 cursor-not-allowed"
                          )}
                          title="Baixar"
                        >
                          {isLoading
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Download className="h-4 w-4" />
                          }
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Thread de respostas — linha do tempo */}
        {(message.replies?.length ?? 0) > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-1.5">
                <CornerDownRight className="h-3.5 w-3.5" />
                Histórico de respostas ({message.replies!.length})
              </p>

              {/* Timeline */}
              <div className="relative flex flex-col gap-0">
                {/* vertical connector line */}
                <div className="absolute left-3.5 top-4 bottom-4 w-px bg-slate-200" aria-hidden />

                {message.replies!.map((reply, idx) => (
                  <div key={reply.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {/* Avatar node on the line */}
                    <div className="h-7 w-7 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-semibold text-white shrink-0 z-10 ring-2 ring-white">
                      {reply.creator ? getInitials(reply.creator.firstName, reply.creator.lastName) : "?"}
                    </div>

                    {/* Card */}
                    <div className="flex-1 min-w-0 border border-slate-200 rounded-xl bg-slate-50 p-3.5 flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-900">
                          {reply.creator
                            ? `${reply.creator.firstName} ${reply.creator.lastName}`
                            : "Usuário"}
                          {reply.creator?.jobTitle && (
                            <span className="ml-1.5 text-xs font-normal text-slate-400">
                              · {reply.creator.jobTitle}
                            </span>
                          )}
                        </span>
                        {reply.sentAt && (
                          <span className="text-xs text-slate-400 shrink-0">
                            {format(new Date(reply.sentAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-medium text-slate-600 leading-snug">
                        {reply.title}
                      </p>

                      {reply.content && (
                        <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-wrap border-t border-slate-200 pt-2 mt-0.5">
                          {reply.content.length > 300
                            ? `${reply.content.slice(0, 300)}…`
                            : reply.content}
                        </p>
                      )}

                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] font-medium text-slate-400 bg-white border border-slate-200 rounded-full px-2 py-0.5">
                          #{idx + 1} resposta
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
}
