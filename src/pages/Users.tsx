import { useEffect, useMemo, useState } from "react";
import { Search, Power, Eye, RefreshCw, XCircle } from "lucide-react";

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

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

type ApiRoleRef = {
  role: {
    id: string;
    name: string;
    displayName?: string;
  };
};

type ApiUser = {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar: string;
  isActive: boolean;
  isVerified: boolean;
  twoFactorEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  roles: ApiRoleRef[];
};

type UsersResponse = {
  data: ApiUser[];
  pagination: ApiPagination;
};

type PatchUserStatusBody = {
  isActive: boolean;
  reason?: string;
};

type ApiUserSession = {
  id: string;
  fingerprint: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  deviceType: string | null;
  deviceName: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string;
};

type UserSessionsResponse = {
  sessions: ApiUserSession[];
};

type TerminateSessionsResponse = {
  message: string;
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

function fullName(u: ApiUser): string {
  const a = (u.firstName ?? "").trim();
  const b = (u.lastName ?? "").trim();
  const name = `${a} ${b}`.trim();
  return name || u.username || u.email;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge
      className={[
        "rounded-full border px-3 py-1",
        active
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-slate-100 text-slate-700 border-slate-200",
      ].join(" ")}
    >
      {active ? "Ativo" : "Inativo"}
    </Badge>
  );
}

function SmallFlag({
  ok,
  onLabel,
  offLabel,
}: {
  ok: boolean;
  onLabel: string;
  offLabel: string;
}) {
  return (
    <Badge
      className={[
        "rounded-full border px-2 py-0.5 text-xs",
        ok
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-amber-50 text-amber-700 border-amber-200",
      ].join(" ")}
    >
      {ok ? onLabel : offLabel}
    </Badge>
  );
}

function sessionPrimaryLabel(s: ApiUserSession): string {
  return (
    s.deviceName ||
    s.deviceType ||
    (s.userAgent ? s.userAgent : null) ||
    s.ipAddress ||
    s.id
  );
}

function sessionSecondaryLabel(s: ApiUserSession): string {
  const parts: string[] = [];
  if (s.ipAddress) parts.push(`IP: ${s.ipAddress}`);
  if (s.fingerprint) parts.push(`FP: ${s.fingerprint}`);
  return parts.length ? parts.join(" • ") : "—";
}

export default function Users() {
  const [items, setItems] = useState<ApiUser[]>([]);
  const [pagination, setPagination] = useState<ApiPagination | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [query, setQuery] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const limit = 20;

  // Dialog status
  const [statusDialogOpen, setStatusDialogOpen] = useState<boolean>(false);
  const [statusUser, setStatusUser] = useState<ApiUser | null>(null);
  const [statusReason, setStatusReason] = useState<string>("");
  const [statusSubmitting, setStatusSubmitting] = useState<boolean>(false);

  // Dialog detalhes
  const [detailsDialogOpen, setDetailsDialogOpen] = useState<boolean>(false);
  const [detailsUser, setDetailsUser] = useState<ApiUser | null>(null);

  // Sessões
  const [sessions, setSessions] = useState<ApiUserSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState<boolean>(false);
  const [terminateAllLoading, setTerminateAllLoading] = useState<boolean>(false);
  const [terminateOneLoadingId, setTerminateOneLoadingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;

    return items.filter((u) => {
      const name = fullName(u).toLowerCase();
      const email = u.email.toLowerCase();
      const username = u.username.toLowerCase();
      return name.includes(q) || email.includes(q) || username.includes(q);
    });
  }, [items, query]);

  async function fetchUsers(p: number) {
    setLoading(true);
    try {
      const res = await apiRequest<UsersResponse>(
        `/api/v1/users?page=${p}&limit=${limit}`
      );
      setItems(res.data);
      setPagination(res.pagination);
    } catch (err: unknown) {
      toast({
        title: "Falha ao carregar usuários",
        description: readErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function openStatusDialog(u: ApiUser) {
    setStatusUser(u);
    setStatusReason("");
    setStatusDialogOpen(true);
  }

  function onStatusDialogOpenChange(open: boolean) {
    setStatusDialogOpen(open);
    if (!open) {
      setStatusUser(null);
      setStatusReason("");
      setStatusSubmitting(false);
    }
  }

  async function confirmStatusChange() {
    if (!statusUser) return;

    const reason = statusReason.trim();
    if (reason.length < 3) {
      toast({
        title: "Informe um motivo",
        description: "Digite pelo menos 3 caracteres.",
        variant: "destructive",
      });
      return;
    }

    const next = !statusUser.isActive;

    try {
      setStatusSubmitting(true);

      const body: PatchUserStatusBody = { isActive: next, reason };

      await apiRequest(`/api/v1/users/${statusUser.id}/status`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      toast({
        title: "Usuário atualizado",
        description: `${fullName(statusUser)} agora está ${
          next ? "ativo" : "inativo"
        }.`,
      });

      onStatusDialogOpenChange(false);
      await fetchUsers(page);
    } catch (err: unknown) {
      toast({
        title: "Erro ao atualizar",
        description: readErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setStatusSubmitting(false);
    }
  }

  function openDetailsDialog(u: ApiUser) {
    setDetailsUser(u);
    setDetailsDialogOpen(true);
  }

  function onDetailsDialogOpenChange(open: boolean) {
    setDetailsDialogOpen(open);
    if (!open) {
      setDetailsUser(null);
      setSessions([]);
      setSessionsLoading(false);
      setTerminateAllLoading(false);
      setTerminateOneLoadingId(null);
    }
  }

  async function fetchUserSessions(userId: string) {
    setSessionsLoading(true);
    try {
      const res = await apiRequest<UserSessionsResponse>(
        `/api/v1/users/${userId}/sessions`
      );
      setSessions(res.sessions);
    } catch (err: unknown) {
      toast({
        title: "Falha ao carregar sessões",
        description: readErrorMessage(err),
        variant: "destructive",
      });
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }

  async function terminateAllSessions(userId: string) {
    try {
      setTerminateAllLoading(true);
      const res = await apiRequest<TerminateSessionsResponse>(
        `/api/v1/users/${userId}/sessions`,
        { method: "DELETE" }
      );

      toast({
        title: "Sessões encerradas",
        description: res.message,
      });

      await fetchUserSessions(userId);
    } catch (err: unknown) {
      toast({
        title: "Não foi possível encerrar sessões",
        description: readErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setTerminateAllLoading(false);
    }
  }

  async function terminateSession(sessionId: string, userId: string) {
    try {
      setTerminateOneLoadingId(sessionId);

      await apiRequest(`/api/v1/auth/sessions/${sessionId}`, {
        method: "DELETE",
      });

      toast({
        title: "Sessão encerrada",
        description: "A sessão foi encerrada com sucesso.",
      });

      // mantém lista consistente
      await fetchUserSessions(userId);
    } catch (err: unknown) {
      toast({
        title: "Não foi possível encerrar",
        description: readErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setTerminateOneLoadingId(null);
    }
  }

  useEffect(() => {
    void fetchUsers(page);
  }, [page]);

  useEffect(() => {
    if (!detailsDialogOpen) return;
    if (!detailsUser) return;
    void fetchUserSessions(detailsUser.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailsDialogOpen, detailsUser?.id]);

  const totalOnPage = filtered.length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Usuários</h1>
          <p className="mt-1 text-sm text-slate-500">
            Listagem consumindo <span className="font-mono">/api/v1/users</span>
          </p>
        </div>

        <div className="relative w-full sm:w-[420px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setQuery(e.target.value)
            }
            placeholder="Buscar por nome, e-mail ou usuário..."
            className="h-11 rounded-2xl pl-10"
          />
        </div>
      </div>

      <Card className="rounded-3xl border-slate-200 shadow-sm">
        <CardContent className="p-5">
          {/* Top bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-700">
              <span className="font-semibold">Total na página:</span> {totalOnPage}
              {pagination ? (
                <>
                  <span className="mx-2 text-slate-300">•</span>
                  <span className="text-slate-500">
                    Total: {pagination.total} • Página: {pagination.page}/
                    {pagination.totalPages}
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
                  <TableHead className="w-[34%]">Usuário</TableHead>
                  <TableHead className="w-[36%]">E-mail</TableHead>
                  <TableHead className="w-[18%] text-center">Status</TableHead>
                  <TableHead className="w-[12%] text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-10 text-center text-sm text-slate-500"
                    >
                      Carregando usuários...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-10 text-center text-sm text-slate-500"
                    >
                      Nenhum usuário encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((u) => (
                    <TableRow key={u.id} className="hover:bg-slate-50/60">
                      <TableCell className="min-w-0">
                        <div className="truncate font-medium text-slate-900">
                          {fullName(u)}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          @{u.username}
                        </div>
                      </TableCell>

                      <TableCell className="min-w-0">
                        <div className="truncate text-slate-700">{u.email}</div>
                        <div className="text-xs text-slate-500">
                          Criado: {formatDate(u.createdAt)}
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <StatusBadge active={u.isActive} />
                          <SmallFlag
                            ok={u.isVerified}
                            onLabel="Verificado"
                            offLabel="Pendente"
                          />
                          <SmallFlag
                            ok={u.twoFactorEnabled}
                            onLabel="2FA On"
                            offLabel="2FA Off"
                          />
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-2xl"
                            onClick={() => openDetailsDialog(u)}
                            disabled={loading}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-2xl"
                            onClick={() => openStatusDialog(u)}
                            disabled={loading}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Ativar/Desativar */}
      <Dialog open={statusDialogOpen} onOpenChange={onStatusDialogOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {statusUser?.isActive ? "Desativar usuário" : "Ativar usuário"}
            </DialogTitle>
            <DialogDescription>
              Usuário:{" "}
              <span className="font-medium">{statusUser?.email ?? "—"}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="status-reason">Motivo</Label>
            <Textarea
              id="status-reason"
              value={statusReason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setStatusReason(e.target.value)
              }
              placeholder="Ex.: Solicitação do suporte / política interna..."
              className="min-h-[110px]"
              disabled={statusSubmitting}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onStatusDialogOpenChange(false)}
              disabled={statusSubmitting}
            >
              Cancelar
            </Button>

            <Button
              type="button"
              onClick={() => void confirmStatusChange()}
              disabled={statusSubmitting || !statusUser}
            >
              {statusSubmitting ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Detalhes */}
      <Dialog open={detailsDialogOpen} onOpenChange={onDetailsDialogOpenChange}>
        {/* aqui é a correção principal: limitar altura e criar layout com scroll */}
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Detalhes do usuário</DialogTitle>
            <DialogDescription>
              {detailsUser ? detailsUser.email : "—"}
            </DialogDescription>
          </DialogHeader>

          {/* corpo com scroll */}
          <div className="flex-1 overflow-y-auto pr-1">
            {detailsUser ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-medium text-slate-500">Nome</div>
                    <div className="mt-1 text-sm text-slate-900">
                      {fullName(detailsUser)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-medium text-slate-500">
                      Username
                    </div>
                    <div className="mt-1 text-sm text-slate-900">
                      @{detailsUser.username}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-medium text-slate-500">Roles</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {detailsUser.roles.length > 0 ? (
                        detailsUser.roles.map((r) => (
                          <Badge
                            key={r.role.id}
                            variant="secondary"
                            className="rounded-full bg-slate-100 px-3 py-1 text-slate-800"
                            title={r.role.name}
                          >
                            {r.role.displayName || r.role.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500">—</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-medium text-slate-500">
                      Segurança
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <SmallFlag
                        ok={detailsUser.isVerified}
                        onLabel="Verificado"
                        offLabel="Pendente"
                      />
                      <SmallFlag
                        ok={detailsUser.twoFactorEnabled}
                        onLabel="2FA On"
                        offLabel="2FA Off"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-medium text-slate-500">
                      Criado em
                    </div>
                    <div className="mt-1 text-sm text-slate-900">
                      {formatDate(detailsUser.createdAt)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-medium text-slate-500">
                      Último login
                    </div>
                    <div className="mt-1 text-sm text-slate-900">
                      {formatDate(detailsUser.lastLoginAt)}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Sessões */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        Sessões ativas
                      </div>
                      <div className="text-xs text-slate-500">
                        GET{" "}
                        <span className="font-mono">
                          /api/v1/users/{detailsUser.id}/sessions
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-2xl"
                        onClick={() => void fetchUserSessions(detailsUser.id)}
                        disabled={sessionsLoading || terminateAllLoading}
                        title="Atualizar"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Atualizar
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-2xl border-red-200 text-red-700 hover:bg-red-50"
                        onClick={() => void terminateAllSessions(detailsUser.id)}
                        disabled={sessionsLoading || terminateAllLoading}
                        title="Encerrar todas as sessões do usuário"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        {terminateAllLoading ? "Encerrando..." : "Encerrar todas"}
                      </Button>
                    </div>
                  </div>

                  {/* lista com scroll próprio (pra não ficar gigantesca) */}
                  <div className="mt-4">
                    <div className="max-h-[320px] overflow-y-auto pr-1 space-y-2">
                      {sessionsLoading ? (
                        <div className="py-6 text-center text-sm text-slate-500">
                          Carregando sessões...
                        </div>
                      ) : sessions.length === 0 ? (
                        <div className="py-6 text-center text-sm text-slate-500">
                          Nenhuma sessão ativa encontrada.
                        </div>
                      ) : (
                        sessions.map((s) => (
                          <div
                            key={s.id}
                            className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-slate-900">
                                {sessionPrimaryLabel(s)}
                              </div>
                              <div className="mt-0.5 truncate text-xs text-slate-500">
                                {sessionSecondaryLabel(s)}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                                <span className="rounded-full bg-slate-50 px-2 py-1">
                                  Último uso: {formatDate(s.lastUsedAt)}
                                </span>
                                <span className="rounded-full bg-slate-50 px-2 py-1">
                                  Expira: {formatDate(s.expiresAt)}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 sm:justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-2xl border-red-200 text-red-700 hover:bg-red-50"
                                onClick={() =>
                                  void terminateSession(s.id, detailsUser.id)
                                }
                                disabled={
                                  terminateAllLoading ||
                                  terminateOneLoadingId === s.id
                                }
                                title="DELETE /api/v1/auth/sessions/:sessionId"
                              >
                                {terminateOneLoadingId === s.id
                                  ? "Encerrando..."
                                  : "Encerrar"}
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {sessions.length > 0 ? (
                      <div className="mt-2 text-xs text-slate-500">
                        Mostrando {sessions.length} sessão(ões).
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500">—</div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onDetailsDialogOpenChange(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
