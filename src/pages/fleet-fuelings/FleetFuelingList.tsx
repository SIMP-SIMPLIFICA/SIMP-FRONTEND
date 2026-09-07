import { useState } from "react";
import { Download, FileCheck2, Fuel, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
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
  type FleetFueling,
  fleetFuelingService,
  formatLicensePlate,
  isIssued,
  pricePerLiter,
} from "@/lib/api/fleet-fuelings";
import { useDeleteFleetFueling, useFleetFuelings } from "@/hooks/useFleetFuelings";
import {
  describeDocumentError,
  formatCurrency,
  formatDate,
  formatNumber,
  savePdfBlob,
} from "@/lib/official-documents";
import { FleetFuelingForm } from "./FleetFuelingForm";

/**
 * Listagem de Abastecimentos (Épico 3, FE.3).
 *
 * Espelha a tela de Diárias de propósito: são o mesmo tipo de documento, com o
 * mesmo ciclo de vida, e a familiaridade entre as duas telas poupa treinamento
 * de quem vai operar as duas.
 */
export default function FleetFuelingList() {
  const { toast } = useToast();
  const { data: me } = useMe(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FleetFueling | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data, isLoading, isError } = useFleetFuelings({ page: 1, limit: 50 });
  const remove = useDeleteFleetFueling();

  const canWrite = hasPermission(me, "fleetFuelings:write");
  const canDelete = hasPermission(me, "fleetFuelings:delete");

  const fuelings = data?.data ?? [];

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(fueling: FleetFueling) {
    setEditing(fueling);
    setFormOpen(true);
  }

  async function handleDownload(fueling: FleetFueling) {
    setDownloadingId(fueling.id);
    try {
      const blob = await fleetFuelingService.downloadPdf(fueling.id);
      savePdfBlob(blob, `abastecimento-${fueling.publicId}.pdf`);
    } catch (error) {
      toast({ title: describeDocumentError(error), variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete(fueling: FleetFueling) {
    const confirmed = window.confirm(
      "Excluir este rascunho de abastecimento? Esta ação não pode ser desfeita."
    );
    if (!confirmed) return;

    try {
      await remove.mutateAsync(fueling.id);
      toast({ title: "Rascunho excluído." });
    } catch (error) {
      toast({ title: describeDocumentError(error), variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Frota</h1>
          <p className="mt-1 text-sm text-slate-500">
            Controle de abastecimento dos veículos, com comprovante verificável
            por QR Code.
          </p>
        </div>

        {canWrite && (
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Abastecimento
          </Button>
        )}
      </header>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white p-10 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Carregando abastecimentos...</span>
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          Não foi possível carregar os abastecimentos. Verifique sua conexão e
          tente novamente.
        </div>
      )}

      {!isLoading && !isError && fuelings.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <Fuel className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-slate-700">
            Nenhum abastecimento registrado
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {canWrite
              ? 'Clique em "Novo Abastecimento" para registrar o primeiro.'
              : "Você não tem permissão para registrar abastecimentos."}
          </p>
        </div>
      )}

      {!isLoading && !isError && fuelings.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Placa</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Odômetro</TableHead>
                <TableHead className="text-right">Litros</TableHead>
                <TableHead className="text-right">R$/litro</TableHead>
                <TableHead className="text-right">Valor total</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {fuelings.map(fueling => {
                const issued = isIssued(fueling);

                return (
                  <TableRow key={fueling.id}>
                    <TableCell className="font-mono font-medium text-slate-800">
                      {formatLicensePlate(fueling.licensePlate)}
                    </TableCell>

                    <TableCell className="whitespace-nowrap text-slate-600">
                      {formatDate(fueling.date)}
                    </TableCell>

                    <TableCell className="text-right text-slate-600">
                      {fueling.odometer.toLocaleString("pt-BR")} km
                    </TableCell>

                    <TableCell className="text-right text-slate-600">
                      {formatNumber(fueling.liters, 3)}
                    </TableCell>

                    <TableCell className="text-right text-slate-600">
                      {formatCurrency(pricePerLiter(fueling))}
                    </TableCell>

                    <TableCell className="text-right font-medium text-slate-800">
                      {formatCurrency(fueling.totalValue)}
                    </TableCell>

                    <TableCell>
                      {issued ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                          Emitido
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Rascunho</Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {issued ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(fueling)}
                              disabled={downloadingId === fueling.id}
                              title="Baixar PDF do recibo"
                            >
                              {downloadingId === fueling.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                              <span className="ml-1.5 hidden sm:inline">PDF</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(fueling)}
                              title="Ver detalhes"
                            >
                              <FileCheck2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            {canWrite && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEdit(fueling)}
                                title="Editar rascunho"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(fueling)}
                                title="Excluir rascunho"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            )}
                          </>
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

      <FleetFuelingForm open={formOpen} onOpenChange={setFormOpen} fueling={editing} />
    </div>
  );
}
