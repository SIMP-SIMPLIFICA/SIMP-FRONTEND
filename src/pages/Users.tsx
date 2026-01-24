import { useEffect, useMemo, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type ApiPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

type RoleInner = {
  id?: string;
  name?: string;
  displayName?: string;
  permissions?: string[];
};

type RoleWrapper = { role?: RoleInner };
type RoleFlat = { name?: string; displayName?: string };

type ApiUser = {
  id: string;
  email: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  isActive?: boolean;
  isVerified?: boolean;
  createdAt?: string;
  roles?: Array<RoleWrapper | RoleFlat>;
};

type UsersResponse = {
  data: ApiUser[];
  pagination?: ApiPagination;
};

function isRoleWrapper(x: unknown): x is RoleWrapper {
  return typeof x === "object" && x !== null && "role" in x;
}

function isRoleFlat(x: unknown): x is RoleFlat {
  return typeof x === "object" && x !== null && ("name" in x || "displayName" in x);
}

function getRoleLabel(u: ApiUser): string {
  const first = u.roles?.[0];
  if (!first) return "—";

  if (isRoleWrapper(first)) {
    return first.role?.displayName ?? first.role?.name ?? "—";
  }

  if (isRoleFlat(first)) {
    return first.displayName ?? first.name ?? "—";
  }

  return "—";
}

function fullName(u: ApiUser): string {
  const a = (u.firstName ?? "").trim();
  const b = (u.lastName ?? "").trim();
  const name = `${a} ${b}`.trim();
  const fallback = (u.username ?? "").trim() || u.email;
  return name || fallback;
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function getErrorMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const msg = (err as { message: unknown }).message;
    return typeof msg === "string" ? msg : "Erro desconhecido";
  }
  return "Erro desconhecido";
}

export default function Users() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ApiUser[]>([]);
  const [pagination, setPagination] = useState<ApiPagination | null>(null);

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;

    return items.filter((u) => {
      const name = fullName(u).toLowerCase();
      const email = u.email.toLowerCase();
      const username = (u.username ?? "").toLowerCase();
      const role = getRoleLabel(u).toLowerCase();
      return (
        name.includes(term) ||
        email.includes(term) ||
        username.includes(term) ||
        role.includes(term)
      );
    });
  }, [items, q]);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      try {
        // endpoint do boilerplate
        const res = await apiRequest<UsersResponse>(`/api/v1/users?page=${page}&limit=${limit}`);
        if (!alive) return;

        setItems(res.data ?? []);
        setPagination(res.pagination ?? null);
      } catch (err: unknown) {
        if (!alive) return;

        toast({
          title: "Falha ao carregar usuários",
          description: getErrorMessage(err),
          variant: "destructive",
        });

        setItems([]);
        setPagination(null);
      } finally {
        if (alive) setLoading(false);
      }
    }

    void load();
    return () => {
      alive = false;
    };
  }, [page]);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Usuários</h1>
          <p className="mt-1 text-sm text-slate-500">
            Listagem consumindo <span className="font-mono">/api/v1/users</span>
          </p>
        </div>

        <div className="w-full max-w-sm">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, e-mail, usuário ou role…"
            className="h-11 rounded-2xl"
          />
        </div>
      </div>

      <Card className="rounded-2xl border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base text-slate-900">
            {loading ? "Carregando…" : `Total na página: ${filtered.length}`}
          </CardTitle>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="rounded-2xl"
              disabled={loading || (pagination ? !pagination.hasPrev : page <= 1)}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>

            <div className="text-sm text-slate-600">
              Página <span className="font-medium text-slate-900">{page}</span>
              {pagination?.totalPages ? (
                <>
                  {" "}
                  de <span className="font-medium text-slate-900">{pagination.totalPages}</span>
                </>
              ) : null}
            </div>

            <Button
              className="rounded-2xl bg-[#0A5BC4] hover:bg-[#094fa8]"
              disabled={loading || (pagination ? !pagination.hasNext : filtered.length < limit)}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Verificação</TableHead>
                  <TableHead className="text-right">Criado em</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-slate-500">
                      {loading ? "Carregando usuários…" : "Nenhum usuário encontrado."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium text-slate-900">{fullName(u)}</TableCell>
                      <TableCell className="text-slate-700">{u.email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className={[
                              "h-2 w-2 rounded-full",
                              u.isActive ? "bg-emerald-500" : "bg-slate-300",
                            ].join(" ")}
                          />
                          <span className="text-sm text-slate-700">
                            {u.isActive ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        {u.isVerified ? (
                          <Badge className="rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                            Verificado
                          </Badge>
                        ) : (
                          <Badge className="rounded-full bg-amber-50 text-amber-700 hover:bg-amber-50">
                            Não verificado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-slate-600">{formatDate(u.createdAt)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {pagination ? (
            <div className="mt-4 text-sm text-slate-500">
              Total: <span className="font-medium text-slate-700">{pagination.total}</span> •
              Limite: <span className="font-medium text-slate-700">{pagination.limit}</span>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
