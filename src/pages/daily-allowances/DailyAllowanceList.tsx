import { useState } from "react";
import { Download, FileCheck2, FileText, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useMe } from "@/hooks/useMe";
import { hasPermission } from "@/lib/permissions";
import {
  type DailyAllowance,
  dailyAllowanceService,
  isIssued,
} from "@/lib/api/daily-allowances";
import { useDailyAllowances, useDeleteDailyAllowance } from "@/hooks/useDailyAllowances";
import {
  describeDocumentError,
  formatCurrency,
  formatDate,
  savePdfBlob,
} from "@/lib/official-documents";
import { DailyAllowanceForm } from "./DailyAllowanceForm";

/**
 * Listagem de Diárias (Épico 3, FE.2).
 *
 * As ações disponíveis dependem de DUAS coisas: a permissão do usuário e o
 * estado do registro. Um documento emitido não oferece editar nem excluir —
 * não por gentileza da interface, mas porque o backend recusaria com 409, e
 * mostrar um botão que sempre falha é pior que não mostrar nenhum.
 */
export default function DailyAllowanceList() {
  const { toast } = useToast();
  const { data: me } = useMe(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DailyAllowance | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data, isLoading, isError } = useDailyAllowances({ page: 1, limit: 50 });
  const remove = useDeleteDailyAllowance();

  const canWrite = hasPermission(me, "dailyAllowances:write");
  const canDelete = hasPermission(me, "dailyAllowances:delete");

  const allowances = data?.data ?? [];

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(allowance: DailyAllowance) {
    setEditing(allowance);
    setFormOpen(true);
  }

  async function handleDownload(allowance: DailyAllowance) {
    setDownloadingId(allowance.id);
    try {
      const blob = await dailyAllowanceService.downloadPdf(allowance.id);
      savePdfBlob(blob, `diaria-${allowance.publicId}.pdf`);
    } catch (error) {
      toast({ title: describeDocumentError(error), variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete(allowance: DailyAllowance) {
    const confirmed = window.confirm(
      "Excluir este rascunho de diária? Esta ação não pode ser desfeita."
    );
    if (!confirmed) return;

    try {
      await remove.mutateAsync(allowance.id);
      toast({ title: "Rascunho excluído." });
    } catch (error) {
      toast({ title: describeDocumentError(error), variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Diárias</h1>
          <p className="mt-1 text-sm text-slate-500">
            Recibos de diária de servidores, com verificação pública por QR Code.
          </p>
        </div>

        {canWrite && (
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Diária
          </Button>
        )}
      </header>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white p-10 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Carregando diárias...</span>
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          Não foi possível carregar as diárias. Verifique sua conexão e tente
          novamente.
        </div>
      )}

      {!isLoading && !isError && allowances.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <FileText className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-slate-700">
            Nenhuma diária registrada
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {canWrite
              ? 'Clique em "Nova Diária" para registrar a primeira.'
              : "Você não tem permissão para registrar diárias."}
          </p>
        </div>
      )}

      {!isLoading && !isError && allowances.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Destino</TableHead>
                <TableHead>Período</TableHead>
                <TableHead className="text-right">Diárias</TableHead>
                <TableHead className="text-right">Valor total</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {allowances.map(allowance => {
                const issued = isIssued(allowance);

                return (
                  <TableRow key={allowance.id}>
                    <TableCell className="font-medium text-slate-800">
                      {allowance.destination}
                    </TableCell>

                    <TableCell className="whitespace-nowrap text-slate-600">
                      {formatDate(allowance.departureDate)} a{" "}
                      {formatDate(allowance.returnDate)}
                    </TableCell>

                    <TableCell className="text-right text-slate-600">
                      {Number(allowance.dayCount).toLocaleString("pt-BR")}
                    </TableCell>

                    <TableCell className="text-right font-medium text-slate-800">
                      {formatCurrency(allowance.totalAmount)}
                    </TableCell>

                    <TableCell>
                      {issued ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                          Emitida
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Rascunho</Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {issued ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(allowance)}
                            disabled={downloadingId === allowance.id}
                            title="Baixar PDF oficial"
                          >
                            {downloadingId === allowance.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                            <span className="ml-1.5 hidden sm:inline">PDF Oficial</span>
                          </Button>
                        ) : (
                          <>
                            {canWrite && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEdit(allowance)}
                                title="Editar rascunho"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(allowance)}
                                title="Excluir rascunho"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            )}
                          </>
                        )}

                        {/* Documento emitido: abre em somente leitura. */}
                        {issued && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(allowance)}
                            title="Ver detalhes"
                          >
                            <FileCheck2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <DailyAllowanceForm
        open={formOpen}
        onOpenChange={setFormOpen}
        allowance={editing}
      />
    </div>
  );
}
