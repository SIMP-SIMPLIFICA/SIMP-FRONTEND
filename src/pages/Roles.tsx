import { useEffect, useMemo, useState } from "react";
import { Search, Plus, RefreshCw, Shield, AlertTriangle, Layers, Lock, Settings } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";

import { RoleDetailsDialog } from "@/components/roles/RoleDetailsDialog";
import { RolesTable, type RolesTableRole } from "@/components/roles/RolesTable";

// --- Types ---

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

type PermissionItem = {
  key: string;
  description: string;
  category?: string;
  level?: string;
};

type CategoryItem = {
  name: string;
  displayName: string;
  permissions: string[];
};

type CatalogData = {
  permissions: PermissionItem[];
  categories: CategoryItem[];
};

type CreateRoleBody = {
  name: string;
  displayName: string;
  description?: string;
  color?: string;
  permissions: string[];
};

type DuplicateRoleBody = {
  name: string;
  displayName: string;
  description?: string;
};

type UpsertMode = "create" | "edit";

const FALLBACK_CATALOG: CatalogData = {
  categories: [
    { name: "users", displayName: "Gestão de Usuários", permissions: ["users:read", "users:write", "users:delete", "users:manage"] },
    { name: "roles", displayName: "Gestão de Perfis (Roles)", permissions: ["roles:read", "roles:write", "roles:delete", "roles:manage"] },
    { name: "financial", displayName: "Módulo Financeiro", permissions: ["finance:read", "finance:write", "finance:approve", "finance:export"] },
    { name: "system", displayName: "Configurações do Sistema", permissions: ["system:admin", "settings:read", "settings:write", "audit:read", "audit:export"] },
    { name: "security", displayName: "Segurança & Sessões", permissions: ["sessions:view", "sessions:manage", "backup:create", "backup:restore"] },
    { name: "communication", displayName: "Comunicação e Protocolo", permissions: ["documents:read", "documents:create", "documents:manage", "documents:sign", "documents:send"] },
    { name: "processes", displayName: "Processos Virtuais", permissions: ["processes:read", "processes:write", "processes:manage", "processes:download"] }
  ],
  permissions: [
    // Users
    { key: "users:read", description: "Visualizar listagem de usuários", category: "users" },
    { key: "users:write", description: "Criar e editar usuários", category: "users" },
    { key: "users:delete", description: "Excluir usuários", category: "users" },
    { key: "users:manage", description: "Controle total de usuários (inclui reset de senha)", category: "users" },
    // Roles
    { key: "roles:read", description: "Visualizar perfis de acesso", category: "roles" },
    { key: "roles:write", description: "Criar e editar perfis", category: "roles" },
    { key: "roles:delete", description: "Excluir perfis", category: "roles" },
    { key: "roles:manage", description: "Gerenciar permissões avançadas", category: "roles" },
    // Financial (Exemplo)
    { key: "finance:read", description: "Visualizar relatórios financeiros", category: "financial" },
    { key: "finance:write", description: "Lançar despesas e receitas", category: "financial" },
    { key: "finance:approve", description: "Aprovar transações", category: "financial" },
    { key: "finance:export", description: "Exportar dados financeiros", category: "financial" },
    // System
    { key: "system:admin", description: "Acesso de Super Administrador", category: "system" },
    { key: "settings:read", description: "Ver configurações globais", category: "system" },
    { key: "settings:write", description: "Alterar configurações globais", category: "system" },
    { key: "audit:read", description: "Acessar logs de auditoria", category: "system" },
    { key: "audit:export", description: "Baixar logs de auditoria", category: "system" },
    // Security
    { key: "sessions:view", description: "Ver sessões ativas", category: "security" },
    { key: "sessions:manage", description: "Derrubar sessões de usuários", category: "security" },
    { key: "backup:create", description: "Gerar backup manual", category: "security" },
    { key: "backup:restore", description: "Restaurar sistema", category: "security" },
    // Communication (Added manually as requested)
    { key: "documents:read", description: "Visualizar documentos", category: "communication" },
    { key: "documents:create", description: "Criar documentos", category: "communication" },
    { key: "documents:manage", description: "Gerenciar documentos", category: "communication" },
    { key: "documents:sign", description: "Assinar documentos", category: "communication" },
    { key: "documents:send", description: "Enviar/Protocolar", category: "communication" },
    // Virtual Processes
    { key: "processes:read", description: "Visualizar lista e metadados", category: "processes" },
    { key: "processes:write", description: "Autuar e anexar documentos", category: "processes" },
    { key: "processes:manage", description: "Reabrir e gerenciar processos", category: "processes" },
    { key: "processes:download", description: "Baixar anexos", category: "processes" },
    // Profile
    { key: "profile:read", description: "Ver próprio perfil", category: "other" },
    { key: "profile:write", description: "Editar próprio perfil", category: "other" },
  ]
};

// --- Helpers ---

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readErrorMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (isRecord(err) && typeof err.message === "string") return err.message;
  return "Ocorreu um erro inesperado.";
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

  // Upsert dialog
  const [upsertMode, setUpsertMode] = useState<UpsertMode>("create");
  const [editingRole, setEditingRole] = useState<ApiRole | null>(null);
  const [createOpen, setCreateOpen] = useState<boolean>(false);

  // Form States
  const [createName, setCreateName] = useState<string>("");
  const [createDisplayName, setCreateDisplayName] = useState<string>("");
  const [createDescription, setCreateDescription] = useState<string>("");
  const [createColor, setCreateColor] = useState<string>("#0A5BC4");
  const [createSubmitting, setCreateSubmitting] = useState<boolean>(false);

  // Duplicate Dialog
  const [dupOpen, setDupOpen] = useState<boolean>(false);
  const [dupSource, setDupSource] = useState<ApiRole | null>(null);
  const [dupName, setDupName] = useState<string>("");
  const [dupDisplayName, setDupDisplayName] = useState<string>("");
  const [dupSubmitting, setDupSubmitting] = useState<boolean>(false);

  // Delete Dialog
  const [delOpen, setDelOpen] = useState<boolean>(false);
  const [delTarget, setDelTarget] = useState<ApiRole | null>(null);
  const [delSubmitting, setDelSubmitting] = useState<boolean>(false);

  // Permissions Catalog
  const [catalog, setCatalog] = useState<CatalogData>({ permissions: [], categories: [] });
  const [catalogLoading, setCatalogLoading] = useState<boolean>(false);
  const [permSearch, setPermSearch] = useState<string>("");
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());

  const filteredRoles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((r) => {
      const name = `${r.displayName} ${r.name}`.toLowerCase();
      const perms = r.permissions.join(" ").toLowerCase();
      return name.includes(q) || perms.includes(q);
    });
  }, [items, query]);

  const filteredCatalogCategories = useMemo(() => {
    const q = permSearch.trim().toLowerCase();

    if (!q) return catalog.categories;

    return catalog.categories.map(cat => {
      const matchingPerms = cat.permissions.filter(permKey => {
        const pDef = catalog.permissions.find(p => p.key === permKey);
        if (!pDef) return permKey.includes(q);
        return pDef.key.toLowerCase().includes(q) || pDef.description.toLowerCase().includes(q);
      });

      return {
        ...cat,
        permissions: matchingPerms
      };
    }).filter(cat => cat.permissions.length > 0);
  }, [catalog, permSearch]);

  // --- API Actions ---

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
      const res = await apiRequest<unknown>("/api/v1/roles/permissions/available");

      let rawPermissions: unknown[] = [];
      let rawCategories: unknown[] = [];

      if (Array.isArray(res)) {
        rawPermissions = res;
      } else if (isRecord(res)) {
        if (Array.isArray(res.permissions)) {
          rawPermissions = res.permissions;
        } else if (isRecord(res.data) && Array.isArray(res.data.permissions)) {
          rawPermissions = res.data.permissions;
        } else if (Array.isArray(res.data)) {
          rawPermissions = res.data;
        }

        if (Array.isArray(res.categories)) {
          rawCategories = res.categories;
        }
      }

      const normalizedPermissions = rawPermissions.map((p): PermissionItem | null => {
        if (typeof p === "string") return { key: p, description: "" };
        if (isRecord(p) && typeof p.key === "string") {
          return {
            key: p.key,
            description: typeof p.description === "string" ? p.description : "",
            category: typeof p.category === "string" ? p.category : undefined,
            level: typeof p.level === "string" ? p.level : undefined,
          };
        }
        return null;
      }).filter((p): p is PermissionItem => p !== null);

      const normalizedCategories: CategoryItem[] = rawCategories.map((c) => {
        if (isRecord(c) && typeof c.name === "string" && Array.isArray(c.permissions)) {
          return {
            name: c.name,
            displayName: typeof c.displayName === "string" ? c.displayName : c.name,
            permissions: c.permissions.filter((x): x is string => typeof x === "string"),
          };
        }
        return null;
      }).filter((c): c is CategoryItem => c !== null);

      if (normalizedPermissions.length === 0) {
        throw new Error("Empty catalog");
      }

      setCatalog({
        permissions: normalizedPermissions,
        categories: normalizedCategories,
      });

    } catch (err: unknown) {
      console.warn("⚠️ Usando catálogo local (fallback). Motivo:", err);
      // 🔥 FALLBACK ORGANIZADO 🔥
      setCatalog(FALLBACK_CATALOG);
    } finally {
      setCatalogLoading(false);
    }
  }

  // --- Effects ---

  useEffect(() => {
    void fetchRoles(page);
  }, [page]);

  useEffect(() => {
    if (createOpen) {
      if (catalog.permissions.length === 0 && !catalogLoading) {
        void fetchCatalog();
      }
    }
  }, [createOpen]);

  // --- Handlers ---

  function openDetails(role: ApiRole) {
    setDetailsRole(role);
    setDetailsOpen(true);
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

  function openCreateDialog() {
    setUpsertMode("create");
    setEditingRole(null);
    setCreateOpen(true);
  }

  function openEditDialog(role: ApiRole) {
    if (role.isSystem) {
      toast({ title: "Erro", description: "Role de sistema não editável.", variant: "destructive" });
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
  }

  function togglePerm(key: string) {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAllFromCategory(list: string[]) {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      list.forEach(p => next.add(p));
      return next;
    });
  }

  function clearAllFromCategory(list: string[]) {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      list.forEach(p => next.delete(p));
      return next;
    });
  }

  function getPermissionDetails(key: string) {
    return catalog.permissions.find(p => p.key === key);
  }

  async function submitUpsertRole() {
    const name = createName.trim();
    const displayName = createDisplayName.trim();
    const color = clampHexColor(createColor);

    if (!isValidRoleName(name)) {
      toast({ title: "Nome inválido", description: "Use apenas letras/números/_/-", variant: "destructive" });
      return;
    }
    if (!displayName) {
      toast({ title: "Display Name vazio", variant: "destructive" });
      return;
    }
    if (selectedPerms.size === 0) {
      toast({ title: "Sem permissões", description: "Selecione ao menos uma.", variant: "destructive" });
      return;
    }

    const body: CreateRoleBody = {
      name,
      displayName,
      description: createDescription,
      color,
      permissions: Array.from(selectedPerms).sort(sortPermissions),
    };

    try {
      setCreateSubmitting(true);
      if (upsertMode === "create") {
        await apiRequest("/api/v1/roles", { method: "POST", body: JSON.stringify(body) });
        toast({ title: "Sucesso", description: "Role criada." });
      } else if (editingRole) {
        await apiRequest(`/api/v1/roles/${editingRole.id}`, { method: "PUT", body: JSON.stringify(body) });
        toast({ title: "Sucesso", description: "Role atualizada." });
      }
      setCreateOpen(false);
      resetUpsertForm();
      void fetchRoles(page);
    } catch (err) {
      toast({ title: "Erro", description: readErrorMessage(err), variant: "destructive" });
    } finally {
      setCreateSubmitting(false);
    }
  }

  function openDuplicateDialog(role: ApiRole) {
    setDupSource(role);
    setDupName(`${role.name}_copy`);
    setDupDisplayName(`${role.displayName} (Cópia)`);
    setDupOpen(true);
  }

  async function submitDuplicate() {
    if (!dupSource) return;
    try {
      setDupSubmitting(true);
      const body: DuplicateRoleBody = {
        name: dupName.trim(),
        displayName: dupDisplayName.trim(),
        description: `Cópia de ${dupSource.name}`,
      };
      await apiRequest(`/api/v1/roles/${dupSource.id}/duplicate`, { method: "POST", body: JSON.stringify(body) });
      toast({ title: "Sucesso", description: "Role duplicada." });
      setDupOpen(false);
      void fetchRoles(page);
    } catch (err) {
      toast({ title: "Erro", description: readErrorMessage(err), variant: "destructive" });
    } finally {
      setDupSubmitting(false);
    }
  }

  function openDeleteDialog(role: ApiRole) {
    setDelTarget(role);
    setDelOpen(true);
  }

  async function submitDelete() {
    if (!delTarget) return;
    try {
      setDelSubmitting(true);
      await apiRequest(`/api/v1/roles/${delTarget.id}`, { method: "DELETE" });
      toast({ title: "Sucesso", description: "Role removida." });
      setDelOpen(false);
      void fetchRoles(page);
    } catch (err) {
      toast({ title: "Erro", description: readErrorMessage(err), variant: "destructive" });
    } finally {
      setDelSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Roles</h1>
          <p className="mt-1 text-sm text-slate-500">Gestão de perfis e acesso</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-[320px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar roles..."
              className="h-11 rounded-2xl pl-10"
            />
          </div>
          <Button className="h-11 rounded-2xl gap-2" onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
            Nova role
          </Button>
        </div>
      </div>

      <Card className="rounded-3xl border-slate-200 shadow-sm">
        <CardContent className="p-5">
          <RolesTable
            loading={loading}
            roles={filteredRoles}
            onOpenDetails={openDetails}
            onEdit={openEditDialog}
            onDuplicate={openDuplicateDialog}
            onDelete={openDeleteDialog}
          />
          {pagination && (
            <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
              <div>Página {pagination.page} de {pagination.totalPages}</div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setPage(p => p - 1)} disabled={!pagination.hasPrev}>Anterior</Button>
                <Button variant="secondary" size="sm" onClick={() => setPage(p => p + 1)} disabled={!pagination.hasNext}>Próxima</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <RoleDetailsDialog open={detailsOpen} onOpenChange={setDetailsOpen} role={detailsRole} />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-5xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#0A5BC4]" />
              <DialogTitle>{upsertMode === "create" ? "Nova role" : "Editar role"}</DialogTitle>
            </div>
            <DialogDescription>Defina as informações e permissões de acesso.</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto bg-slate-50/50">
            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] h-full divide-y lg:divide-y-0 lg:divide-x divide-slate-200">

              <div className="p-6 space-y-5 bg-white">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Settings className="h-4 w-4 text-slate-500" />
                    Dados Básicos
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-500">Slug (Identificador)</Label>
                      <Input className="h-9" value={createName} onChange={e => setCreateName(e.target.value)} placeholder="ex: gerente_vendas" disabled={createSubmitting} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-500">Nome de Exibição</Label>
                      <Input className="h-9" value={createDisplayName} onChange={e => setCreateDisplayName(e.target.value)} placeholder="ex: Gerente de Vendas" disabled={createSubmitting} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-500">Cor (Hex)</Label>
                      <div className="flex gap-2">
                        <div className="w-9 h-9 rounded-md border shadow-sm shrink-0" style={{ backgroundColor: createColor }}></div>
                        <Input className="h-9 font-mono" value={createColor} onChange={e => setCreateColor(e.target.value)} disabled={createSubmitting} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-500">Descrição</Label>
                      <Textarea className="min-h-[100px] resize-none text-sm" value={createDescription} onChange={e => setCreateDescription(e.target.value)} disabled={createSubmitting} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 flex flex-col h-full bg-slate-50/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-slate-500" />
                    Permissões
                    <Badge variant="secondary" className="ml-2 bg-blue-50 text-blue-700 hover:bg-blue-50">{selectedPerms.size} selecionadas</Badge>
                  </h3>
                  <div className="flex items-center gap-2">
                    <Input
                      value={permSearch}
                      onChange={e => setPermSearch(e.target.value)}
                      placeholder="Filtrar..."
                      className="h-8 w-[180px] bg-white"
                    />
                    <Button variant="ghost" size="sm" className="h-8 w-8" onClick={() => void fetchCatalog()} disabled={catalogLoading}>
                      <RefreshCw className={`h-4 w-4 ${catalogLoading ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto pr-2 pb-10">
                  {filteredCatalogCategories.length === 0 ? (
                    <div className="py-10 text-center text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
                      Nenhuma permissão encontrada.
                    </div>
                  ) : (
                    filteredCatalogCategories.map(cat => (
                      <div key={cat.name} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-slate-400" />
                            <span className="font-semibold text-sm text-slate-700">{cat.displayName}</span>
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => selectAllFromCategory(cat.permissions)} className="text-[11px] font-medium text-blue-600 hover:text-blue-700 hover:underline">Todos</button>
                            <span className="text-slate-300">|</span>
                            <button type="button" onClick={() => clearAllFromCategory(cat.permissions)} className="text-[11px] font-medium text-slate-500 hover:text-red-600 hover:underline">Nenhum</button>
                          </div>
                        </div>

                        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {cat.permissions.map(permKey => {
                            const pDetails = getPermissionDetails(permKey);
                            const isSelected = selectedPerms.has(permKey);

                            return (
                              <div
                                key={permKey}
                                className={`
                                          flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all
                                          ${isSelected ? "bg-blue-50/50 border-blue-200" : "bg-white border-transparent hover:border-slate-200 hover:bg-slate-50"}
                                        `}
                                onClick={() => togglePerm(permKey)}
                              >
                                <Checkbox checked={isSelected} className="mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <div className={`text-sm font-medium ${isSelected ? "text-blue-900" : "text-slate-700"}`}>
                                    {pDetails?.description || permKey}
                                  </div>
                                  <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                                    {permKey}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-white">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={() => void submitUpsertRole()} disabled={createSubmitting} className="min-w-[140px] bg-[#0A5BC4] hover:bg-[#094FA8]">
              {createSubmitting ? "Salvando..." : upsertMode === "create" ? "Criar Role" : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dupOpen} onOpenChange={setDupOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Duplicar Role</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Novo Slug</Label>
              <Input value={dupName} onChange={e => setDupName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Novo Nome de Exibição</Label>
              <Input value={dupDisplayName} onChange={e => setDupDisplayName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDupOpen(false)}>Cancelar</Button>
            <Button onClick={() => void submitDuplicate()} disabled={dupSubmitting}>Confirmar Cópia</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={delOpen} onOpenChange={setDelOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-center">Excluir Role?</DialogTitle>
            <DialogDescription className="text-center">Ação irreversível para <span className="font-medium text-slate-900">{delTarget?.displayName}</span>.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-2">
            <Button variant="secondary" onClick={() => setDelOpen(false)}>Cancelar</Button>
            <Button variant="danger" onClick={() => void submitDelete()} disabled={delSubmitting}>Excluir Definitivamente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}