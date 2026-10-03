import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatUserLabel } from "@/hooks/useOrganizationUsers";
import type { AuditLogRecord } from "@/lib/api/audit";
import { translateAction, translateResource } from "@/lib/auditLabels";

interface Props {
  record: AuditLogRecord | null;
  onOpenChange: (open: boolean) => void;
  /** Mesma regra da coluna Organização na tabela (FR-002/FR-004): só para Super Admin. */
  showOrganization: boolean;
}

/**
 * Detalhe de um registro de auditoria (US-05, FR-007 a FR-009).
 *
 * Blocos claros, sem presumir formato: `oldData`+`newData` (legado) viram um
 * diff "antes → depois"; só `metadata` (canônico) vira um JSON somente
 * leitura; nenhum dos dois presente mostra uma nota explícita, nunca "null"
 * cru (spec §1.3). `action`/`resource` sempre em linguagem humana
 * (`@/lib/auditLabels`) — nunca a chave crua do banco.
 */
export function AuditLogDetailDialog({ record, onOpenChange, showOrganization }: Props) {
  return (
    <Dialog open={record !== null} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        {record && (
          <>
            <DialogHeader className="shrink-0 border-b px-6 py-4 text-left">
              <DialogTitle>Registro de Auditoria</DialogTitle>
            </DialogHeader>

            <ScrollArea className="flex-1">
              <div className="space-y-5 px-6 py-5">
                {!record.success && record.errorMessage && (
                  <Block label="Falha" accent="red">
                    <p className="text-sm font-medium text-red-800">{record.errorMessage}</p>
                  </Block>
                )}

                <Block label="Visão Geral">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Data/hora" value={formatDateTime(record.createdAt)} />
                    <Field label="Status" value={record.success ? "Sucesso" : "Falha"} />
                    <Field
                      label="Autor"
                      value={record.user ? formatUserLabel(record.user) : "Sistema"}
                    />
                    <Field label="Ação" value={translateAction(record.action, record.resource)} />
                    <Field
                      label="Recurso"
                      value={
                        record.resourceId
                          ? `${translateResource(record.resource)} · ${record.resourceId}`
                          : translateResource(record.resource)
                      }
                    />
                    {showOrganization && (
                      <Field label="Organização" value={record.organization?.name ?? "—"} />
                    )}
                  </div>
                </Block>

                {(record.method || record.endpoint || record.userAgent || record.ipAddress) && (
                  <Block label="Contexto da Requisição">
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Endereço IP" value={record.ipAddress || "—"} />
                      {(record.method || record.endpoint) && (
                        <Field
                          label="Rota"
                          value={[record.method, record.endpoint].filter(Boolean).join(" ")}
                        />
                      )}
                      {record.userAgent && (
                        <div className="col-span-2 flex flex-col gap-0.5">
                          <span className="text-xs text-slate-400">User-Agent</span>
                          <span className="break-all text-xs text-slate-600">
                            {record.userAgent}
                          </span>
                        </div>
                      )}
                    </div>
                  </Block>
                )}

                <ChangedDataBlock record={record} />
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Blocos — cartões claros, no padrão do resto do sistema (ver DailyAllowanceList,
// AdminPanel: `rounded-lg`/`rounded-xl`, borda fina, sem preto sólido).
// ─────────────────────────────────────────────────────────────────────────

function Block({
  label,
  children,
  accent = "slate",
}: {
  label: string;
  children: ReactNode;
  accent?: "slate" | "red";
}) {
  const wrap =
    accent === "red" ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50";
  const heading = accent === "red" ? "text-red-700" : "text-slate-500";

  return (
    <div className={`rounded-lg border p-4 ${wrap}`}>
      <div className={`mb-3 text-xs font-semibold uppercase tracking-wide ${heading}`}>
        {label}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="break-all text-sm font-medium text-slate-800">{value || "—"}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Dados alterados — FR-007/FR-008/FR-009
// ─────────────────────────────────────────────────────────────────────────

function ChangedDataBlock({ record }: { record: AuditLogRecord }) {
  const hasOld = record.oldData !== null && record.oldData !== undefined;
  const hasNew = record.newData !== null && record.newData !== undefined;
  const hasMetadata = record.metadata !== null && record.metadata !== undefined;

  if (hasOld && hasNew) {
    return (
      <Block label="Dados Alterados — Antes → Depois">
        <DiffTable oldData={record.oldData} newData={record.newData} />
      </Block>
    );
  }

  if (hasMetadata) {
    return (
      <Block label="Contexto da Ação">
        <JsonBlock value={record.metadata} />
      </Block>
    );
  }

  // Só um lado do par legado presente — sem par para comparar, mostra como
  // bloco isolado em vez de forçar um diff que não existe.
  if (hasOld || hasNew) {
    return (
      <Block label={hasOld ? "Dados Anteriores" : "Dados Novos"}>
        <JsonBlock value={hasOld ? record.oldData : record.newData} />
      </Block>
    );
  }

  return (
    <Block label="Contexto da Ação">
      <p className="text-sm text-slate-500">
        Nenhum dado adicional registrado para esta ação.
      </p>
    </Block>
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatScalar(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="max-h-80 overflow-auto rounded-md border border-slate-200 bg-white p-3 font-mono text-xs text-slate-700">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

/**
 * Diff "antes → depois". Só monta a tabela chave-a-chave quando os dois
 * lados são objetos simples — um array ou escalar cai para dois blocos JSON
 * lado a lado, porque não existe uma união de chaves sensata ali.
 */
function DiffTable({ oldData, newData }: { oldData: unknown; newData: unknown }) {
  if (!isPlainObject(oldData) || !isPlainObject(newData)) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1 text-xs text-slate-400">Antes</div>
          <JsonBlock value={oldData} />
        </div>
        <div>
          <div className="mb-1 text-xs text-slate-400">Depois</div>
          <JsonBlock value={newData} />
        </div>
      </div>
    );
  }

  const keys = Array.from(new Set([...Object.keys(oldData), ...Object.keys(newData)])).sort();

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <th className="px-3 py-2 text-left font-medium">Campo</th>
            <th className="px-3 py-2 text-left font-medium">Antes</th>
            <th className="px-3 py-2 text-left font-medium">Depois</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {keys.map(key => {
            const before = formatScalar(oldData[key]);
            const after = formatScalar(newData[key]);
            const changed = before !== after;
            return (
              <tr key={key}>
                <td className="px-3 py-2 align-top font-medium text-slate-700">{key}</td>
                <td
                  className={`whitespace-pre-wrap break-all px-3 py-2 align-top ${
                    changed ? "text-slate-600" : "text-slate-400"
                  }`}
                >
                  {before}
                </td>
                <td
                  className={`whitespace-pre-wrap break-all px-3 py-2 align-top ${
                    changed ? "rounded bg-blue-50 font-medium text-blue-900" : "text-slate-400"
                  }`}
                >
                  {after}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" }).format(date);
}
