import { useEffect, useState, useRef } from "react";
import { Send, Calendar, DollarSign, Building2, FileText } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import type { Grant, GrantNote } from "@/types/grant";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface GrantDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grantId: string | null;
}

// ATENÇÃO: "export function" (sem default)
export function GrantDetailsDialog({ open, onOpenChange, grantId }: GrantDetailsDialogProps) {
  const [grant, setGrant] = useState<Grant | null>(null);
  const [loading, setLoading] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [sendingNote, setSendingNote] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && grantId) {
      fetchDetails();
    } else {
      setGrant(null);
    }
  }, [open, grantId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [grant?.notes]);

  async function fetchDetails() {
    setLoading(true);
    try {
      const res = await apiRequest<Grant>(`/api/v1/grants/${grantId}`);
      setGrant(res);
    } catch (err) {
      toast({ title: "Erro", description: "Falha ao carregar detalhes.", variant: "destructive" });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim() || !grantId) return;

    setSendingNote(true);
    try {
      const newNote = await apiRequest<GrantNote>(`/api/v1/grants/${grantId}/notes`, {
        method: "POST",
        body: JSON.stringify({ content: noteText }),
      });
      
      setGrant(prev => prev ? { ...prev, notes: [newNote, ...prev.notes] } : null);
      setNoteText("");
    } catch (err) {
      toast({ title: "Erro", description: "Não foi possível salvar a nota.", variant: "destructive" });
    } finally {
      setSendingNote(false);
    }
  }

  function formatMoney(val: string | number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val));
  }

  function formatDate(dateStr?: string | null) {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString('pt-BR');
  }

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {loading || !grant ? (
          <div className="p-10 text-center text-slate-500">Carregando informações...</div>
        ) : (
          <div className="flex flex-col lg:flex-row h-full max-h-[90vh]">
            
            {/* ESQUERDA: DETALHES */}
            <div className="flex-1 p-6 overflow-y-auto border-r border-slate-100 bg-white">
              <DialogHeader className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {grant.numeroConvenio}
                  </Badge>
                  <Badge variant={grant.situacao.includes("Execução") ? "default" : "secondary"}>
                    {grant.situacao}
                  </Badge>
                </div>
                <DialogTitle className="text-xl leading-relaxed">{grant.objeto}</DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                      <DollarSign className="h-3 w-3" /> Valor Global
                    </div>
                    <div className="font-semibold text-lg text-slate-900">{formatMoney(grant.valorGlobal)}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                      <Building2 className="h-3 w-3" /> Repasse Gov
                    </div>
                    <div className="font-semibold text-slate-700">{formatMoney(grant.valorRepasse)}</div>
                  </div>
                </div>

                <div className="space-y-4 text-sm">
                  <div className="flex items-start gap-3">
                    <Building2 className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <span className="block text-xs text-slate-500">Órgão Concedente</span>
                      <span className="font-medium text-slate-700">{grant.orgaoConcedente}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <span className="block text-xs text-slate-500">Vigência</span>
                      <span className="font-medium text-slate-700">
                        {formatDate(grant.dataInicio)} até {formatDate(grant.dataFim)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* DIREITA: CHAT */}
            <div className="w-full lg:w-[380px] bg-slate-50 flex flex-col h-[500px] lg:h-auto">
              <div className="p-4 border-b border-slate-200 bg-white/50 backdrop-blur-sm">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Notas da Equipe
                </h3>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col">
                {grant.notes.length === 0 ? (
                  <div className="text-center text-slate-400 text-sm mt-10">
                    Nenhuma anotação ainda.<br/>Escreva algo importante.
                  </div>
                ) : (
                  grant.notes.map(note => (
                    <div key={note.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700">
                            {note.user.firstName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-bold text-slate-700">
                          {note.user.firstName}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-auto">
                          {new Date(note.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 whitespace-pre-wrap">{note.content}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="p-3 bg-white border-t border-slate-200">
                <form onSubmit={handleSendNote} className="flex gap-2">
                  <Input 
                    placeholder="Adicionar nota..." 
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    disabled={sendingNote}
                    className="bg-slate-50"
                  />
                  <Button type="submit" size="icon" disabled={sendingNote || !noteText.trim()}>
                    {sendingNote ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}