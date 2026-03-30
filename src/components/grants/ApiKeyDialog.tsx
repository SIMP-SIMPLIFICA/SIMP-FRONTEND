import { useState } from "react";
import { ExternalLink, Key } from "lucide-react";
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

interface ApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ApiKeyDialog({ open, onOpenChange, onSuccess }: ApiKeyDialogProps) {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!token) return;
    setLoading(true);
    try {
      await apiRequest("/api/v1/grants/configure", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      toast({ title: "Sucesso", description: "Chave de acesso configurada!" });
      onSuccess();
      onOpenChange(false);
    } catch {
      toast({ title: "Erro", description: "Não foi possível salvar a chave.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-amber-500" />
            Configurar Acesso Gov.br
          </DialogTitle>
          <DialogDescription>
            Para sincronizar os convênios, precisamos da sua chave de acesso pública do Portal da Transparência.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-3 text-sm">
            <h4 className="font-semibold text-slate-700">Como obter sua chave:</h4>
            
            <ol className="space-y-2 list-decimal list-inside text-slate-600">
              <li>
                Acesse o cadastro da API:
                <a 
                  href="http://portaldatransparencia.gov.br/api-de-dados/cadastrar-email" 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 ml-1 text-blue-600 hover:underline"
                >
                  Portal da Transparência <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>Clique em "Quero me cadastrar" e preencha seu e-mail.</li>
              <li>Acesse seu e-mail e copie o <strong>Token</strong> recebido.</li>
            </ol>
          </div>

          <div className="space-y-2">
            <Label>Cole sua Chave (Token) aqui:</Label>
            <Input 
              placeholder="Ex: 848656aac83b9c8ba4..." 
              value={token}
              onChange={e => setToken(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading || !token} className="bg-amber-600 hover:bg-amber-700 text-white">
            {loading ? "Salvando..." : "Salvar e Continuar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}