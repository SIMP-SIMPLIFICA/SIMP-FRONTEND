import { useEffect, useMemo, useState } from "react";
import { Search, Power, Eye, XCircle, Plus, Pencil, Trash2, KeyRound, AlertTriangle } from "lucide-react";

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
import { HasPermission } from "@/components/layout/HasPermission";


import { UserFormDialog } from "@/components/users/UserFormDialog";

// --- TYPES ---
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
    displayName: string;
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

// --- HELPERS ---
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

// --- MAIN COMPONENT ---
export default function Users() {
  const [items, setItems] = useState<ApiUser[]>([]);
  const [pagination, setPagination] = useState<ApiPagination | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [query, setQuery] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const limit = 20;

  // DIALOGS
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusUser, setStatusUser] = useState<ApiUser | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [detailsUser, setDetailsUser] = useState<ApiUser | null>(null);

  // Form Dialog (Create/Edit)
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null);

  // Delete Dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<ApiUser | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Reset Password Dialog
  const [resetOpen, setResetOpen] = useState(false);
  const [resetUser, setResetUser] = useState<ApiUser | null>(null);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  // Sessões
  const [sessions, setSessions] = useState<ApiUserSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [terminateAllLoading, setTerminateAllLoading] = useState(false);

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
      const res = await apiRequest<UsersResponse>(`/api/v1/users?page=${p}&limit=${limit}`);
      setItems(res.data);
      setPagination(res.pagination);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  // --- ACTIONS: CREATE / EDIT ---
  function openCreate() {
    setEditingUser(null);
    setFormOpen(true);
  }

  function openEdit(u: ApiUser) {
    setEditingUser(u);
    setFormOpen(true);
  }

  // --- ACTIONS: DELETE ---
  function openDelete(u: ApiUser) {
    setDeleteUser(u);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deleteUser) return;
    try {
      setDeleteSubmitting(true);
      await apiRequest(`/api/v1/users/${deleteUser.id}`, { method: "DELETE" });
      toast({ title: "Sucesso", description: "Usuário removido." });
      setDeleteOpen(false);
      void fetchUsers(page);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setDeleteSubmitting(false);
    }
  }

  // --- ACTIONS: FORCE PASSWORD RESET ---
  function openReset(u: ApiUser) {
    setResetUser(u);
    setResetOpen(true);
  }

  async function confirmReset() {
    if (!resetUser) return;
    try {
      setResetSubmitting(true);
      const res = await apiRequest<{ newPassword?: string; message?: string }>(
        `/api/v1/users/${resetUser.id}/force-password-reset`,
        { method: "POST" }
      );

      setResetOpen(false);

      if (res.newPassword) {
        // Se o backend retorna a senha (comum em admins resets)
        navigator.clipboard.writeText(res.newPassword);
        toast({
          title: "Senha Resetada!",
          description: `Nova senha: ${res.newPassword} (Copiada)`,
          duration: 10000,
        });
      } else {
        toast({ title: "Sucesso", description: res.message || "Reset iniciado." });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setResetSubmitting(false);
    }
  }

  // --- ACTIONS: STATUS ---
  function openStatus(u: ApiUser) {
    setStatusUser(u);
    setStatusReason("");
    setStatusDialogOpen(true);
  }

  async function confirmStatusChange() {
    if (!statusUser) return;
    if (statusReason.length < 3) {
      toast({ title: "Atenção", description: "Informe um motivo válido.", variant: "destructive" });
      return;
    }
    const next = !statusUser.isActive;
    try {
      setStatusSubmitting(true);
      await apiRequest(`/api/v1/users/${statusUser.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: next, reason: statusReason }),
      });
      toast({ title: "Sucesso", description: `Usuário ${next ? "ativado" : "inativado"}.` });
      setStatusDialogOpen(false);
      void fetchUsers(page);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setStatusSubmitting(false);
    }
  }

  // --- DETAILS & SESSIONS ---
  function openDetails(u: ApiUser) {
    setDetailsUser(u);
    setDetailsDialogOpen(true);
  }

  useEffect(() => {
    if (detailsDialogOpen && detailsUser) {
      void fetchUserSessions(detailsUser.id);
    }
  }, [detailsDialogOpen, detailsUser]);

  async function fetchUserSessions(id: string) {
    setSessionsLoading(true);
    try {
      const res = await apiRequest<UserSessionsResponse>(`/api/v1/users/${id}/sessions`);
      setSessions(res.sessions);
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }

  async function terminateAllSessions(id: string) {
    setTerminateAllLoading(true);
    try {
      await apiRequest(`/api/v1/users/${id}/sessions`, { method: "DELETE" });
      toast({ title: "Sucesso", description: "Sessões encerradas." });
      void fetchUserSessions(id);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setTerminateAllLoading(false);
    }
  }

  // --- EFFECTS ---
  useEffect(() => {
    void fetchUsers(page);
  }, [page]);

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Usuários</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gestão de contas e acessos.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
          <div className="relative w-full sm:w-[320px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar usuários..."
              className="h-11 rounded-2xl pl-10"
            />
          </div>
          <HasPermission anyOf={["users:write", "users:manage"]}>
            <Button className="h-11 rounded-2xl gap-2 bg-[#0A5BC4] hover:bg-[#094FA8]" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Novo Usuário
            </Button>
          </HasPermission>
        </div>
      </div>

      {/* TABLE */}
      <Card className="rounded-3xl border-slate-200 shadow-sm">
        <CardContent className="p-5">
          {/* Pagination Top */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="text-sm text-slate-500">
              Página {pagination?.page || 1} de {pagination?.totalPages || 1} • Total: {pagination?.total || 0}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPage(p => p - 1)} disabled={!pagination?.hasPrev}>Anterior</Button>
              <Button variant="secondary" size="sm" onClick={() => setPage(p => p + 1)} disabled={!pagination?.hasNext}>Próxima</Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-[30%]">Usuário</TableHead>
                  <TableHead className="w-[30%]">Contato</TableHead>
                  <TableHead className="w-[15%] text-center">Status</TableHead>
                  <TableHead className="w-[25%] text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">Nenhum usuário encontrado.</TableCell></TableRow>
                ) : (
                  filtered.map(u => (
                    <TableRow key={u.id} className="hover:bg-slate-50/50">
                      <TableCell>
                        <div className="font-medium text-slate-900">{fullName(u)}</div>
                        <div className="text-xs text-slate-500">@{u.username}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-slate-700">{u.email}</div>
                        <div className="text-xs text-slate-400">{formatDate(u.createdAt)}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge active={u.isActive} />
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <HasPermission anyOf={["users:read", "users:manage", "users:write"]}>
                            <Button size="sm" variant="secondary" className="rounded-2xl text-slate-500" title="Detalhes" onClick={() => openDetails(u)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </HasPermission>

                          <HasPermission anyOf={["users:write", "users:manage"]}>
                            <Button size="sm" variant="secondary" className="rounded-2xl text-blue-600" title="Editar" onClick={() => openEdit(u)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </HasPermission>

                          <HasPermission anyOf={["users:write", "users:manage"]}>
                            <Button size="sm" variant="secondary" className="rounded-2xl text-amber-600" title="Status" onClick={() => openStatus(u)}>
                              <Power className="h-4 w-4" />
                            </Button>
                          </HasPermission>

                          <HasPermission anyOf={["users:manage"]}>
                            <Button size="sm" variant="secondary" className="rounded-2xl text-orange-600" title="Resetar Senha" onClick={() => openReset(u)}>
                              <KeyRound className="h-4 w-4" />
                            </Button>
                          </HasPermission>

                          <HasPermission anyOf={["users:delete", "users:manage"]}>
                            <Button size="sm" variant="secondary" className="rounded-2xl border-red-100 text-red-600 hover:bg-red-50 hover:text-red-700" title="Excluir" onClick={() => openDelete(u)}>
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
        </CardContent>
      </Card>

      {/* --- DIALOGS --- */}

      {/* Create / Edit Form */}
      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        user={editingUser}
        onSuccess={() => void fetchUsers(page)}
      />

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-center">Excluir Usuário?</DialogTitle>
            <DialogDescription className="text-center">
              Tem certeza que deseja remover <strong>{deleteUser?.username}</strong>? Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-2">
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="danger" onClick={() => void confirmDelete()} disabled={deleteSubmitting}>
              {deleteSubmitting ? "Excluindo..." : "Sim, Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Confirmation */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Forçar Reset de Senha</DialogTitle>
            <DialogDescription>
              Isso irá gerar uma nova senha aleatória para <strong>{resetUser?.username}</strong> e invalidar a atual.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setResetOpen(false)}>Cancelar</Button>
            <Button onClick={() => void confirmReset()} disabled={resetSubmitting}>
              {resetSubmitting ? "Processando..." : "Gerar Nova Senha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{statusUser?.isActive ? "Desativar" : "Ativar"} Usuário</DialogTitle>
            <DialogDescription>Motivo da alteração de status para {statusUser?.username}.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="Ex: Solicitação do RH..."
              value={statusReason}
              onChange={e => setStatusReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setStatusDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => void confirmStatusChange()} disabled={statusSubmitting}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details View (Session Management) */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Detalhes: {detailsUser?.username}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border bg-slate-50">
                <div className="text-xs text-slate-500">ID Interno</div>
                <div className="font-mono text-sm">{detailsUser?.id}</div>
              </div>
              <div className="p-4 rounded-xl border bg-slate-50">
                <div className="text-xs text-slate-500">Roles</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {detailsUser?.roles.map(r => (
                    <Badge key={r.role.id} variant="secondary" className="text-[10px]">{r.role.displayName}</Badge>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">Sessões Ativas</h3>
                <Button size="sm" variant="danger" onClick={() => detailsUser && void terminateAllSessions(detailsUser.id)} disabled={terminateAllLoading}>
                  Encerrar Todas
                </Button>
              </div>
              <div className="space-y-2">
                {sessionsLoading ? <div className="text-center py-4 text-slate-500">Carregando...</div> :
                  sessions.length === 0 ? <div className="text-center py-4 text-slate-500">Nenhuma sessão ativa.</div> :
                    sessions.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium text-sm">{s.deviceName || "Dispositivo desconhecido"}</div>
                          <div className="text-xs text-slate-500">{s.ipAddress} • {formatDate(s.lastUsedAt)}</div>
                        </div>
                        <Button size="sm" variant="ghost" className="h-8 w-8 text-red-600" title="Derrubar"><XCircle className="h-4 w-4" /></Button>
                      </div>
                    ))
                }
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}