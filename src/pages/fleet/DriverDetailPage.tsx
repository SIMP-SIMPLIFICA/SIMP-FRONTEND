import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DetailItem, DetailSection, HistoryPlaceholder } from "@/components/fleet/DetailSection";
import { DriverFormDialog } from "@/components/fleet/DriverFormDialog";
import { ExportPdfButton } from "@/components/fleet/ExportPdfButton";
import { useFleetDriver } from "@/hooks/useFleet";
import { useMe } from "@/hooks/useMe";
import { CNH_STATUS_LABELS, EMPLOYMENT_KIND_LABELS, fleetService } from "@/lib/api/fleet";
import { authorLine, cnhAlert, formatIsoDate } from "@/lib/fleet-format";
import { describeFleetError } from "@/lib/fleet-errors";
import { hasAnyPermission } from "@/lib/permissions";

/**
 * Simplifica Frotas — todos os dados de um motorista, agrupados. CPF e CNH só
 * mascarados: a API nunca devolve o número inteiro.
 */
export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: me } = useMe();
  const canManage = hasAnyPermission(me, ["fleet:manage"]);
  const { data: driver, isLoading, isError, error } = useFleetDriver(id);
  const [editing, setEditing] = useState(false);
  const alert = driver ? cnhAlert(driver.cnhExpiry) : null;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <Link to="/frota/motoristas" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Voltar para motoristas
      </Link>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white p-10 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Carregando motorista...</span>
        </div>
      )}

      {isError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {describeFleetError(error)}
        </div>
      )}

      {driver && (
        <>
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-3 text-xl font-semibold text-slate-800">
                {driver.name}
                {!driver.active && <Badge variant="secondary">Inativo</Badge>}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {EMPLOYMENT_KIND_LABELS[driver.employmentKind]}
                {driver.registrationNumber ? ` · Matrícula ${driver.registrationNumber}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ExportPdfButton
                label="Exportar ficha"
                onExport={() => fleetService.exportDriverSheet(driver.id)}
                fileName={`ficha-motorista-${driver.id}.pdf`}
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
            <DetailItem label="Nome" value={driver.name} />
            <DetailItem label="Matrícula" value={driver.registrationNumber} mono />
            <DetailItem label="CPF" value={driver.cpfMasked} mono />
            <DetailItem label="Vínculo" value={EMPLOYMENT_KIND_LABELS[driver.employmentKind]} />
            <DetailItem label="Usuário do SIMP" value={driver.user?.name ?? "Sem usuário vinculado"} />
            <DetailItem label="Ativo" value={driver.active ? "Sim" : "Não"} />
          </DetailSection>

          <DetailSection title="Habilitação">
            <DetailItem label="Nº da CNH" value={driver.cnhMasked} mono />
            <DetailItem label="Categoria" value={driver.cnhCategory} />
            <DetailItem
              label="Validade"
              value={
                <>
                  {formatIsoDate(driver.cnhExpiry)}
                  {alert && (
                    <Badge variant="destructive" className="ml-2">
                      {alert === "vencida" ? "Vencida" : "Vence em até 30 dias"}
                    </Badge>
                  )}
                </>
              }
            />
            <DetailItem label="Situação da CNH" value={CNH_STATUS_LABELS[driver.cnhStatus]} />
          </DetailSection>

          <DetailSection title="Departamento">
            <DetailItem label="Departamento" value={driver.department?.name ?? "Frota geral"} />
          </DetailSection>

          <DetailSection title="Registro">
            <DetailItem label="Cadastrado em" value={authorLine(driver.createdAt, driver.createdBy)} />
            <DetailItem label="Última alteração" value={authorLine(driver.updatedAt, driver.updatedBy)} />
          </DetailSection>

          <HistoryPlaceholder />

          <DriverFormDialog open={editing} onOpenChange={setEditing} driver={driver} />
        </>
      )}
    </div>
  );
}
