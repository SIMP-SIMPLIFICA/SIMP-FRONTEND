import { useState } from "react";
import { IdCard, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DriverFormDialog } from "@/components/fleet/DriverFormDialog";
import { toast } from "@/hooks/use-toast";
import { useDeleteFleetDriver, useFleetDrivers } from "@/hooks/useFleet";
import { useMe } from "@/hooks/useMe";
import { CNH_STATUS_LABELS, EMPLOYMENT_KIND_LABELS, type FleetDriver } from "@/lib/api/fleet";
import { describeFleetError } from "@/lib/fleet-errors";
import { hasAnyPermission } from "@/lib/permissions";

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

/** CNH vencida ou vencendo em até 30 dias, comparando datas de calendário (UTC). */
function cnhAlert(expiry: string): "vencida" | "vencendo" | null {
  const today = new Date().toISOString().slice(0, 10);
  if (expiry < today) return "vencida";
  const in30 = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  return expiry <= in30 ? "vencendo" : null;
}

/** Simplifica Frotas — cadastro de motoristas (TASK 1/2). */
export default function DriversPage() {
  const { data: me } = useMe();
  const canManage = hasAnyPermission(me, ["fleet:manage"]);

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FleetDriver | null>(null);
  const [deleting, setDeleting] = useState<FleetDriver | null>(null);

  const { data, isLoading, isError } = useFleetDrivers({ search: search.trim() || undefined, limit: 100 });
  const deleteDriver = useDeleteFleetDriver();
  const drivers = data?.data ?? [];

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
      </header>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <Input
          aria-label="Buscar motorista"
          className="pl-9"
          placeholder="Nome ou CPF completo"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {isLoading && (
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

      {!isLoading && !isError && drivers.length === 0 && (
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

      {!isLoading && !isError && drivers.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead className="hidden sm:table-cell">CNH</TableHead>
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
                  <TableRow key={driver.id}>
                    <TableCell className="font-medium text-slate-800">
                      {driver.name}
                      {!driver.active && <Badge variant="secondary" className="ml-2">Inativo</Badge>}
                    </TableCell>
                    <TableCell className="font-mono text-slate-600">{driver.cpfMasked}</TableCell>
                    <TableCell className="hidden sm:table-cell text-slate-600">
                      {driver.cnhCategory} · {CNH_STATUS_LABELS[driver.cnhStatus]}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span className={alert ? "text-red-700 font-medium" : "text-slate-600"}>{formatDate(driver.cnhExpiry)}</span>
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
                      <TableCell className="text-right">
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
