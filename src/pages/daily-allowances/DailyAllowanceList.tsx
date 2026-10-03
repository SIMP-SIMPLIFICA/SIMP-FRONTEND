import { useState } from "react";
import {
  CalendarDays,
  Download,
  FileCheck2,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Receipt,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  canAccountFor,
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
import { DepartmentSelect } from "@/components/departments/DepartmentSelect";
import { DailyAllowanceForm } from "./DailyAllowanceForm";
import { AccountabilityDialog } from "./AccountabilityDialog";
import { HolidaysDialog } from "./HolidaysDialog";

/**
 * Listagem de Diárias (Épico 3, FE.2; Épico 8, filtros e prestação de contas).
 *
 * As ações disponíveis dependem de DUAS coisas: a permissão do usuário e o
 * estado do registro. Um documento emitido não oferece editar nem excluir —
 * não por gentileza da interface, mas porque o backend recusaria com 409, e
 * mostrar um botão que sempre falha é pior que não mostrar nenhum. A mesma
 * lógica vale para "Prestar Contas": só aparece habilitado quando o servidor
 * de fato aceitaria (`canAccountFor`) — o clique inútil nunca chega à rede.
 */

export default function DailyAllowanceList() {
  const { toast } = useToast();
  const { data: me } = useMe(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DailyAllowance | null>(null);
  const [accountingFor, setAccountingFor] = useState<DailyAllowance | null>(null);
  const [holidaysOpen, setHolidaysOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Busca única (Épico 8, FR-006) — combina com os filtros estruturados
  // abaixo, nunca os substitui. Tudo aplicado no SERVIDOR.
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data, isLoading, isError } = useDailyAllowances({
    page: 1,
    limit: 50,
    search: search || undefined,
    status: status === "ALL" ? undefined : (status as DailyAllowance["status"]),
    departmentId: departmentId || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });
  const remove = useDeleteDailyAllowance();

  const canWrite = hasPermission(me, "dailyAllowances:write");
  const canDelete = hasPermission(me, "dailyAllowances:delete");
  const canIssue = hasPermission(me, "dailyAllowances:issue");

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

  async function handleDownloadAccountability(allowance: DailyAllowance) {
    setDownloadingId(allowance.id);
    try {
      const blob = await dailyAllowanceService.downloadAccountabilityPdf(allowance.id);
      savePdfBlob(blob, `prestacao-contas-${allowance.publicId}.pdf`);
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

        <div className="flex items-center gap-2">
          {canWrite && (
            <Button variant="outline" onClick={() => setHolidaysOpen(true)}>
              <CalendarDays className="mr-2 h-4 w-4" />
              Feriados
            </Button>
          )}
          {canWrite && (
            <Button onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Diária
            </Button>
          )}
        </div>
      </header>

      {/* ── Busca e filtros (Épico 8, FR-006/FR-007) ── */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-8"
            placeholder="Buscar por nome, CPF ou número da diária"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Situação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas as situações</SelectItem>
            <SelectItem value="PENDING">Rascunho</SelectItem>
            <SelectItem value="ISSUED">Emitida</SelectItem>
            <SelectItem value="ACCOUNTED">Prestada</SelectItem>
          </SelectContent>
        </Select>

        <div className="w-56">
          <DepartmentSelect
            value={departmentId}
            onChange={setDepartmentId}
            clearLabel="Todos os departamentos"
            placeholder="Departamento"
          />
        </div>

        <Input
          type="date"
          className="w-40"
          aria-label="Período — a partir de"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
        />
        <span className="text-sm text-slate-400">até</span>
        <Input
          type="date"
          className="w-40"
          aria-label="Período — até"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
        />
      </div>

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
            Nenhuma diária encontrada
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {canWrite
              ? 'Clique em "Nova Diária" para registrar a primeira, ou ajuste os filtros.'
              : "Você não tem permissão para registrar diárias."}
          </p>
        </div>
      )}

      {!isLoading && !isError && allowances.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº</TableHead>
                <TableHead>Beneficiário</TableHead>
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
                const eligibleForAccountability = canAccountFor(allowance);

                return (
                  <TableRow key={allowance.id}>
                    <TableCell className="whitespace-nowrap font-mono text-xs text-slate-500">
                      {allowance.formattedNumber ?? "—"}
                    </TableCell>

                    <TableCell className="font-medium text-slate-800">
                      {allowance.beneficiaryName}
                    </TableCell>

                    <TableCell className="text-slate-600">
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
                      {allowance.status === "ACCOUNTED" ? (
                        <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-100">
                          Prestada
                        </Badge>
                      ) : issued ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                          Emitida
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Rascunho</Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {issued && allowance.status !== "ACCOUNTED" && canIssue && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setAccountingFor(allowance)}
                            disabled={!eligibleForAccountability}
                            title={
                              eligibleForAccountability
                                ? "Prestar contas da diária"
                                : `Disponível a partir de ${formatDate(allowance.returnDate)}, quando a viagem termina.`
                            }
                          >
                            <Receipt className="h-4 w-4" />
                            <span className="ml-1.5 hidden sm:inline">Prestar Contas</span>
                          </Button>
                        )}

                        {allowance.status === "ACCOUNTED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadAccountability(allowance)}
                            disabled={downloadingId === allowance.id}
                            title="Baixar Anexo II (prestação de contas)"
                          >
                            {downloadingId === allowance.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Receipt className="h-4 w-4" />
                            )}
                          </Button>
                        )}

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

      <AccountabilityDialog
        open={accountingFor !== null}
        onOpenChange={open => !open && setAccountingFor(null)}
        allowance={accountingFor}
      />

      <HolidaysDialog open={holidaysOpen} onOpenChange={setHolidaysOpen} />
    </div>
  );
}
