import { useState, useEffect, useCallback, useRef } from "react";
import { Search, X, Paperclip, Send, Loader2, FileText, ShieldOff, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import type { Recipient } from "@/types/communication";

type SelectedRecipient = {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar?: string | null;
  jobRole: string;
  role: "TO" | "CC" | "BCC";
};

type PendingFile = {
  file: File;
  id: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  replyTo?: { id: string; subject: string; creatorId: string; creatorName: string } | null;
};

export function NewMessageModal({ open, onOpenChange, onSuccess, replyTo }: Props) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipientSearch, setRecipientSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Recipient[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<SelectedRecipient[]>([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const [recipientFocused, setRecipientFocused] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  // Pre-fill when replying
  useEffect(() => {
    if (open && replyTo) {
      setSubject(`Re: ${replyTo.subject}`);
      setSelectedRecipients([{
        id: replyTo.creatorId,
        name: replyTo.creatorName,
        username: "",
        email: "",
        avatar: null,
        jobRole: "",
        role: "TO"
      }]);
    }
    if (!open) {
      setSubject("");
      setBody("");
      setRecipientSearch("");
      setSearchResults([]);
      setSelectedRecipients([]);
      setPendingFiles([]);
    }
  }, [open, replyTo]);

  const selectedIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    selectedIdsRef.current = new Set(selectedRecipients.map(r => r.id));
  }, [selectedRecipients]);

  const searchRecipients = useCallback(async (q: string) => {
    setSearching(true);
    try {
      const params = q.trim() ? `?search=${encodeURIComponent(q.trim())}` : "";
      const data = await apiRequest<Recipient[]>(`/api/v1/communication/recipients${params}`);
      setSearchResults(data.filter(r => !selectedIdsRef.current.has(r.id)));
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // Dispara busca com debounce quando digitar
  useEffect(() => {
    if (!recipientFocused) return;
    const t = setTimeout(() => searchRecipients(recipientSearch), 250);
    return () => clearTimeout(t);
  }, [recipientSearch, recipientFocused, searchRecipients]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setRecipientFocused(false);
        setSearchResults([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function addRecipient(recipient: Recipient) {
    if (recipient.hasPermission === false) return;
    setSelectedRecipients(prev => [...prev, {
      id: recipient.id,
      name: recipient.name,
      username: recipient.username,
      email: recipient.email,
      avatar: recipient.avatar,
      jobRole: recipient.role,
      role: "TO"
    }]);
    setRecipientSearch("");
    setSearchResults([]);
  }

  function removeRecipient(id: string) {
    setSelectedRecipients(prev => prev.filter(r => r.id !== id));
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const newPending: PendingFile[] = files.map(file => ({
      file,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`
    }));
    setPendingFiles(prev => [...prev, ...newPending]);
    // Reset input so same file can be re-added if removed
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removePendingFile(id: string) {
    setPendingFiles(prev => prev.filter(f => f.id !== id));
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function toggleRole(id: string) {
    setSelectedRecipients(prev =>
      prev.map(r => {
        if (r.id !== id) return r;
        const next: Record<string, "TO" | "CC" | "BCC"> = { TO: "CC", CC: "BCC", BCC: "TO" };
        return { ...r, role: next[r.role] };
      })
    );
  }

  async function handleSend() {
    if (!subject.trim()) {
      toast({ title: "Informe o assunto", variant: "destructive" });
      return;
    }
    if (!body.trim()) {
      toast({ title: "Escreva o corpo da mensagem", variant: "destructive" });
      return;
    }
    if (selectedRecipients.length === 0) {
      toast({ title: "Adicione ao menos um destinatário", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      // Upload attachments first if any
      type AttachmentMeta = { fileName: string; fileUrl: string; fileType: string; fileSize: number };
      const uploadedAttachments: AttachmentMeta[] = [];

      for (const pending of pendingFiles) {
        const formData = new FormData();
        formData.append("file", pending.file);
        const uploaded = await apiRequest<AttachmentMeta>("/api/v1/communication/messages/upload", {
          method: "POST",
          body: formData,
        });
        uploadedAttachments.push(uploaded);
      }

      await apiRequest("/api/v1/communication/messages", {
        method: "POST",
        body: JSON.stringify({
          subject: subject.trim(),
          body: body.trim(),
          recipients: selectedRecipients.map(r => ({ userId: r.id, role: r.role })),
          ...(replyTo ? { replyToId: replyTo.id } : {}),
          ...(uploadedAttachments.length > 0 && { attachments: uploadedAttachments })
        })
      });
      toast({ title: "Mensagem enviada com sucesso" });
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "Erro ao enviar mensagem.";
      toast({ title: "Erro ao enviar mensagem", description: msg, variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
          <DialogTitle className="text-lg">
            {replyTo ? "Responder mensagem" : "Nova Mensagem"}
          </DialogTitle>
        </DialogHeader>

        {/* Campo "Para" — fora do ScrollArea para o dropdown não ser clipado */}
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="space-y-2">
            <Label className="text-sm text-slate-600">Para</Label>

            {/* Chips selecionados */}
            {selectedRecipients.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedRecipients.map(r => (
                  <div
                    key={r.id}
                    className="flex items-center gap-1.5 bg-slate-100 rounded-full px-2 py-1 text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => { if (!replyTo) toggleRole(r.id); }}
                      disabled={!!replyTo}
                      title="Clique para alternar TO / CC / BCC"
                    >
                      <Badge
                        variant={r.role === "TO" ? "default" : "outline"}
                        className="text-[10px] px-1.5 py-0 h-4 cursor-pointer"
                      >
                        {r.role}
                      </Badge>
                    </button>
                    <span className="text-slate-700 font-medium">{r.name}</span>
                    {r.jobRole && (
                      <span className="text-slate-400">· {r.jobRole}</span>
                    )}
                    {!replyTo && (
                      <button
                        type="button"
                        onClick={() => removeRecipient(r.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors ml-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Search input + dropdown */}
            {!replyTo && (
              <div className="relative" ref={searchWrapperRef}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
                <Input
                  value={recipientSearch}
                  onChange={e => setRecipientSearch(e.target.value)}
                  onFocus={() => setRecipientFocused(true)}
                  placeholder="Buscar destinatário por nome ou e-mail..."
                  className="pl-9"
                  autoComplete="off"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />
                )}

                {recipientFocused && (searchResults.length > 0 || searching || (!searching && recipientSearch.trim().length > 0)) && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 border border-slate-200 rounded-lg bg-white shadow-lg max-h-52 overflow-y-auto">
                    {searching ? (
                      <div className="flex items-center justify-center py-4 text-slate-400 text-sm gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Buscando...
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="py-4 text-center text-sm text-slate-400">
                        Nenhum destinatário encontrado
                      </div>
                    ) : (
                      searchResults.map(r => {
                        const blocked = r.hasPermission === false;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onMouseDown={e => { e.preventDefault(); addRecipient(r); }}
                            disabled={blocked}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-slate-50 last:border-0 ${
                              blocked
                                ? 'opacity-50 cursor-not-allowed bg-slate-50'
                                : 'hover:bg-emerald-50'
                            }`}
                          >
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0 ${blocked ? 'bg-slate-400' : 'bg-emerald-600'}`}>
                              {r.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className={`text-sm font-medium ${blocked ? 'text-slate-400' : 'text-slate-800'}`}>{r.name}</p>
                              <p className="text-xs text-slate-400">{r.role} · {r.email}</p>
                              {blocked && (
                                <p className="flex items-center gap-1 text-[11px] text-amber-600 mt-0.5">
                                  <ShieldOff className="h-3 w-3" />
                                  Sem permissão (Edite em Roles)
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1 overflow-auto">
          <div className="px-6 py-4 flex flex-col gap-5">

            {replyTo && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500">
                <Reply className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="font-medium text-slate-600 shrink-0">Referência:</span>
                <span className="truncate">{replyTo.subject}</span>
              </div>
            )}

            {/* Assunto */}
            <div className="space-y-2">
              <Label className="text-sm text-slate-600">Assunto</Label>
              <Input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Assunto da mensagem"
              />
            </div>

            {/* Corpo */}
            <div className="space-y-2">
              <Label className="text-sm text-slate-600">Mensagem</Label>
              <Textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Escreva sua mensagem aqui..."
                className="min-h-[180px] resize-none"
              />
            </div>

            {/* Anexos */}
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                onChange={handleFileSelect}
                disabled={sending}
              />
              <button
                type="button"
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-600 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending}
              >
                <Paperclip className="h-4 w-4" />
                Anexar arquivo
              </button>

              {pendingFiles.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-1">
                  {pendingFiles.map(pf => (
                    <div
                      key={pf.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
                    >
                      <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="flex-1 truncate text-slate-700 font-medium">{pf.file.name}</span>
                      <span className="text-xs text-slate-400 shrink-0">{formatFileSize(pf.file.size)}</span>
                      <button
                        type="button"
                        onClick={() => removePendingFile(pf.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors shrink-0"
                        disabled={sending}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t border-slate-100 flex items-center justify-between sm:justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={sending} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
