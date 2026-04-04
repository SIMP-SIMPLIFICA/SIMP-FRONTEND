import { Building2, Users, Briefcase, CalendarDays, CheckCircle, XCircle, Hash, FileText } from "lucide-react";
import { useMe } from "@/hooks/useMe";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

const PLAN_LABELS: Record<string, string> = {
  basic: "Básico",
  pro: "Pro",
  enterprise: "Enterprise",
};

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 flex items-center gap-4">
      <div className="rounded-xl bg-blue-50 p-3 shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500 font-medium">{label}</span>
      <span className="text-sm text-slate-800 font-semibold text-right">{value}</span>
    </div>
  );
}

export default function OrganizacaoPage() {
  const { data: meData, isLoading } = useMe();
  const org = meData?.user?.organization;

  const { data: workspaces } = useWorkspaces();

  const { data: usersData } = useQuery<{ data: unknown[] }>({
    queryKey: ["users", "list"],
    queryFn: () => apiRequest("/api/v1/users"),
    enabled: !!org,
    staleTime: 1000 * 60 * 5,
  });

  const userCount = usersData?.data?.length ?? "—";
  const workspaceCount = workspaces?.length ?? "—";

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 bg-slate-100 rounded w-1/3" />
        <div className="h-32 bg-slate-100 rounded-2xl" />
        <div className="h-48 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Nenhuma organização associada a esta conta.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-800">Minha Organização</h1>
        </div>
        <p className="text-sm text-slate-500">Informações da sua organização no SIMP.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Users className="h-5 w-5 text-blue-600" />}
          label="Usuários"
          value={userCount}
        />
        <StatCard
          icon={<Briefcase className="h-5 w-5 text-blue-600" />}
          label="Workspaces"
          value={workspaceCount}
        />
      </div>

      {/* Org details */}
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Dados da Organização</h2>

        <InfoRow label="Nome" value={org.name} />
        <InfoRow label="Slug" value={
          <span className="font-mono text-blue-600">{org.slug}</span>
        } />
        <InfoRow label="CNPJ" value={org.cnpj ?? <span className="text-slate-400 font-normal">Não informado</span>} />
        <InfoRow label="Plano" value={
          <span className="rounded-full bg-blue-50 text-blue-600 text-xs font-bold px-2 py-0.5 uppercase tracking-wide">
            {PLAN_LABELS[org.plan] ?? org.plan}
          </span>
        } />
        <InfoRow label="Status" value={
          org.isActive
            ? <span className="flex items-center gap-1 text-green-600"><CheckCircle className="h-4 w-4" /> Ativa</span>
            : <span className="flex items-center gap-1 text-slate-400"><XCircle className="h-4 w-4" /> Inativa</span>
        } />
        <InfoRow label="Membro desde" value={
          <span className="flex items-center gap-1">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            {new Date(org.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
          </span>
        } />
        <InfoRow label="ID da Organização" value={
          <span className="flex items-center gap-1 font-mono text-xs text-slate-400">
            <Hash className="h-3.5 w-3.5" />{org.id}
          </span>
        } />
      </div>

      {/* Info footer */}
      <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 flex items-start gap-3">
        <FileText className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
        <p className="text-xs text-slate-500">
          Para alterar dados da organização como nome, CNPJ ou plano, entre em contato com o suporte SIMP.
        </p>
      </div>
    </div>
  );
}
