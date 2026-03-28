import { useEffect, useState } from "react";
import { Settings, Filter, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GrantConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (filters: { startDate: string, endDate: string, status: string }) => void;
}

export function GrantConfigDialog({ open, onOpenChange, onSuccess }: GrantConfigDialogProps) {
  const [cnpj, setCnpj] = useState("");
  const [token, setToken] = useState("");
  
  // Datas (Padrão: 01/01/2024 até Hoje)
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]); 
  
  const [status, setStatus] = useState("TODOS");
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (open) loadConfig();
  }, [open]);

  async function loadConfig() {
    try {
      const res = await apiRequest<{ token: string | null, cnpj: string | null }>("/api/v1/grants/config");
      if (res.token) setToken(res.token);
      if (res.cnpj) setCnpj(res.cnpj);
    } catch (e) { console.error(e); }
  }

  async function handleReset() {
    if (!confirm("Tem certeza? Isso apagará TODOS os convênios salvos localmente.")) return;
    
    setResetting(true);
    try {
      await apiRequest("/api/v1/grants/reset", { method: "POST" });
      toast({ title: "Limpeza Concluída", description: "Todos os dados foram apagados." });
    } catch (err) {
      toast({ title: "Erro", description: "Falha ao limpar banco.", variant: "destructive" });
    } finally {
      setResetting(false);
    }
  }

  async function handleSaveAndSync() {
    if (!token || !cnpj) {
      toast({ title: "Atenção", description: "CNPJ e Token são obrigatórios.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      await apiRequest("/api/v1/grants/configure", {
        method: "POST",
        body: JSON.stringify({ token, cnpj }),
      });

      toast({ title: "Configuração Salva", description: "Iniciando sincronização..." });
      
      if (onSuccess) {
        onSuccess({ startDate, endDate, status });
      }
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Erro", description: "Não foi possível salvar.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Settings className="h-5 w-5 text-slate-600" />
            Configurar & Sincronizar
          </DialogTitle>
          <DialogDescription>
            Configure as credenciais e filtros para buscar dados do Governo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-4">
            <h4 className="font-semibold text-slate-900 text-sm">1. Credenciais (Salvas)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input value={cnpj} onChange={e => setCnpj(e.target.value)} className="font-mono bg-white" />
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input value={token} onChange={e => setToken(e.target.value)} className="font-mono bg-white" type="password" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
               <h4 className="font-semibold text-slate-900 text-sm">2. Filtros de Sincronização</h4>
               <Button variant="ghost" size="sm" onClick={handleReset} disabled={resetting} className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 text-xs">
                 <Trash2 className="h-3 w-3 mr-1" />
                 {resetting ? "Limpando..." : "Limpar Base Local"}
               </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>De:</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Até:</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Filter className="h-4 w-4" /> Situação (Igual Transferegov)
              </Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="max-h-[250px]">
                  <SelectItem value="TODOS">-- Todas as Situações --</SelectItem>
                  <SelectItem value="Em execução">Em execução</SelectItem>
                  <SelectItem value="Assinado">Assinado</SelectItem>
                  <SelectItem value="Aguardando Prestação de Contas">Aguardando Prestação de Contas</SelectItem>
                  <SelectItem value="Prestação de Contas enviada para Análise">Prestação de Contas enviada p/ Análise</SelectItem>
                  <SelectItem value="Prestação de Contas em Análise">Prestação de Contas em Análise</SelectItem>
                  <SelectItem value="Prestação de Contas Aprovada">Prestação de Contas Aprovada</SelectItem>
                  <SelectItem value="Prestação de Contas Aprovada com Ressalvas">Prestação de Contas Aprovada com Ressalvas</SelectItem>
                  <SelectItem value="Prestação de Contas Rejeitada">Prestação de Contas Rejeitada</SelectItem>
                  <SelectItem value="Convênio Anulado">Convênio Anulado</SelectItem>
                  <SelectItem value="Proposta/Plano de Trabalho em Análise">Proposta em Análise</SelectItem>
                  <SelectItem value="Proposta/Plano de Trabalho Rejeitados">Proposta Rejeitada</SelectItem>
                  <SelectItem value="INADIMPLENTE">Inadimplente</SelectItem>
                  <SelectItem value="Instrumento Extinto">Instrumento Extinto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={handleSaveAndSync} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[150px]">
            {loading ? "Sincronizando..." : "Salvar e Sincronizar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}