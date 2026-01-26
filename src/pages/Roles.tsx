import { useEffect, useMemo, useState } from "react";
import { Search, Shield, Eye } from "lucide-react";

import { apiRequest } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

type ApiPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

type ApiRole = {
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

type RolesResponse = {
  data: ApiRole[];
  pagination: ApiPagination;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readErrorMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (isRecord(err) && typeof err.message === "string") return err.message;
  return "Ocorreu um erro inesperado.";
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-slate-50 px-2 py-1 text-xs text-slate-700 border border-slate-200">
      {children}
    </span>
  );
}

export default function Roles() {
  const [items, setItems] = useState<ApiRole[]>([]);
  const [pagination, setPagination] = useState<ApiPagination | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [query, setQuery] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const limit = 20;

  // Dialog detalhes
  const [detailsOpen, setDetailsOpen] = useState<boolean>(false);
  const [detailsRole, setDetailsRole] = useState<ApiRole | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;

    return items.filter((r) => {
      const a = r.displayName.toLowerCase();
      const b = r.name.toLowerCase();
      const c = (r.description ?? "").toLowerCase();
      return a.includes(q) || b.includes(q) || c.includes(q);
    });
  }, [items, query]);

  async function fetchRoles(p: number) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("limit", String(limit));
      // OBS: busca real via backend (também tem filtro client-side)
      if (query.trim()) params.set("search", query.trim());

      const res = await apiRequest<RolesResponse>(`/api/v1/roles?${params.toString()}`);
      setItems(res.data);
      setPagination(res.pagination);
    } catch (err: unknown) {
      toast({
        title: "Falha ao carregar roles",
        description: readErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function openDetails(role: ApiRole) {
    setDetailsRole(role);
    setDetailsOpen(true);
  }

  function onDetailsOpenChange(open: boolean) {
    setDetailsOpen(open);
    if (!open) setDetailsRole(null);
  }

  // Recarrega quando muda page
  useEffect(() => {
    void fetchRoles(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Recarrega quando muda busca (volta pra page 1)
  useEffect(() => {
    const t = window.setTimeout(() => {
      setPage(1);
      void fetchRoles(1);
    }, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Roles</h1>
          <p className="mt-1 text-sm text-slate-500">
            Listagem consumindo <span className="font-mono">/api/v1/roles</span>
          </p>
        </div>

        <div className="relative w-full sm:w-[420px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            placeholder="Buscar por displayName, name ou descrição..."
            className="h-11 rounded-2xl pl-10"
          />
        </div>
      </div>

      <Card className="rounded-3xl border-slate-200 shadow-sm">
        <CardContent className="p-5">
          {/* Top bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-700">
              <span className="font-semibold">Total nesta página:</span> {filtered.length}
              {pagination ? (
                <>
                  <span className="mx-2 text-slate-300">•</span>
                  <span className="text-slate-500">
                    Total: {pagination.total} • Página: {pagination.page}/{pagination.totalPages}
                  </span>
                </>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <Button
                variant="outline"
                className="h-10 rounded-2xl"
                disabled={!pagination?.hasPrev || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>

              <Button
                variant="outline"
                className="h-10 rounded-2xl"
                disabled={!pagination?.hasNext || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="bg-slate-50 border-b border-slate-200">
                  <TableHead className="w-[42%]">Role</TableHead>
                  <TableHead className="w-[18%] text-center">Usuários</TableHead>
                  <TableHead className="w-[28%]">Flags</TableHead>
                  <TableHead className="w-[12%] text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-slate-500">
                      Carregando roles...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-slate-500">
                      Nenhuma role encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => {
                    const usersCount = r._count?.users ?? 0;
                    return (
                      <TableRow key={r.id} className="hover:bg-slate-50/60">
                        <TableCell className="min-w-0">
                          <div className="flex items-start gap-3">
                            <div className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                              <Shield className="h-4 w-4" />
                            </div>

                            <div className="min-w-0">
                              <div className="truncate font-medium text-slate-900">
                                {r.displayName}
                              </div>
                              <div className="truncate text-xs text-slate-500">
                                <span className="font-mono">{r.name}</span>
                                {r.description ? (
                                  <>
                                    <span className="mx-2 text-slate-300">•</span>
                                    <span className="truncate">{r.description}</span>
                                  </>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <Badge className="rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                            {usersCount}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            <Pill>{r.permissions.length} permissões</Pill>
                            <Pill>{r.isSystem ? "System" : "Custom"}</Pill>
                            <Badge
                              className={[
                                "rounded-full border px-2 py-0.5 text-xs",
                                r.isActive
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-slate-100 text-slate-700 border-slate-200",
                              ].join(" ")}
                            >
                              {r.isActive ? "Ativa" : "Inativa"}
                            </Badge>
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-2xl"
                            onClick={() => openDetails(r)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog detalhes */}
      <Dialog open={detailsOpen} onOpenChange={onDetailsOpenChange}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Detalhes da role</DialogTitle>
            <DialogDescription>
              {detailsRole ? (
                <>
                  <span className="font-medium">{detailsRole.displayName}</span>{" "}
                  <span className="text-slate-400">•</span>{" "}
                  <span className="font-mono">{detailsRole.name}</span>
                </>
              ) : (
                "—"
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1">
            {detailsRole ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-medium text-slate-500">Status</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge
                        className={[
                          "rounded-full border px-2 py-0.5 text-xs",
                          detailsRole.isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-700 border-slate-200",
                        ].join(" ")}
                      >
                        {detailsRole.isActive ? "Ativa" : "Inativa"}
                      </Badge>

                      <Pill>{detailsRole.isSystem ? "System" : "Custom"}</Pill>
                      {detailsRole.color ? <Pill>Cor: {detailsRole.color}</Pill> : <Pill>Sem cor</Pill>}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-medium text-slate-500">Auditoria</div>
                    <div className="mt-2 flex flex-col gap-2 text-sm text-slate-700">
                      <div>
                        <span className="text-slate-500">Criada em:</span>{" "}
                        {formatDate(detailsRole.createdAt)}
                      </div>
                      <div>
                        <span className="text-slate-500">Atualizada em:</span>{" "}
                        {formatDate(detailsRole.updatedAt)}
                      </div>
                    </div>
                  </div>
                </div>

                {detailsRole.description ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-medium text-slate-500">Descrição</div>
                    <div className="mt-2 text-sm text-slate-800">{detailsRole.description}</div>
                  </div>
                ) : null}

                <Separator />

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Permissões</div>
                      <div className="text-xs text-slate-500">
                        Total: {detailsRole.permissions.length}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 max-h-[320px] overflow-y-auto pr-1">
                    {detailsRole.permissions.length === 0 ? (
                      <div className="py-6 text-center text-sm text-slate-500">
                        Nenhuma permissão.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {detailsRole.permissions.map((p) => (
                          <Badge
                            key={p}
                            variant="secondary"
                            className="rounded-full bg-slate-100 px-3 py-1 text-slate-800 border border-slate-200"
                          >
                            {p}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500">—</div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onDetailsOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
