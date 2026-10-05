import { type KeyboardEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Car, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExportPdfButton } from "@/components/fleet/ExportPdfButton";
import { VehicleFormDialog } from "@/components/fleet/VehicleFormDialog";
import { toast } from "@/hooks/use-toast";
import { useDeleteFleetVehicle, useFleetVehicles } from "@/hooks/useFleet";
import { useMe } from "@/hooks/useMe";
import { type FleetVehicle, FUEL_TYPE_LABELS, VEHICLE_STATUS_LABELS, VEHICLE_TYPE_LABELS, fleetService } from "@/lib/api/fleet";
import { describeFleetError } from "@/lib/fleet-errors";
import { todayForFileName } from "@/lib/fleet-format";
import { formatPlate } from "@/lib/fleet-validation";
import { hasAnyPermission } from "@/lib/permissions";

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

/** Simplifica Frotas — cadastro de veículos. */
export default function VehiclesPage() {
  const navigate = useNavigate();
  const { data: me } = useMe();
  const canManage = hasAnyPermission(me, ["fleet:manage"]);

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FleetVehicle | null>(null);
  const [deleting, setDeleting] = useState<FleetVehicle | null>(null);

  const { data, isLoading, isError } = useFleetVehicles({ search: search.trim() || undefined, limit: 100 });
  const deleteVehicle = useDeleteFleetVehicle();
  const vehicles = data?.data ?? [];

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteVehicle.mutateAsync(deleting.id);
      toast({ title: `Veículo ${formatPlate(deleting.plate)} excluído.` });
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
          <h1 className="text-xl font-semibold text-slate-800">Veículos</h1>
          <p className="mt-1 text-sm text-slate-500">Frota da organização, com placa e Renavam conferidos.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportPdfButton
            onExport={() => fleetService.exportVehicles({ search: search.trim() || undefined })}
            fileName={`relacao-frota-${todayForFileName()}.pdf`}
          />
          {canManage && (
            <Button onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" />
              Novo veículo
            </Button>
          )}
        </div>
      </header>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <Input
          aria-label="Buscar veículo"
          className="pl-9"
          placeholder="Placa, modelo ou patrimônio"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white p-10 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Carregando veículos...</span>
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          Não foi possível carregar os veículos. Verifique sua conexão e tente novamente.
        </div>
      )}

      {!isLoading && !isError && vehicles.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <Car className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-slate-700">
            {search ? "Nenhum veículo encontrado para a busca" : "Nenhum veículo cadastrado"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {canManage ? 'Clique em "Novo veículo" para cadastrar o primeiro.' : "Peça ao gestor de frota para cadastrar os veículos."}
          </p>
        </div>
      )}

      {!isLoading && !isError && vehicles.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Placa</TableHead>
                <TableHead>Patrimônio</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead className="hidden md:table-cell">Tipo</TableHead>
                <TableHead className="hidden md:table-cell">Combustível</TableHead>
                <TableHead className="hidden lg:table-cell">Departamento</TableHead>
                <TableHead className="hidden sm:table-cell text-right">Hodômetro</TableHead>
                <TableHead>Situação</TableHead>
                {canManage && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map(vehicle => (
                <TableRow
                  key={vehicle.id}
                  aria-label={`Ver detalhes de ${formatPlate(vehicle.plate)}`}
                  {...rowNavigation(() => navigate(`/frota/veiculos/${vehicle.id}`))}
                >
                  <TableCell className="font-mono font-medium text-slate-800">{formatPlate(vehicle.plate)}</TableCell>
                  <TableCell className="font-mono text-slate-600">{vehicle.assetTag ?? "—"}</TableCell>
                  <TableCell className="text-slate-700">{vehicle.makeModel ?? "—"}</TableCell>
                  <TableCell className="hidden md:table-cell text-slate-600">{VEHICLE_TYPE_LABELS[vehicle.vehicleType]}</TableCell>
                  <TableCell className="hidden md:table-cell text-slate-600">{FUEL_TYPE_LABELS[vehicle.fuelType]}</TableCell>
                  <TableCell className="hidden lg:table-cell text-slate-600">
                    {vehicle.department?.name ?? <span className="text-slate-400">Frota geral</span>}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-right tabular-nums text-slate-600">
                    {vehicle.odometerKm.toLocaleString("pt-BR")} km
                  </TableCell>
                  <TableCell>
                    <Badge variant={vehicle.status === "EM_USO" ? "default" : "secondary"}>
                      {VEHICLE_STATUS_LABELS[vehicle.status]}
                    </Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Editar ${formatPlate(vehicle.plate)}`}
                          onClick={() => {
                            setEditing(vehicle);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Excluir ${formatPlate(vehicle.plate)}`}
                          onClick={() => setDeleting(vehicle)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <VehicleFormDialog open={formOpen} onOpenChange={setFormOpen} vehicle={editing} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Excluir o veículo ${deleting ? formatPlate(deleting.plate) : ""}?`}
        description="O cadastro sai das listas, mas o histórico de viagens e abastecimentos é preservado."
        confirmLabel="Excluir"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
