import { type KeyboardEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Fuel, Loader2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FuelingFormDialog } from "@/components/fleet/FuelingFormDialog";
import { FuelingStatusBadge } from "@/components/fleet/FuelingStatusBadge";
import { useFleetFuelings, useFuelingDepartments } from "@/hooks/useFleetFuelings";
import { useMe } from "@/hooks/useMe";
import { FUEL_TYPE_LABELS } from "@/lib/api/fleet";
import { type FuelingLifecycle, type FuelingListParams, LIFECYCLE_LABELS } from "@/lib/api/fleet-fueling";
import { formatIsoDate } from "@/lib/fleet-format";
import { formatBrl, formatLitres } from "@/lib/fleet-fueling-calc";
import { formatPlate } from "@/lib/fleet-validation";
import { hasAnyPermission } from "@/lib/permissions";

const ALL = "__all__";
const DRAFT = "__draft__";

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

/** Simplifica Frotas — autorizações de abastecimento (TASK 3A). */
export default function FuelingsPage() {
  const navigate = useNavigate();
  const { data: me } = useMe();
  const canAuthorize = hasAnyPermission(me, ["fleet:authorize_fuel"]);

  const [search, setSearch] = useState("");
  const [situation, setSituation] = useState<string>(ALL);
  const [departmentId, setDepartmentId] = useState<string>(ALL);
  const [formOpen, setFormOpen] = useState(false);

  const params: FuelingListParams = {
    search: search.trim() || undefined,
    departmentId: departmentId === ALL ? undefined : departmentId,
    limit: 50,
    ...(situation === DRAFT ? { status: "PENDING" as const } : situation !== ALL ? { lifecycle: situation as FuelingLifecycle } : {}),
  };
  const { data, isLoading, isError } = useFleetFuelings(params);
  const departments = useFuelingDepartments().data?.data ?? [];
  const fuelings = data?.data ?? [];
  const filtered = Boolean(search || situation !== ALL || departmentId !== ALL);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Autorizações de abastecimento</h1>
          <p className="mt-1 text-sm text-slate-500">
            Emitidas com QR de uso único para o posto. O documento emitido não muda; a situação acompanha o uso.
          </p>
        </div>
        {canAuthorize && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova autorização
          </Button>
        )}
      </header>

      <div className="flex flex-wrap gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <Input
            aria-label="Buscar autorização"
            className="pl-9"
            placeholder="Nº ou placa"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={situation} onValueChange={setSituation}>
          <SelectTrigger className="w-48" aria-label="Situação">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as situações</SelectItem>
            <SelectItem value={DRAFT}>Rascunho</SelectItem>
            {(Object.keys(LIFECYCLE_LABELS) as FuelingLifecycle[]).map(key => (
              <SelectItem key={key} value={key}>
                {LIFECYCLE_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {departments.length > 1 && (
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger className="w-56" aria-label="Departamento">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os departamentos</SelectItem>
              {departments.map(d => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white p-10 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Carregando autorizações...</span>
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          Não foi possível carregar as autorizações. Verifique sua conexão e tente novamente.
        </div>
      )}

      {!isLoading && !isError && fuelings.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <Fuel className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-slate-700">
            {filtered ? "Nenhuma autorização com esses filtros" : "Nenhuma autorização ainda"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {canAuthorize ? 'Clique em "Nova autorização" para emitir a primeira.' : "As autorizações emitidas pelo seu departamento aparecerão aqui."}
          </p>
        </div>
      )}

      {!isLoading && !isError && fuelings.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº</TableHead>
                <TableHead>Veículo</TableHead>
                <TableHead className="hidden md:table-cell">Motorista</TableHead>
                <TableHead className="hidden lg:table-cell">Departamento</TableHead>
                <TableHead className="hidden sm:table-cell text-right">Limite</TableHead>
                <TableHead className="hidden md:table-cell">Validade</TableHead>
                <TableHead>Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fuelings.map(f => (
                <TableRow
                  key={f.id}
                  aria-label={`Ver autorização ${f.formattedNumber ?? "em rascunho"} de ${formatPlate(f.vehicle.plate)}`}
                  {...rowNavigation(() => navigate(`/frota/abastecimentos/${f.id}`))}
                >
                  <TableCell className="font-medium text-slate-800">{f.formattedNumber ?? <span className="text-slate-400">—</span>}</TableCell>
                  <TableCell>
                    <span className="font-mono text-slate-800">{formatPlate(f.vehicle.plate)}</span>
                    <span className="block text-xs text-slate-500">{FUEL_TYPE_LABELS[f.fuelType]}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-slate-700">{f.driver.name}</TableCell>
                  <TableCell className="hidden lg:table-cell text-slate-600">{f.department.name}</TableCell>
                  <TableCell className="hidden sm:table-cell text-right tabular-nums text-slate-700">
                    {formatLitres(f.maxVolumeL)}
                    <span className="block text-xs text-slate-500">{formatBrl(f.maxAmount)}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-slate-600">{formatIsoDate(f.validUntilDate)}</TableCell>
                  <TableCell>
                    <FuelingStatusBadge fueling={f} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <FuelingFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={(saved, issued) => navigate(`/frota/abastecimentos/${saved.id}`, { state: { showPdf: issued } })}
      />
    </div>
  );
}
