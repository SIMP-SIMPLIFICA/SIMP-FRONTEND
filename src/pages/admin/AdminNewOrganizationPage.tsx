import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Building2, Loader2, ShieldCheck } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_MODULES = [
  { key: "tasks",             label: "Tarefas" },
  { key: "finance",           label: "Financeiro" },
  { key: "communication",     label: "Comunicação" },
  { key: "calendar",          label: "Calendário" },
  { key: "notes",             label: "Notas" },
  { key: "departments",       label: "Departamentos" },
  { key: "virtual_processes", label: "Processos Virtuais" },
];

const DEFAULT_ENABLED = ["tasks", "finance", "communication", "calendar", "notes", "departments"];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FormState = {
  orgName:        string;
  orgSlug:        string;
  orgCnpj:        string;
  plan:           string;
  adminEmail:     string;
  adminFirstName: string;
  adminLastName:  string;
  enabledModules: string[];
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminNewOrganizationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>({
    orgName:        "",
    orgSlug:        "",
    orgCnpj:        "",
    plan:           "basic",
    adminEmail:     "",
    adminFirstName: "",
    adminLastName:  "",
    enabledModules: DEFAULT_ENABLED,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof FormState, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Auto-gera slug a partir do nome (apenas se slug ainda não foi editado manualmente)
      if (field === "orgName") {
        const autoSlug = value
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
        next.orgSlug = autoSlug;
      }
      return next;
    });
  }

  function toggleModule(key: string) {
    setForm((prev) => ({
      ...prev,
      enabledModules: prev.enabledModules.includes(key)
        ? prev.enabledModules.filter((m) => m !== key)
        : [...prev.enabledModules, key],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        orgName:        form.orgName.trim(),
        orgSlug:        form.orgSlug.trim(),
        orgCnpj:        form.orgCnpj.trim() || undefined,
        plan:           form.plan,
        enabledModules: form.enabledModules,
        adminEmail:     form.adminEmail.trim(),
        adminFirstName: form.adminFirstName.trim(),
        adminLastName:  form.adminLastName.trim(),
      };

      const res = await apiRequest<{
        message: string;
        org: { id: string; name: string };
        admin: { email: string };
      }>("/api/v1/admin/organizations", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      queryClient.invalidateQueries({ queryKey: ["admin", "organizations"] });

      toast({
        title: `Organização "${res.org.name}" criada com sucesso.`,
        description: `Credenciais de acesso enviadas para ${res.admin.email}.`,
      });

      navigate("/admin");
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Erro ao criar organização.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate("/admin")}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-yellow-500" />
          <h1 className="text-xl font-bold text-slate-800">Nova Organização</h1>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Cria a organização e o primeiro usuário administrador.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados da Organização */}
        <section className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Dados da Organização
            </h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={form.orgName}
              onChange={(e) => set("orgName", e.target.value)}
              placeholder="Prefeitura de Osasco"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Slug <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.orgSlug}
                onChange={(e) => set("orgSlug", e.target.value)}
                placeholder="osasco"
                pattern="^[a-z0-9-]+"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">Apenas letras minúsculas, números e hífens</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">CNPJ</label>
              <input
                value={form.orgCnpj}
                onChange={(e) => set("orgCnpj", e.target.value)}
                placeholder="00.000.000/0001-00"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Plano</label>
            <select
              value={form.plan}
              onChange={(e) => set("plan", e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
        </section>

        {/* Primeiro Admin */}
        <section className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2">
            Primeiro Administrador
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.adminFirstName}
                onChange={(e) => set("adminFirstName", e.target.value)}
                placeholder="Roberto"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Sobrenome <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.adminLastName}
                onChange={(e) => set("adminLastName", e.target.value)}
                placeholder="Silva"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              E-mail <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="email"
              value={form.adminEmail}
              onChange={(e) => set("adminEmail", e.target.value)}
              placeholder="admin@prefeitura.gov.br"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Uma senha temporária será gerada e enviada para este e-mail.
            </p>
          </div>
        </section>

        {/* Módulos */}
        <section className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
            Módulos Habilitados
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {ALL_MODULES.map((m) => {
              const enabled = form.enabledModules.includes(m.key);
              return (
                <label
                  key={m.key}
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 cursor-pointer transition ${
                    enabled
                      ? "border-green-200 bg-green-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => toggleModule(m.key)}
                    className="accent-green-600"
                  />
                  <span className={`text-sm font-medium ${enabled ? "text-green-800" : "text-slate-600"}`}>
                    {m.label}
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Criar Organização
          </button>
        </div>
      </form>
    </div>
  );
}
