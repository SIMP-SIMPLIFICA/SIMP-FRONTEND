import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileSearch, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useMe } from "@/hooks/useMe";
import { hasPermission } from "@/lib/permissions";
import { toast } from "@/hooks/use-toast";
import { formatUserLabel } from "@/hooks/useOrganizationUsers";
import { useAuditLogs } from "@/hooks/useAudit";
import {
  AUDIT_LOG_MAX_LIMIT,
  auditService,
  type AuditLogFilter,
  type AuditLogRecord,
} from "@/lib/api/audit";
import { exportCsv, type CsvColumn } from "@/utils/csv-export";
import {
  RESOURCE_FILTER_OPTIONS,
  getActionOptions,
  translateAction,
  translateResource,
} from "@/lib/auditLabels";
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
import { AuditUserFilter } from "./AuditUserFilter";
import { AuditLogDetailDialog } from "./AuditLogDetailDialog";

/**
 * Painel de Auditoria (Tela de Logs) — Épico frontend-only, o backend
 * (`GET /api/v1/audit`) já existe, já é multi-tenant e já é testado. Ver
 * `.specify/specs/audit-log-admin-panel.md`.
 *
 * Placement (2026-09-22, revisado): `/admin/auditoria`, sob `SuperAdminRoute`
 * — só Dono do Sistema. A spec original (§1.2, T001) recomendava rota própria
 * fora de `/admin/*` para não excluir o admin comum, e foi o que ficou no ar
 * até hoje; a mudança para cá foi decisão de produto para alinhar com o
 * Épico 5 (painel do Dono do Sistema), não a confirmação de um bug — ver o
 * histórico de T001 em `.specify/tasks/audit-log-admin-panel.md`. Se este
 * épico voltar a precisar do admin comum na própria organização, é reabrir
 * aquela rota com `PermissionGate anyOf={["audit:read","audit:export"]}`,
 * não recriar a tela.
 *
 * Isolamento multi-tenant continua garantido pelo SERVIDOR (spec §1.1):
 * mesmo aqui só acessível a Super Admin, a organização de cada registro
 * continua vindo do próprio `AuditLogRecord.organization`, e o filtro de
 * organização (Select) segue funcionando como antes. `action`/`resource`
 * continuam texto livre no banco (spec §4) — os `<Select>` abaixo só
 * traduzem o que já existe hoje (`@/lib/auditLabels`, levantado direto do
 * código do backend); o filtro ainda manda a chave exata pra API.
 */

const PAGE_SIZE = 50;
const EXPORT_ROW_CAP = 1000;
const ORG_ALL = "__all_orgs__";
const RESOURCE_ALL = "__all_resources__";
const ACTION_ALL = "__all_actions__";

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" }).format(date);
}

interface AdminOrganization {
  id: string;
  name: string;
}

export default function AuditLogPage() {
  const { data: me } = useMe(true);
  const isSuperAdmin = Boolean(me?.user?.isSuperAdmin);
  const canExport = hasPermission(me, "audit:export");

  // ── Filtros (FR-003/FR-004) — sempre aplicados no servidor. ──
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [userLabel, setUserLabel] = useState<string | null>(null);
  const [resourceFilter, setResourceFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [filtersResetKey, setFiltersResetKey] = useState(0);

  const [selectedRecord, setSelectedRecord] = useState<AuditLogRecord | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Qualquer filtro mudando invalida a página atual — sem isto, filtrar na
  // página 3 poderia pedir uma página que não existe mais no recorte novo.
  useEffect(() => {
    setPage(1);
  }, [userId, resourceFilter, actionFilter, startDate, endDate, organizationId]);

  // Reaproveita a MESMA queryKey de AdminPanel.tsx — cache compartilhado, sem
  // rota nova (spec §1.1).
  const { data: orgsData } = useQuery<{ data: AdminOrganization[] }>({
    queryKey: ["admin", "organizations"],
    queryFn: () => apiRequest("/api/v1/admin/organizations"),
    enabled: isSuperAdmin,
  });
  const organizations = orgsData?.data ?? [];

  const filters: AuditLogFilter = {
    page,
    limit: PAGE_SIZE,
    userId: userId || undefined,
    action: actionFilter || undefined,
    resource: resourceFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    organizationId: isSuperAdmin && organizationId ? organizationId : undefined,
  };

  const { data, isLoading, isError, refetch } = useAuditLogs(filters);
  const records = data?.data ?? [];
  const meta = data?.meta;

  const hasActiveFilters = Boolean(
    userId || resourceFilter || actionFilter || startDate || endDate || (isSuperAdmin && organizationId)
  );

  function clearFilters() {
    setUserId(null);
    setUserLabel(null);
    setResourceFilter("");
    setActionFilter("");
    setStartDate("");
    setEndDate("");
    setOrganizationId("");
    setFiltersResetKey(k => k + 1); // remonta AuditUserFilter, limpo
    setPage(1);
  }

  function handleResourceChange(next: string) {
    const resolved = next === RESOURCE_ALL ? "" : next;
    setResourceFilter(resolved);
    // A ação é filha do recurso na lista de opções — trocar o recurso pode
    // deixar a ação escolhida sem sentido (ou inexistente na lista nova).
    setActionFilter("");
  }

  function buildCsvColumns(): CsvColumn<AuditLogRecord>[] {
    const columns: CsvColumn<AuditLogRecord>[] = [
      { header: "Data/Hora", accessor: r => formatDateTime(r.createdAt) },
      { header: "Autor", accessor: r => (r.user ? formatUserLabel(r.user) : "Sistema") },
      { header: "E-mail do Autor", accessor: r => r.user?.email ?? "" },
      { header: "Ação", accessor: r => translateAction(r.action, r.resource) },
      { header: "Recurso", accessor: r => translateResource(r.resource) },
      { header: "ID do Recurso", accessor: r => r.resourceId ?? "" },
      { header: "Status", accessor: r => (r.success ? "Sucesso" : "Falha") },
      { header: "Mensagem de Erro", accessor: r => r.errorMessage ?? "" },
      { header: "Endereço IP", accessor: r => r.ipAddress },
    ];
    if (isSuperAdmin) {
      columns.push({ header: "Organização", accessor: r => r.organization?.name ?? "" });
    }
    return columns;
  }

  function buildFilterMetaLines(): string[] {
    const activeParts = [
      userLabel && `Usuário = ${userLabel}`,
      resourceFilter && `Recurso = ${translateResource(resourceFilter)}`,
      actionFilter && `Ação = ${translateAction(actionFilter, resourceFilter || undefined)}`,
      startDate && `De = ${startDate}`,
      endDate && `Até = ${endDate}`,
      isSuperAdmin &&
        organizationId &&
        `Organização = ${organizations.find(o => o.id === organizationId)?.name ?? organizationId}`,
    ].filter(Boolean);

    return [
      `Exportado em: ${formatDateTime(new Date().toISOString())}`,
      `Filtros ativos: ${activeParts.length > 0 ? activeParts.join(" · ") : "nenhum — recorte completo, até o teto de exportação"}`,
    ];
  }

  /**
   * Busca sequencial com os MESMOS filtros da tela, até um teto de 1000
   * linhas (spec §1.5/assunção §6) — nunca uma tentativa de "trazer tudo".
   * Cada página pede o teto do backend (100), nunca mais (achado §1.4).
   */
  async function handleExport() {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const first = await auditService.list({ ...filters, page: 1, limit: AUDIT_LOG_MAX_LIMIT });
      const total = first.meta.total;

      if (total === 0) {
        toast({
          title: "Nada para exportar",
          description: "O filtro atual não retornou nenhum registro.",
        });
        return;
      }

      if (total > EXPORT_ROW_CAP) {
        toast({
          title: `O filtro atual tem ${total} registros`,
          description: `Exportando os primeiros ${EXPORT_ROW_CAP}. Refine período, usuário, ação ou recurso para um recorte completo.`,
        });
      }

      const rowsToFetch = Math.min(total, EXPORT_ROW_CAP);
      const pagesToFetch = Math.ceil(rowsToFetch / AUDIT_LOG_MAX_LIMIT);

      let collected: AuditLogRecord[] = [...first.data];
      for (let p = 2; p <= pagesToFetch; p++) {
        const next = await auditService.list({ ...filters, page: p, limit: AUDIT_LOG_MAX_LIMIT });
        collected = collected.concat(next.data);
      }
      collected = collected.slice(0, rowsToFetch);

      exportCsv(
        collected,
        buildCsvColumns(),
        `auditoria_${new Date().toISOString().slice(0, 10)}`,
        buildFilterMetaLines()
      );

      toast({
        title: "Exportação concluída",
        description: `${collected.length} registro(s) exportado(s) para CSV.`,
      });
    } catch (err: unknown) {
      toast({
        title: "Erro ao exportar",
        description: (err as { message?: string })?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }

  const actionOptions = getActionOptions(resourceFilter || undefined);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* ── Cabeçalho ── */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Auditoria</h1>
          <p className="mt-1 text-sm text-slate-500">
            Histórico de ações registradas{" "}
            {isSuperAdmin ? "em todas as organizações" : "na sua organização"}.
          </p>
        </div>

        {canExport && (
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Exportar CSV
          </Button>
        )}
      </header>

      {/* ── Filtros — sempre aplicados no servidor (FR-003). ── */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
        <div className="min-w-[220px]">
          <AuditUserFilter
            key={filtersResetKey}
            onChange={(id, label) => {
              setUserId(id);
              setUserLabel(label);
            }}
          />
        </div>

        <Select value={resourceFilter || RESOURCE_ALL} onValueChange={handleResourceChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Recurso" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={RESOURCE_ALL}>Todos os recursos</SelectItem>
            {RESOURCE_FILTER_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={actionFilter || ACTION_ALL}
          onValueChange={v => setActionFilter(v === ACTION_ALL ? "" : v)}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Ação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ACTION_ALL}>Todas as ações</SelectItem>
            {actionOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Só para Super Admin (FR-004) — admin comum já é restrito no servidor. */}
        {isSuperAdmin && (
          <Select
            value={organizationId || ORG_ALL}
            onValueChange={v => setOrganizationId(v === ORG_ALL ? "" : v)}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Organização" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ORG_ALL}>Todas as organizações</SelectItem>
              {organizations.map(org => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Input
          type="date"
          aria-label="Período — a partir de"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          className="w-40"
        />
        <span className="text-sm text-slate-400">até</span>
        <Input
          type="date"
          aria-label="Período — até"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          className="w-40"
        />

        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Limpar filtros
          </Button>
        )}
      </div>

      {/* ── Estados ── */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white p-10 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Carregando registros...</span>
        </div>
      )}

      {isError && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>Não foi possível carregar a trilha de auditoria.</span>
          <button
            type="button"
            onClick={() => refetch()}
            className="underline hover:text-red-800"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!isLoading && !isError && records.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <FileSearch className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-slate-700">Nenhum registro encontrado</p>
          <p className="mt-1 text-sm text-slate-500">
            {hasActiveFilters
              ? "Nenhuma ação corresponde aos filtros aplicados. Ajuste o período, usuário, ação ou recurso."
              : "Ainda não há ações registradas para exibir."}
          </p>
        </div>
      )}

      {/* ── Tabela (FR-002) ── */}
      {!isLoading && !isError && records.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Autor</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Recurso</TableHead>
                {isSuperAdmin && <TableHead>Organização</TableHead>}
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {records.map(record => (
                <TableRow
                  key={record.id}
                  onClick={() => setSelectedRecord(record)}
                  className="cursor-pointer"
                >
                  <TableCell className="whitespace-nowrap text-sm text-slate-600">
                    {formatDateTime(record.createdAt)}
                  </TableCell>
                  <TableCell className="text-sm font-medium text-slate-800">
                    {record.user ? formatUserLabel(record.user) : "Sistema"}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {translateAction(record.action, record.resource)}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {translateResource(record.resource)}
                    {record.resourceId && (
                      <span className="ml-1.5 text-xs text-slate-400">
                        #{record.resourceId.slice(0, 8)}
                      </span>
                    )}
                  </TableCell>
                  {isSuperAdmin && (
                    <TableCell className="text-sm text-slate-600">
                      {record.organization?.name ?? "—"}
                    </TableCell>
                  )}
                  <TableCell>
                    {record.success ? (
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                        Sucesso
                      </Badge>
                    ) : (
                      <Badge variant="destructive" title={record.errorMessage ?? undefined}>
                        Falha
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* ── Paginação real — nunca um limit acima de 100 (FR-001, spec §1.4). ── */}
          <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-slate-500">
              Página {meta?.page ?? page} de {meta?.totalPages ?? 1} · {meta?.total ?? 0} registro(s)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!meta || page >= meta.totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </div>
      )}

      <AuditLogDetailDialog
        record={selectedRecord}
        onOpenChange={open => !open && setSelectedRecord(null)}
        showOrganization={isSuperAdmin}
      />
    </div>
  );
}
