import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Users, Briefcase, ShieldCheck, Play, Loader2, CheckCircle, XCircle } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { setAuthTokens } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";

type Org = {
  id: string;
  name: string;
  slug: string;
  cnpj: string | null;
  plan: string;
  isActive: boolean;
  createdAt: string;
  _count: { users: number; workspaces: number };
};

function useOrganizations() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<Org[]>("/api/v1/admin/organizations");
      setOrgs(data);
      setLoaded(true);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Erro ao carregar organizações");
    } finally {
      setLoading(false);
    }
  }

  return { orgs, loading, loaded, error, load };
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { orgs, loading, loaded, error, load } = useOrganizations();
  const [impersonating, setImpersonating] = useState<string | null>(null);

  async function handleImpersonate(org: Org) {
    setImpersonating(org.id);
    try {
      const res = await apiRequest<{ accessToken: string }>(`/api/v1/admin/organizations/${org.id}/impersonate`, {
        method: "POST",
      });
      setAuthTokens(res.accessToken);
      queryClient.clear();
      navigate("/");
    } catch (err: unknown) {
      alert((err as { message?: string })?.message ?? "Erro ao impersonar organização");
    } finally {
      setImpersonating(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-6 w-6 text-yellow-500" />
            <h1 className="text-2xl font-bold text-slate-800">Painel Super Admin</h1>
          </div>
          <p className="text-sm text-slate-500">Gerencie todas as organizações do sistema.</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {loaded ? "Recarregar" : "Carregar Organizações"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loaded && !loading && !error && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Clique em "Carregar Organizações" para ver os clientes cadastrados.</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl bg-white border border-slate-100 p-5 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-1/3 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-1/4" />
            </div>
          ))}
        </div>
      )}

      {/* Org list */}
      {loaded && !loading && (
        <div className="space-y-3">
          {orgs.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">Nenhuma organização encontrada.</p>
          )}
          {orgs.map((org) => (
            <div
              key={org.id}
              className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 flex items-center gap-5"
            >
              {/* Status indicator */}
              <div className="shrink-0">
                {org.isActive ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-slate-300" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-800">{org.name}</span>
                  <span className="text-xs text-slate-400 font-mono">{org.slug}</span>
                  <span className="rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide">
                    {org.plan}
                  </span>
                  {!org.isActive && (
                    <span className="rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide">
                      Inativa
                    </span>
                  )}
                </div>
                {org.cnpj && (
                  <p className="text-xs text-slate-400 mt-0.5">CNPJ: {org.cnpj}</p>
                )}
                <div className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Users className="h-3.5 w-3.5" />
                    {org._count.users} usuário{org._count.users !== 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Briefcase className="h-3.5 w-3.5" />
                    {org._count.workspaces} workspace{org._count.workspaces !== 1 ? "s" : ""}
                  </span>
                  <span className="text-xs text-slate-400">
                    Desde {new Date(org.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>

              {/* Impersonate */}
              <button
                onClick={() => handleImpersonate(org)}
                disabled={!org.isActive || impersonating === org.id}
                title={!org.isActive ? "Organização inativa" : `Entrar como admin de ${org.name}`}
                className="shrink-0 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {impersonating === org.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Entrar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
