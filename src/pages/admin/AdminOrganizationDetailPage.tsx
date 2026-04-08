import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Building2, Users, ShieldCheck,
  CheckCircle, XCircle, Loader2, Save, Pencil, X,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OrgModule = {
  module: string;
  isEnabled: boolean;
  notes: string | null;
  updatedAt: string;
};

type OrgUser = {
  id: string;
  firstName: string;
  lastName?: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  roles: Array<{ role?: { displayName: string } }>;
};

type OrgDetail = {
  id: string;
  name: string;
  slug: string;
  cnpj: string | null;
  plan: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { users: number; workspaces: number };
  modules: OrgModule[];
  users: OrgUser[];
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MODULE_LABELS: Record<string, string> = {
  tasks:             "Tarefas",
  finance:           "Financeiro",
  communication:     "Comunicação",
  virtual_processes: "Processos Virtuais",
  calendar:          "Calendário",
  notes:             "Notas",
  departments:       "Departamentos",
};

// ---------------------------------------------------------------------------
// Sub-component: Module toggle row
// ---------------------------------------------------------------------------

function ModuleRow({
  mod,
  orgId,
  onToggled,
}: {
  mod: OrgModule;
  orgId: string;
  onToggled: () => void;
}) {
  const [notesInput, setNotesInput] = useState(mod.notes ?? "");
  const [showNotes, setShowNotes] = useState(false);

  const mutation = useMutation({
    mutationFn: ({ isEnabled, notes }: { isEnabled: boolean; notes?: string }) =>
      apiRequest(`/api/v1/admin/organizations/${orgId}/modules/${mod.module}`, {
        method: "PATCH",
        body: JSON.stringify({ isEnabled, notes }),
      }),
    onSuccess: (_data, vars) => {
      const action = vars.isEnabled ? "habilitado" : "desabilitado";
      toast({ title: `Módulo ${action}`, description: MODULE_LABELS[mod.module] ?? mod.module });
      setShowNotes(false);
      onToggled();
    },
    onError: (err: unknown) => {
      toast({
        title: "Erro",
        description: (err as { message?: string })?.message ?? "Falha ao atualizar módulo.",
        variant: "destructive",
      });
    },
  });

  function handleToggle() {
    const newEnabled = !mod.isEnabled;
    // Se vai desabilitar, abre campo de nota antes de confirmar
    if (!newEnabled) {
      setShowNotes(true);
      return;
    }
    mutation.mutate({ isEnabled: true, notes: notesInput || undefined });
  }

  function handleConfirmDisable() {
    mutation.mutate({ isEnabled: false, notes: notesInput || undefined });
  }

  return (
    <div className={`rounded-xl border p-3 transition ${mod.isEnabled ? "border-green-200 bg-green-50" : "border-slate-200 bg-white"}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {mod.isEnabled
            ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
            : <XCircle className="h-4 w-4 text-slate-300 shrink-0" />}
          <span className={`text-sm font-medium ${mod.isEnabled ? "text-green-800" : "text-slate-500"}`}>
            {MODULE_LABELS[mod.module] ?? mod.module}
          </span>
          {mod.notes && !mod.isEnabled && (
            <span className="text-[10px] text-slate-400 italic truncate max-w-[180px]" title={mod.notes}>
              {mod.notes}
            </span>
          )}
        </div>

        <button
          onClick={handleToggle}
          disabled={mutation.isPending}
          className={`shrink-0 rounded-lg px-3 py-1 text-xs font-semibold transition ${
            mod.isEnabled
              ? "bg-white border border-red-200 text-red-600 hover:bg-red-50"
              : "bg-white border border-green-200 text-green-700 hover:bg-green-50"
          } disabled:opacity-50`}
        >
          {mutation.isPending
            ? <Loader2 className="h-3 w-3 animate-spin" />
            : mod.isEnabled ? "Desabilitar" : "Habilitar"}
        </button>
      </div>

      {/* Nota ao desabilitar */}
      {showNotes && (
        <div className="mt-3 space-y-2">
          <input
            autoFocus
            value={notesInput}
            onChange={(e) => setNotesInput(e.target.value)}
            placeholder="Motivo (ex: Bug #42 — aguardando fix)"
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-300"
          />
          <div className="flex gap-2">
            <button
              onClick={handleConfirmDisable}
              disabled={mutation.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition"
            >
              {mutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              Confirmar desabilitação
            </button>
            <button
              onClick={() => setShowNotes(false)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AdminOrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch org detail
  const { data, isLoading, isError } = useQuery<{ data: OrgDetail }>({
    queryKey: ["admin", "organizations", id],
    queryFn: () => apiRequest(`/api/v1/admin/organizations/${id}`),
    enabled: !!id,
  });

  const org = data?.data;

  // Edit org state
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", plan: "", isActive: true });

  function startEdit() {
    if (!org) return;
    setEditForm({ name: org.name, plan: org.plan, isActive: org.isActive });
    setEditing(true);
  }

  const updateOrgMutation = useMutation({
    mutationFn: (body: { name?: string; plan?: string; isActive?: boolean }) =>
      apiRequest(`/api/v1/admin/organizations/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast({ title: "Organização atualizada." });
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "organizations", id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "organizations"] });
    },
    onError: (err: unknown) => {
      toast({
        title: "Erro",
        description: (err as { message?: string })?.message ?? "Falha ao salvar.",
        variant: "destructive",
      });
    },
  });

  function handleSaveOrg() {
    if (!org) return;
    const body: { name?: string; plan?: string; isActive?: boolean } = {};
    if (editForm.name !== org.name)         body.name     = editForm.name;
    if (editForm.plan !== org.plan)         body.plan     = editForm.plan;
    if (editForm.isActive !== org.isActive) body.isActive = editForm.isActive;
    if (Object.keys(body).length === 0) { setEditing(false); return; }
    updateOrgMutation.mutate(body);
  }

  function invalidateModules() {
    queryClient.invalidateQueries({ queryKey: ["admin", "organizations", id] });
    queryClient.invalidateQueries({ queryKey: ["admin", "organizations"] });
  }

  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (isError || !org) {
    return (
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate("/admin")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4 transition">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-8 text-center text-sm text-red-600">
          Organização não encontrada.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Back */}
      <button
        onClick={() => navigate("/admin")}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-800">{org.name}</h1>
            <span className="text-sm text-slate-400 font-mono">{org.slug}</span>
            <span className="rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide">
              {org.plan}
            </span>
            {org.isActive
              ? <span className="flex items-center gap-1 text-xs text-green-600 font-semibold"><CheckCircle className="h-3.5 w-3.5" /> Ativa</span>
              : <span className="flex items-center gap-1 text-xs text-slate-400 font-semibold"><XCircle className="h-3.5 w-3.5" /> Inativa</span>}
          </div>
          <div className="flex gap-4 mt-1 text-xs text-slate-400">
            {org.cnpj && <span>CNPJ: {org.cnpj}</span>}
            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {org._count.users} usuários</span>
            <span>Criada em {new Date(org.createdAt).toLocaleDateString("pt-BR")}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-yellow-400" />
        </div>
      </div>

      {/* ── Módulos ── */}
      <section className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
          Módulos
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {org.modules.map((mod) => (
            <ModuleRow
              key={mod.module}
              mod={mod}
              orgId={org.id}
              onToggled={invalidateModules}
            />
          ))}
        </div>
      </section>

      {/* ── Dados da organização ── */}
      <section className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Dados da Organização
            </h2>
          </div>
          {!editing ? (
            <button
              onClick={startEdit}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-50 transition"
            >
              <Pencil className="h-3 w-3" /> Editar
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSaveOrg}
                disabled={updateOrgMutation.isPending}
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-3 py-1.5 transition disabled:opacity-60"
              >
                {updateOrgMutation.isPending
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <Save className="h-3 w-3" />}
                Salvar
              </button>
              <button
                onClick={() => setEditing(false)}
                className="flex items-center gap-1 text-xs text-slate-500 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-50 transition"
              >
                <X className="h-3 w-3" /> Cancelar
              </button>
            </div>
          )}
        </div>

        {!editing ? (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-slate-400 text-xs">Nome</dt><dd className="font-medium text-slate-800">{org.name}</dd></div>
            <div><dt className="text-slate-400 text-xs">Plano</dt><dd className="font-medium text-slate-800 capitalize">{org.plan}</dd></div>
            <div><dt className="text-slate-400 text-xs">CNPJ</dt><dd className="font-medium text-slate-800">{org.cnpj ?? "—"}</dd></div>
            <div><dt className="text-slate-400 text-xs">Status</dt><dd className="font-medium text-slate-800">{org.isActive ? "Ativa" : "Inativa"}</dd></div>
          </dl>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nome</label>
              <input
                value={editForm.name}
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Plano</label>
              <select
                value={editForm.plan}
                onChange={(e) => setEditForm((p) => ({ ...p, plan: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm((p) => ({ ...p, isActive: e.target.checked }))}
                  className="accent-blue-600"
                />
                <span className="text-sm text-slate-700">Organização ativa</span>
              </label>
            </div>
          </div>
        )}
      </section>

      {/* ── Usuários ── */}
      <section className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Usuários ({org._count.users})
          </h2>
        </div>

        {org.users.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">Nenhum usuário cadastrado.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {org.users.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {u.firstName} {u.lastName ?? ""}
                  </p>
                  <p className="text-xs text-slate-400">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {u.roles.map((r, i) => (
                    <span key={i} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {r.role?.displayName ?? "—"}
                    </span>
                  ))}
                  {!u.isActive && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-500">
                      Inativo
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
