import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, History } from "lucide-react";
import { libraryService } from "@/lib/api/library";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

const ACTION_STYLE: Record<string, string> = {
  UPLOAD: "bg-blue-100 text-blue-700",
  DOWNLOAD: "bg-green-100 text-green-700",
  DOWNLOAD_ZIP: "bg-emerald-100 text-emerald-700",
  DELETE: "bg-red-100 text-red-700",
};

export function LibraryLogsModal({ open, onOpenChange }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["library", "logs"],
    queryFn: () => libraryService.logs({ limit: 100 }),
    enabled: open,
    staleTime: 30_000,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-slate-500" />
            Histórico de Acessos — Biblioteca
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex justify-center items-center py-16 text-slate-400 gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Carregando histórico...
            </div>
          ) : !data?.data.length ? (
            <p className="text-center text-slate-400 py-16 text-sm">Nenhum registro encontrado.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Usuário</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ação</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Documento</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.data.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-slate-700">
                      {log.user ? `${log.user.firstName ?? ""} ${log.user.lastName ?? ""}`.trim() || log.user.email : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`text-xs ${ACTION_STYLE[log.action] ?? "bg-slate-100 text-slate-600"}`}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs truncate max-w-[200px]">
                      {String(log.metadata?.['fileName'] ?? log.resourceId ?? "—")}
                    </td>
                    <td className="px-6 py-3 text-right text-slate-400 text-xs whitespace-nowrap">
                      {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
