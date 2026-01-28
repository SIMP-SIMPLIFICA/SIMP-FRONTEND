import { useEffect, useMemo, useState } from "react";
import { Search, Plus, RefreshCw, Shield } from "lucide-react";

import { apiRequest } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

import { RoleDetailsDialog } from "@/components/roles/RoleDetailsDialog";
import { RolesTable, type RolesTableRole } from "@/components/roles/RolesTable";

type ApiPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

type ApiRole = RolesTableRole;

type RolesResponse = {
  data: ApiRole[];
  pagination: ApiPagination;
};

type AvailablePermissionsResponse = {
  permissions: {
    key: string;
    description?: string;
    category?: string;
    level?: "read" | "write" | "delete" | "manage" | "admin";
  }[];
  categories: {
    name: string;
    displayName: string;
    permissions: string[];
  }[];
};

type CreateRoleBody = {
  name: string;
  displayName: string;
  description?: string;
  color?: string;
  permissions: string[];
  parentId?: string;
  metadata?: Record<string, unknown>;
};

type UpsertMode = "create" | "edit";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readErrorMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (isRecord(err) && typeof err.message === "string") return err.message;
  return "Ocorreu um erro inesperado.";
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">
      {children}
    </span>
  );
}

function clampHexColor(v: string): string {
  const s = v.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(s)) return s;
  return "#0A5BC4";
}

function sortPermissions(a: string, b: string): number {
  return a.localeCompare(b);
}

function isValidRoleName(name: string): boolean {
  if (name.length < 1 || name.length > 50) return false;
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

export default function Roles() {
  const [items, setItems] = useState<ApiRole[]>([]);
  const [pagination, setPagination] = useState<ApiPagination | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [query, setQuery] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const limit = 20;

  // Details dialog
  const [detailsOpen, setDetailsOpen] = useState<boolean>(false);
  const [detailsRole, setDetailsRole] = useState<ApiRole | null>(null);

  // Upsert dialog (create/edit)
  const [upsertMode, setUpsertMode] = useState<UpsertMode>("create");
  const [editingRole, setEditingRole] = useState<ApiRole | null>(null);

  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [createName, setCreateName] = useState<string>("");
  const [createDisplayName, setCreateDisplayName] = useState<string>("");
  const [createDescription, setCreateDescription] = useState<string>("");
  const [createColor, setCreateColor] = useState<string>("#0A5BC4");
  const [createSubmitting, setCreateSubmitting] = useState<boolean>(false);

  const [catalog, setCatalog] = useState<AvailablePermissionsResponse | null>(null);
  const [catalogLoading, setCatalogLoading] = useState<boolean>(false);
  const [permSearch, setPermSearch] = useState<string>("");
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;

    return items.filter((r) => {
      const name = `${r.displayName} ${r.name}`.toLowerCase();
      const perms = r.permissions.join(" ").toLowerCase();
      return name.includes(q) || perms.includes(q);
    });
  }, [items, query]);

  async function fetchRoles(p: number) {
    setLoading(true);
    try {
      const res = await apiRequest<RolesResponse>(`/api/v1/roles?page=${p}&limit=${limit}`);
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

  async function fetchCatalog() {
    setCatalogLoading(true);
    try {
      const res = await apiRequest<AvailablePermissionsResponse>(
        "/api/v1/roles/permissions/available"
      );
      setCatalog(res);
    } catch (err: unknown) {
      toast({
        title: "Falha ao carregar permissões",
        description: readErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setCatalogLoading(false);
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

  function resetUpsertForm() {
    setUpsertMode("create");
    setEditingRole(null);
    setCreateName("");
    setCreateDisplayName("");
    setCreateDescription("");
    setCreateColor("#0A5BC4");
    setPermSearch("");
    setSelectedPerms(new Set());
    setCreateSubmitting(false);
  }

  async function openCreateDialog() {
    setUpsertMode("create");
    setEditingRole(null);
    setCreateOpen(true);

    if (!catalog && !catalogLoading) {
      await fetchCatalog();
    }
  }

  async function openEditDialog(role: ApiRole) {
    if (role.isSystem) {
      toast({
        title: "Não permitido",
        description: "Roles do sistema não podem ser editadas.",
        variant: "destructive",
      });
      return;
    }

    setUpsertMode("edit");
    setEditingRole(role);

    setCreateName(role.name);
    setCreateDisplayName(role.displayName);
    setCreateDescription(role.description ?? "");
    setCreateColor(role.color ?? "#0A5BC4");
    setPermSearch("");
    setSelectedPerms(new Set(role.permissions));

    setCreateOpen(true);

    if (!catalog && !catalogLoading) {
      await fetchCatalog();
    }
  }

  function onCreateOpenChange(open: boolean) {
    setCreateOpen(open);
    if (!open) resetUpsertForm();
  }

  function togglePerm(key: string) {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAllFromCategory(categoryPerms: string[]) {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      for (const p of categoryPerms) next.add(p);
      return next;
    });
  }

  function clearAllFromCategory(categoryPerms: string[]) {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      for (const p of categoryPerms) next.delete(p);
      return next;
    });
  }

  async function submitUpsertRole() {
    const name = createName.trim();
    const displayName = createDisplayName.trim();
    const description = createDescription.trim();
    const color = clampHexColor(createColor);

    if (!isValidRoleName(name)) {
      toast({
        title: "Name inválido",
        description: "Use apenas letras/números/_/- (1 a 50 caracteres).",
        variant: "destructive",
      });
      return;
    }

    if (displayName.length < 1 || displayName.length > 100) {
      toast({
        title: "Display Name inválido",
        description: "Informe entre 1 e 100 caracteres.",
        variant: "destructive",
      });
      return;
    }

    if (description.length > 500) {
      toast({
        title: "Descrição muito longa",
        description: "Máximo de 500 caracteres.",
        variant: "destructive",
      });
      return;
    }

    if (selectedPerms.size < 1) {
      toast({
        title: "Selecione permissões",
        description: "Você precisa selecionar pelo menos 1 permissão.",
        variant: "destructive",
      });
      return;
    }

    const body: CreateRoleBody = {
      name,
      displayName,
      permissions: Array.from(selectedPerms).sort(sortPermissions),
    };

    if (description.length > 0) body.description = description;
    if (color) body.color = color;

    try {
      setCreateSubmitting(true);

      if (upsertMode === "create") {
        await apiRequest("/api/v1/roles", {
          method: "POST",
          body: JSON.stringify(body),
        });

        toast({
          title: "Role criada",
          description: `${displayName} (${name}) foi criada com sucesso.`,
        });
      } else {
        if (!editingRole) {
          toast({
            title: "Erro interno",
            description: "Role para edição não definida.",
            variant: "destructive",
          });
          return;
        }

        await apiRequest(`/api/v1/roles/${editingRole.id}`, {
          method: "PUT",
          body: JSON.stringify(body), // pode enviar permissions sempre ✅
        });

        toast({
          title: "Role atualizada",
          description: `${displayName} foi atualizada com sucesso.`,
        });
      }

      onCreateOpenChange(false);
      await fetchRoles(page);
    } catch (err: unknown) {
      toast({
        title: upsertMode === "create" ? "Erro ao criar role" : "Erro ao atualizar role",
        description: readErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setCreateSubmitting(false);
    }
  }

  useEffect(() => {
    void fetchRoles(page);
  }, [page]);

  const totalOnPage = filtered.length;

  const catalogPerms = catalog?.permissions ?? [];
  const categories = catalog?.categories ?? [];

  const filteredCatalogPerms = useMemo(() => {
    const q = permSearch.trim().toLowerCase();
    if (!q) return catalogPerms;
    return catalogPerms.filter((p) => {
      const key = p.key.toLowerCase();
      const desc = (p.description ?? "").toLowerCase();
      const cat = (p.category ?? "").toLowerCase();
      const lvl = (p.level ?? "").toLowerCase();
      return key.includes(q) || desc.includes(q) || cat.includes(q) || lvl.includes(q);
    });
  }, [catalogPerms, permSearch]);

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

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
          <div className="relative w-full sm:w-[420px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
              placeholder="Buscar por name, displayName ou permissão..."
              className="h-11 rounded-2xl pl-10"
            />
          </div>

          <Button className="h-11 rounded-2xl gap-2" onClick={() => void openCreateDialog()}>
            <Plus className="h-4 w-4" />
            Nova role
          </Button>
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

          <RolesTable
            loading={loading}
            roles={filtered}
            onOpenDetails={openDetails}
            onEdit={(r) => void openEditDialog(r)}
          />
        </CardContent>
      </Card>

      <RoleDetailsDialog open={detailsOpen} onOpenChange={onDetailsOpenChange} role={detailsRole} />

      {/* Dialog Create/Edit */}
      <Dialog open={createOpen} onOpenChange={onCreateOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[88vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{upsertMode === "create" ? "Nova role" : "Editar role"}</DialogTitle>
            <DialogDescription>
              {upsertMode === "create" ? (
                <>
                  Cria uma nova role usando <span className="font-mono">POST /api/v1/roles</span>.
                </>
              ) : (
                <>
                  Atualiza usando <span className="font-mono">PUT /api/v1/roles/:id</span>.
                </>
              )}{" "}
              Selecione pelo menos 1 permissão.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-semibold text-slate-900">Informações</div>

                <div className="mt-4 grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="create-name">Name</Label>
                    <Input
                      id="create-name"
                      value={createName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateName(e.target.value)
                      }
                      placeholder="ex: moderator"
                      className="h-11 rounded-2xl"
                      disabled={createSubmitting}
                    />
                    <div className="text-xs text-slate-500">
                      Padrão: letras/números/_/- (1 a 50).
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-displayName">Display Name</Label>
                    <Input
                      id="create-displayName"
                      value={createDisplayName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateDisplayName(e.target.value)
                      }
                      placeholder="ex: Moderator"
                      className="h-11 rounded-2xl"
                      disabled={createSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-description">Descrição</Label>
                    <Textarea
                      id="create-description"
                      value={createDescription}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setCreateDescription(e.target.value)
                      }
                      placeholder="Opcional"
                      className="min-h-[110px]"
                      disabled={createSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-color">Cor (hex)</Label>
                    <Input
                      id="create-color"
                      value={createColor}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateColor(e.target.value)
                      }
                      placeholder="#0A5BC4"
                      className="h-11 rounded-2xl"
                      disabled={createSubmitting}
                    />
                    <div className="text-xs text-slate-500">
                      Ex.: <span className="font-mono">#0A5BC4</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Permissões</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Catálogo via{" "}
                      <span className="font-mono">GET /api/v1/roles/permissions/available</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-2xl gap-2"
                    onClick={() => void fetchCatalog()}
                    disabled={catalogLoading || createSubmitting}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Atualizar
                  </Button>
                </div>

                <div className="mt-4">
                  <Input
                    value={permSearch}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPermSearch(e.target.value)}
                    placeholder="Buscar permissões..."
                    className="h-11 rounded-2xl"
                    disabled={catalogLoading || createSubmitting}
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Pill>Selecionadas: {selectedPerms.size}</Pill>
                </div>

                <Separator className="my-4" />

                {catalogLoading ? (
                  <div className="py-10 text-center text-sm text-slate-500">
                    Carregando catálogo...
                  </div>
                ) : !catalog ? (
                  <div className="py-10 text-center text-sm text-slate-500">
                    Catálogo não carregado.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {categories.length > 0 ? (
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-slate-500">Categorias</div>

                        <div className="flex flex-wrap gap-2">
                          {categories.map((c) => (
                            <div
                              key={c.name}
                              className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2"
                            >
                              <div className="text-xs font-medium text-slate-800">
                                {c.displayName}
                              </div>

                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-2xl"
                                onClick={() => selectAllFromCategory(c.permissions)}
                                disabled={createSubmitting}
                              >
                                Selecionar
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-2xl"
                                onClick={() => clearAllFromCategory(c.permissions)}
                                disabled={createSubmitting}
                              >
                                Limpar
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="max-h-[420px] overflow-y-auto pr-1">
                      {filteredCatalogPerms.length === 0 ? (
                        <div className="py-10 text-center text-sm text-slate-500">
                          Nenhuma permissão encontrada.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredCatalogPerms.map((p) => {
                            const checked = selectedPerms.has(p.key);

                            return (
                              <div
                                key={p.key}
                                className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2"
                              >
                                <div className="flex items-start gap-3">
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={() => togglePerm(p.key)}
                                    disabled={createSubmitting}
                                  />

                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="font-mono text-sm text-slate-900">
                                        {p.key}
                                      </span>
                                      {p.level ? (
                                        <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs text-slate-800">
                                          {p.level}
                                        </span>
                                      ) : null}
                                    </div>

                                    {p.description ? (
                                      <div className="mt-1 text-xs text-slate-500">
                                        {p.description}
                                      </div>
                                    ) : null}
                                  </div>
                                </div>

                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-8 rounded-2xl"
                                  onClick={() => togglePerm(p.key)}
                                  disabled={createSubmitting}
                                >
                                  {checked ? "Remover" : "Adicionar"}
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onCreateOpenChange(false)}>
              Cancelar
            </Button>

            <Button
              type="button"
              onClick={() => void submitUpsertRole()}
              disabled={createSubmitting}
              className="gap-2"
            >
              <Shield className="h-4 w-4" />
              {createSubmitting
                ? upsertMode === "create"
                  ? "Criando..."
                  : "Salvando..."
                : upsertMode === "create"
                ? "Criar role"
                : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
