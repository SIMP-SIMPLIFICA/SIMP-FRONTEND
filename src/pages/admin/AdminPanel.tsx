import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Building2, Users, Plus, Play,
  CheckCircle, XCircle, ShieldCheck, Ban, RotateCcw,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { getAccessToken, setAuthTokens, clearImpersonateRefreshToken } from "@/lib/auth";
import { MODULE_LABELS } from "@/lib/moduleLabels";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/hooks/use-toast";

// Key used to preserve the super-admin access token across an impersonation round-trip.
// The refreshToken is NOT saved here — the super-admin's httpOnly cookie is never
// replaced during impersonation (the backend impersonate endpoint doesn't set a cookie),
// so it remains valid and is automatically used after exit.
const PREV_ACCESS_KEY  = "simp:impersonate:prev:access"
const IMPERSONATE_ORG_KEY = "simp:impersonate:org"

export function isImpersonating(): boolean {
  return !!sessionStorage.getItem(PREV_ACCESS_KEY)
}

export function exitImpersonation(queryClient: ReturnType<typeof import("@tanstack/react-query").useQueryClient>, navigate: ReturnType<typeof import("react-router-dom").useNavigate>) {
  const prevAccess = sessionStorage.getItem(PREV_ACCESS_KEY)
  if (!prevAccess) return

  setAuthTokens(prevAccess)         // restore super-admin access token in memory
  clearImpersonateRefreshToken()    // clear the impersonated session's refresh token
  sessionStorage.removeItem(PREV_ACCESS_KEY)
  sessionStorage.removeItem(IMPERSONATE_ORG_KEY)
  queryClient.clear()
  navigate("/admin")
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OrgModule = { module: string; isEnabled: boolean };

type Org = {
  id: string;
  name: string;
  slug: string;
  cnpj: string | null;
  plan: string;
  isActive: boolean;
  createdAt: string;
  _count: { users: number };
  modules: OrgModule[];
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminPanel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery<{ data: Org[] }>({
    queryKey: ["admin", "organizations"],
    queryFn: () => apiRequest("/api/v1/admin/organizations"),
  });

  const orgs = data?.data ?? [];

  // Suspensão (kill switch) — reaproveita PATCH /admin/organizations/:id, que já
  // aceita isActive e já é restrito ao Super Admin.
  const [suspendTarget, setSuspendTarget] = useState<Org | null>(null);

  const toggleActive = useMutation({
    mutationFn: ({ org, isActive }: { org: Org; isActive: boolean }) =>
      apiRequest(`/api/v1/admin/organizations/${org.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: (_res, { org, isActive }) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "organizations"] });
      toast({
        title: isActive ? "Organização reativada" : "Organização suspensa",
        description: isActive
          ? `${org.name} voltou a ter acesso ao sistema.`
          : `${org.name} perdeu o acesso ao sistema imediatamente.`,
      });
    },
    onError: (err: unknown) => {
      const msg = (err as { message?: string })?.message ?? "Tente novamente.";
      toast({ title: "Não foi possível alterar o status", description: msg, variant: "destructive" });
    },
  });

  async function handleImpersonate(org: Org) {
    try {
      const res = await apiRequest<{ accessToken: string; refreshToken: string }>(
        `/api/v1/admin/organizations/${org.id}/impersonate`,
        { method: "POST" }
      );

      // Save super-admin access token so exitImpersonation can restore it.
      // The super-admin's refreshToken stays in the httpOnly cookie — it is never
      // touched by the impersonate endpoint, so it will still be valid on exit.
      sessionStorage.setItem(PREV_ACCESS_KEY, getAccessToken() ?? "")
      sessionStorage.setItem(IMPERSONATE_ORG_KEY, JSON.stringify({ id: org.id, name: org.name }))

      // Store impersonated access token in memory and impersonated refresh token
      // in _impersonateRefreshToken (also memory). api.ts will use the refresh token
      // via credentials:'omit' + body during any token refresh within this session,
      // leaving the super-admin's httpOnly cookie untouched.
      setAuthTokens(res.accessToken, res.refreshToken)
      queryClient.clear()
      navigate("/")
    } catch (err: unknown) {
      alert((err as { message?: string })?.message ?? "Erro ao impersonar organização")
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <ConfirmDialog
        open={suspendTarget !== null}
        title={`Suspender ${suspendTarget?.name ?? ""}?`}
        description={`Todos os ${suspendTarget?._count.users ?? 0} usuário(s) desta organização perderão o acesso ao sistema imediatamente, mesmo os que estiverem logados neste momento. Você pode reativar a qualquer momento.`}
        confirmLabel="Suspender acesso"
        onConfirm={() => {
          const org = suspendTarget;
          setSuspendTarget(null);
          if (org) toggleActive.mutate({ org, isActive: false });
        }}
        onCancel={() => setSuspendTarget(null)}
      />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-6 w-6 text-yellow-500" />
            <h1 className="text-2xl font-bold text-slate-800">Painel Super Admin</h1>
          </div>
          <p className="text-sm text-slate-500">
            {orgs.length > 0
              ? `${orgs.length} organização${orgs.length !== 1 ? "s" : ""} cadastrada${orgs.length !== 1 ? "s" : ""}`
              : "Gerencie todas as organizações do sistema."}
          </p>
        </div>
        <button
          onClick={() => navigate("/admin/organizations/new")}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" />
          Nova Organização
        </button>
      </div>

      {/* Error */}
      {isError && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          Erro ao carregar organizações.
          <button onClick={() => refetch()} className="underline text-red-600 hover:text-red-800">
            Tentar novamente
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl bg-white border border-slate-100 p-5 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-1/3 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-1/4" />
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && orgs.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500 mb-4">Nenhuma organização cadastrada.</p>
          <button
            onClick={() => navigate("/admin/organizations/new")}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
          >
            <Plus className="h-4 w-4" />
            Criar primeira organização
          </button>
        </div>
      )}

      {/* Org list */}
      {!isLoading && orgs.length > 0 && (
        <div className="space-y-3">
          {orgs.map((org) => (
            <div
              key={org.id}
              onClick={() => navigate(`/admin/organizations/${org.id}`)}
              className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 flex items-start gap-4 cursor-pointer hover:border-blue-200 hover:shadow-md transition group"
            >
              {/* Status */}
              <div className="shrink-0 mt-0.5">
                {org.isActive
                  ? <CheckCircle className="h-5 w-5 text-green-500" />
                  : <XCircle className="h-5 w-5 text-red-500" />}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-slate-800 group-hover:text-blue-700 transition">
                    {org.name}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{org.slug}</span>
                  <span className="rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide">
                    {org.plan}
                  </span>
                  {org.isActive ? (
                    <span className="rounded-full bg-green-50 text-green-700 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide">
                      Ativa
                    </span>
                  ) : (
                    <span className="rounded-full bg-red-50 text-red-700 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide">
                      Suspensa
                    </span>
                  )}
                </div>

                {org.cnpj && (
                  <p className="text-xs text-slate-400 mb-2">CNPJ: {org.cnpj}</p>
                )}

                {/* Modules badges */}
                {org.modules.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {org.modules.map((m) => (
                      <span
                        key={m.module}
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          m.isEnabled
                            ? "bg-green-50 text-green-700"
                            : "bg-slate-100 text-slate-400 line-through"
                        }`}
                      >
                        {MODULE_LABELS[m.module] ?? m.module}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Users className="h-3.5 w-3.5" />
                    {org._count.users} usuário{org._count.users !== 1 ? "s" : ""}
                  </span>
                  <span className="text-xs text-slate-400">
                    Desde {new Date(org.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>

              {/* Ações */}
              <div className="shrink-0 flex items-center gap-2">
                {/* Suspender exige confirmação (derruba todos os usuários);
                    reativar é a ação não destrutiva, aplicada direto. */}
                {org.isActive ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); setSuspendTarget(org); }}
                    disabled={toggleActive.isPending}
                    title={`Suspender o acesso de ${org.name}`}
                    className="flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:border-red-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <Ban className="h-4 w-4" />
                    Suspender
                  </button>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleActive.mutate({ org, isActive: true }); }}
                    disabled={toggleActive.isPending}
                    title={`Reativar o acesso de ${org.name}`}
                    className="flex items-center gap-2 rounded-xl border border-green-200 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-50 hover:border-green-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reativar
                  </button>
                )}

                <button
                  onClick={(e) => { e.stopPropagation(); handleImpersonate(org); }}
                  disabled={!org.isActive}
                  title={!org.isActive ? "Organização suspensa" : `Entrar como admin de ${org.name}`}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <Play className="h-4 w-4" />
                  Entrar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
