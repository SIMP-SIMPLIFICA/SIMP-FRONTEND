import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DetailItem, DetailSection, HistoryPlaceholder } from "@/components/fleet/DetailSection";
import { ExportPdfButton } from "@/components/fleet/ExportPdfButton";
import { VehicleFormDialog } from "@/components/fleet/VehicleFormDialog";
import { useFleetVehicle } from "@/hooks/useFleet";
import { useMe } from "@/hooks/useMe";
import {
  FUEL_TYPE_LABELS,
  OWNERSHIP_LABELS,
  VEHICLE_STATUS_LABELS,
  VEHICLE_TYPE_LABELS,
  WORK_REGIME_LABELS,
  fleetService,
} from "@/lib/api/fleet";
import { describeFleetError } from "@/lib/fleet-errors";
import { authorLine } from "@/lib/fleet-format";
import { formatPlate } from "@/lib/fleet-validation";
import { formatCurrency } from "@/lib/official-documents";
import { hasAnyPermission } from "@/lib/permissions";

function years(manufacture: number | null, model: number | null) {
  if (!manufacture && !model) return null;
  return `${manufacture ?? "—"}/${model ?? "—"}`;
}

/** Simplifica Frotas — todos os dados de um veículo, agrupados. */
export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: me } = useMe();
  const canManage = hasAnyPermission(me, ["fleet:manage"]);
  const { data: vehicle, isLoading, isError, error } = useFleetVehicle(id);
  const [editing, setEditing] = useState(false);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <Link to="/frota/veiculos" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Voltar para veículos
      </Link>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white p-10 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Carregando veículo...</span>
        </div>
      )}

      {isError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {describeFleetError(error)}
        </div>
      )}

      {vehicle && (
        <>
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-3 text-xl font-semibold text-slate-800">
                <span className="font-mono">{formatPlate(vehicle.plate)}</span>
                <Badge variant={vehicle.status === "EM_USO" ? "default" : "secondary"}>
                  {VEHICLE_STATUS_LABELS[vehicle.status]}
                </Badge>
              </h1>
              <p className="mt-1 text-sm text-slate-500">{vehicle.makeModel ?? "Modelo não informado"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ExportPdfButton
                label="Exportar ficha"
                onExport={() => fleetService.exportVehicleSheet(vehicle.id)}
                fileName={`ficha-veiculo-${vehicle.plate}.pdf`}
              />
              {canManage && (
                <Button onClick={() => setEditing(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              )}
            </div>
          </header>

          <DetailSection title="Identificação">
            <DetailItem label="Placa" value={formatPlate(vehicle.plate)} mono />
            <DetailItem label="Nº de patrimônio" value={vehicle.assetTag} mono />
            <DetailItem label="Renavam" value={vehicle.renavam} mono />
            <DetailItem label="Chassi" value={vehicle.chassis} mono />
            <DetailItem label="Marca/modelo" value={vehicle.makeModel} />
            <DetailItem label="Ano fabricação/modelo" value={years(vehicle.manufactureYear, vehicle.modelYear)} />
            <DetailItem label="Tipo" value={VEHICLE_TYPE_LABELS[vehicle.vehicleType]} />
          </DetailSection>

          <DetailSection title="Dados técnicos">
            <DetailItem label="Combustível" value={FUEL_TYPE_LABELS[vehicle.fuelType]} />
            <DetailItem label="Usa ARLA 32" value={vehicle.usesArla32 ? "Sim" : "Não"} />
            <DetailItem label="Capacidade do tanque" value={`${Number(vehicle.tankCapacityL).toLocaleString("pt-BR")} L`} />
            <DetailItem
              label="Consumo de referência"
              value={vehicle.referenceKmPerL ? `${Number(vehicle.referenceKmPerL).toLocaleString("pt-BR")} km/L` : null}
            />
            <DetailItem label="Regime de trabalho" value={WORK_REGIME_LABELS[vehicle.workRegime]} />
            <DetailItem label="Hodômetro" value={`${vehicle.odometerKm.toLocaleString("pt-BR")} km`} />
          </DetailSection>

          <DetailSection title="Situação e propriedade">
            <DetailItem label="Situação" value={VEHICLE_STATUS_LABELS[vehicle.status]} />
            <DetailItem label="Propriedade" value={OWNERSHIP_LABELS[vehicle.ownership]} />
            <DetailItem label="Entidade proprietária" value={vehicle.ownerEntity?.name} />
            <DetailItem label="Valor de mercado" value={vehicle.marketValue ? formatCurrency(vehicle.marketValue) : null} />
          </DetailSection>

          <DetailSection title="Departamento">
            <DetailItem label="Departamento responsável" value={vehicle.department?.name ?? "Frota geral"} />
          </DetailSection>

          <DetailSection title="Registro">
            <DetailItem label="Cadastrado em" value={authorLine(vehicle.createdAt, vehicle.createdBy)} />
            <DetailItem label="Última alteração" value={authorLine(vehicle.updatedAt, vehicle.updatedBy)} />
          </DetailSection>

          <HistoryPlaceholder />

          <VehicleFormDialog open={editing} onOpenChange={setEditing} vehicle={vehicle} />
        </>
      )}
    </div>
  );
}
