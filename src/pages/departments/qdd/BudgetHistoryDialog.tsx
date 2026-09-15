import { History, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQddItemHistory } from "@/hooks/useQddItems";
import { formatBRL } from "@/utils/currency";

/**
 * Histórico de suplementação/redução do valor orçado (Épico 8, FR-013/FR-014).
 *
 * É o rastro que a auditoria do Tribunal de Contas cobra: quem alterou, de
 * quanto para quanto, por quê e quando — nunca editado nem apagado depois de
 * gravado.
 */

interface Props {
  qddItemId: string | null;
  ficha: string;
  onClose: () => void;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function authorName(entry: { changedBy?: { firstName?: string | null; lastName?: string | null } }): string {
  const name = [entry.changedBy?.firstName, entry.changedBy?.lastName].filter(Boolean).join(" ");
  return name || "Usuário removido";
}

export function BudgetHistoryDialog({ qddItemId, ficha, onClose }: Props) {
  const { data: history, isLoading } = useQddItemHistory(qddItemId);

  return (
    <Dialog open={qddItemId !== null} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico da ficha {ficha}
          </DialogTitle>
          <DialogDescription>
            Toda alteração do valor orçado fica registrada aqui, sem exceção.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando...
          </div>
        )}

        {!isLoading && (history?.length ?? 0) === 0 && (
          <p className="py-10 text-center text-sm text-slate-400">
            Nenhuma suplementação registrada para esta ficha.
          </p>
        )}

        {!isLoading && (history?.length ?? 0) > 0 && (
          <div className="max-h-80 space-y-3 overflow-y-auto">
            {history!.map(entry => {
              const percent = entry.changePercent !== null ? Number(entry.changePercent) : null;
              const increased = Number(entry.newValue) >= Number(entry.previousValue);
              return (
                <div key={entry.id} className="rounded-md border border-slate-100 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-800">
                      {formatBRL(entry.previousValue)} → {formatBRL(entry.newValue)}
                    </span>
                    {percent !== null && (
                      <span className={increased ? "text-emerald-600" : "text-red-600"}>
                        {increased ? "+" : ""}
                        {percent.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{entry.reason}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {authorName(entry)} · {formatDateTime(entry.createdAt)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
