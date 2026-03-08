import { Eye, Pencil, Trash2, Copy } from "lucide-react";
import { HasPermission } from "@/components/layout/HasPermission";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type RolesTableRole = {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  color: string | null;
  permissions: string[];
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    users?: number;
  };
};

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">
      {children}
    </span>
  );
}

export function RolesTable(props: {
  loading: boolean;
  roles: RolesTableRole[];
  onOpenDetails: (role: RolesTableRole) => void;
  onEdit: (role: RolesTableRole) => void;
  onDuplicate: (role: RolesTableRole) => void;
  onDelete: (role: RolesTableRole) => void;
}) {
  const { loading, roles, onOpenDetails, onEdit, onDuplicate, onDelete } = props;

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="bg-slate-50 border-b border-slate-200">
            <TableHead className="w-[36%]">Role</TableHead>
            <TableHead className="w-[32%]">Permissões</TableHead>
            <TableHead className="w-[12%] text-center">Tipo</TableHead>
            <TableHead className="w-[20%] text-center">Ações</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={4} className="py-10 text-center text-sm text-slate-500">
                Carregando roles...
              </TableCell>
            </TableRow>
          ) : roles.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="py-10 text-center text-sm text-slate-500">
                Nenhuma role encontrada.
              </TableCell>
            </TableRow>
          ) : (
            roles.map((r) => (
              <TableRow key={r.id} className="hover:bg-slate-50/60">
                <TableCell className="min-w-0">
                  <div className="truncate font-medium text-slate-900">{r.displayName}</div>
                  <div className="truncate text-xs text-slate-500 font-mono">{r.name}</div>
                </TableCell>

                <TableCell className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill>{r.permissions.length} permissões</Pill>
                    {r.isSystem ? <Pill>System</Pill> : <Pill>Custom</Pill>}
                    {r._count?.users !== undefined ? <Pill>{r._count.users} usuários</Pill> : null}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">Criada: {formatDate(r.createdAt)}</div>
                </TableCell>

                <TableCell className="text-center">
                  <Badge
                    className={[
                      "rounded-full border px-2 py-0.5 text-xs",
                      r.isSystem
                        ? "bg-slate-100 text-slate-700 border-slate-200"
                        : "bg-blue-50 text-blue-700 border-blue-200",
                    ].join(" ")}
                  >
                    {r.isSystem ? "System" : "Custom"}
                  </Badge>
                </TableCell>

                <TableCell className="text-center">
                  <div className="flex justify-center gap-2">
                    <HasPermission anyOf={["roles:read", "roles:manage", "roles:write"]}>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="rounded-2xl"
                        onClick={() => onOpenDetails(r)}
                        disabled={loading}
                        title="Detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </HasPermission>

                    <HasPermission anyOf={["roles:write", "roles:manage"]}>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="rounded-2xl"
                        onClick={() => onDuplicate(r)}
                        disabled={loading}
                        title="Duplicar Role"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </HasPermission>

                    <HasPermission anyOf={["roles:write", "roles:manage"]}>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="rounded-2xl"
                        onClick={() => onEdit(r)}
                        disabled={loading || r.isSystem}
                        title={r.isSystem ? "Roles do sistema não podem ser editadas" : "Editar"}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </HasPermission>

                    <HasPermission anyOf={["roles:delete", "roles:manage"]}>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="rounded-2xl border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                        onClick={() => onDelete(r)}
                        disabled={loading || r.isSystem}
                        title={r.isSystem ? "Roles do sistema não podem ser excluídas" : "Excluir"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </HasPermission>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}