import { type KeyboardEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IdCard, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DriverFormDialog } from "@/components/fleet/DriverFormDialog";
import { ExportPdfButton } from "@/components/fleet/ExportPdfButton";
import { toast } from "@/hooks/use-toast";
import {
  useDeleteFleetDriver,
  useFleetDrivers,
  useLookupFleetDriverByCpf,
  useSearchFleetDriversByRegistration,
} from "@/hooks/useFleet";
import { useMe } from "@/hooks/useMe";
import { CNH_STATUS_LABELS, EMPLOYMENT_KIND_LABELS, type FleetDriver, fleetService } from "@/lib/api/fleet";
import { cnhAlert, formatIsoDate, todayForFileName } from "@/lib/fleet-format";
import { describeFleetError } from "@/lib/fleet-errors";
import { isValidCpf, onlyDigits } from "@/lib/fleet-validation";
import { hasAnyPermission } from "@/lib/permissions";

/** Tempo sem digitar antes de buscar a matrícula (o POST tem limite por minuto). */
const REGISTRATION_DEBOUNCE_MS = 400;

/** Texto com a forma de CPF (000.000 / 000.000.000-00): não é matrícula. */
const CPF_SHAPED = /^\d{3}\.\d{3}/;

/** Clique (ou Enter) na linha abre o detalhe; os botões de ação não. */
function rowNavigation(open: () => void) {
  return {
    role: "link",
    tabIndex: 0,
    className: "cursor-pointer hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400",
    onClick: open,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "Enter") open();
    },
  };
}

/** Simplifica Frotas — cadastro de motoristas. */
export default function DriversPage() {
  const navigate = useNavigate();
  const { data: me } = useMe();
  const canManage = hasAnyPermission(me, ["fleet:manage"]);

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FleetDriver | null>(null);
  const [deleting, setDeleting] = useState<FleetDriver | null>(null);

  // Nada com dígito vai para a URL (a busca da listagem viaja na query string,
  // que aparece em log). Três caminhos, todos com o termo no CORPO de um POST:
  //  - CPF completo e válido → localização por CPF;
  //  - forma de CPF incompleto (000.000…) → orienta, não consulta;
  //  - outro texto com dígito → matrícula (busca parcial).
  // Sem dígito → busca por nome na listagem.
  const term = search.trim();
  const searchDigits = onlyDigits(term);
  const hasDigits = searchDigits.length > 0;
  const cpfSearch = hasDigits && searchDigits.length === 11 && isValidCpf(searchDigits) ? searchDigits : null;
  const incompleteCpf = hasDigits && !cpfSearch && CPF_SHAPED.test(term);
  const registrationSearch = hasDigits && !cpfSearch && !incompleteCpf ? term : null;
  const nameSearch = hasDigits ? undefined : term || undefined;

  const { data, isLoading, isError } = useFleetDrivers({ search: nameSearch, limit: 100 });

  const lookup = useLookupFleetDriverByCpf();
  const lookupByCpf = lookup.mutate;
  const [cpfResult, setCpfResult] = useState<FleetDriver[] | null>(null);
  useEffect(() => {
    if (!cpfSearch) {
      setCpfResult(null);
      return;
    }
    lookupByCpf(cpfSearch, {
      onSuccess: result => setCpfResult(result.data),
      onError: () => setCpfResult([]),
    });
  }, [cpfSearch, lookupByCpf]);

  const registration = useSearchFleetDriversByRegistration();
  const searchByRegistration = registration.mutate;
  const [registrationResult, setRegistrationResult] = useState<FleetDriver[] | null>(null);
  useEffect(() => {
    setRegistrationResult(null);
    if (!registrationSearch) return;
    const timer = setTimeout(() => {
      searchByRegistration(registrationSearch, {
        onSuccess: result => setRegistrationResult(result.data),
        onError: () => setRegistrationResult([]),
      });
    }, REGISTRATION_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [registrationSearch, searchByRegistration]);

  const deleteDriver = useDeleteFleetDriver();
  const drivers = cpfSearch
    ? (cpfResult ?? [])
    : registrationSearch
      ? (registrationResult ?? [])
      : (data?.data ?? []);
  const listLoading = incompleteCpf
    ? false
    : cpfSearch
      ? cpfResult === null
      : registrationSearch
        ? registrationResult === null
        : isLoading;

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteDriver.mutateAsync(deleting.id);
      toast({ title: `Cadastro de ${deleting.name} excluído.` });
    } catch (error) {
      toast({ title: describeFleetError(error), variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Motoristas</h1>
          <p className="mt-1 text-sm text-slate-500">CPF e CNH ficam guardados cifrados e aparecem só mascarados.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportPdfButton
            onExport={() =>
              fleetService.exportDrivers({ search: nameSearch, registration: registrationSearch ?? undefined })
            }
            fileName={`relacao-motoristas-${todayForFileName()}.pdf`}
            disabled={Boolean(cpfSearch) || incompleteCpf}
            disabledReason="Limpe a busca por CPF para exportar a relação"
          />
          {canManage && (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo motorista
            </Button>
          )}
        </div>
      </header>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <Input
          aria-label="Buscar motorista"
          className="pl-9"
          placeholder="Nome, matrícula ou CPF completo"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {incompleteCpf && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Para localizar por CPF, digite o CPF completo (11 dígitos). Para buscar por matrícula, digite o número sem
          pontos; por nome, use só letras.
        </div>
      )}

      {!incompleteCpf && listLoading && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white p-10 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Carregando motoristas...</span>
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          Não foi possível carregar os motoristas. Verifique sua conexão e tente novamente.
        </div>
      )}

      {!incompleteCpf && !listLoading && !isError && drivers.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <IdCard className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-slate-700">
            {search ? "Nenhum motorista encontrado para a busca" : "Nenhum motorista cadastrado"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {canManage ? 'Clique em "Novo motorista" para cadastrar o primeiro.' : "Peça ao gestor de frota para cadastrar os motoristas."}
          </p>
        </div>
      )}

      {!incompleteCpf && !listLoading && !isError && drivers.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Matrícula</TableHead>
                <TableHead className="hidden sm:table-cell">CPF</TableHead>
                <TableHead className="hidden md:table-cell">CNH</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead className="hidden md:table-cell">Vínculo</TableHead>
                <TableHead className="hidden lg:table-cell">Departamento</TableHead>
                {canManage && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.map(driver => {
                const alert = cnhAlert(driver.cnhExpiry);
                return (
                  <TableRow
                    key={driver.id}
                    aria-label={`Ver detalhes de ${driver.name}`}
                    {...rowNavigation(() => navigate(`/frota/motoristas/${driver.id}`))}
                  >
                    <TableCell className="font-medium text-slate-800">
                      {driver.name}
                      {!driver.active && <Badge variant="secondary" className="ml-2">Inativo</Badge>}
                    </TableCell>
                    <TableCell className="font-mono text-slate-600">{driver.registrationNumber ?? "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell font-mono text-slate-600">{driver.cpfMasked}</TableCell>
                    <TableCell className="hidden md:table-cell text-slate-600">
                      {driver.cnhCategory} · {CNH_STATUS_LABELS[driver.cnhStatus]}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span className={alert ? "text-red-700 font-medium" : "text-slate-600"}>{formatIsoDate(driver.cnhExpiry)}</span>
                      {alert && (
                        <Badge variant="destructive" className="ml-2">
                          {alert === "vencida" ? "Vencida" : "Vence em até 30 dias"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-slate-600">{EMPLOYMENT_KIND_LABELS[driver.employmentKind]}</TableCell>
                    <TableCell className="hidden lg:table-cell text-slate-600">
                      {driver.department?.name ?? <span className="text-slate-400">Frota geral</span>}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Editar ${driver.name}`}
                            onClick={() => {
                              setEditing(driver);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" aria-label={`Excluir ${driver.name}`} onClick={() => setDeleting(driver)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <DriverFormDialog open={formOpen} onOpenChange={setFormOpen} driver={editing} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Excluir o cadastro de ${deleting?.name ?? ""}?`}
        description="O motorista sai das listas, mas o histórico de viagens e abastecimentos é preservado."
        confirmLabel="Excluir"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
