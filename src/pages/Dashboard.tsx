import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  Mail,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFinanceEntries } from "@/hooks/useFinance";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/api";
import type { FinanceEntry } from "@/pages/financeiro/types";
import type { MessageListItem } from "@/types/communication";

// --- Helpers ---
function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100
  );
}

function getMonthLabel(monthsAgo: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
}

// --- StatCard ---
type StatCardProps = {
  title: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  icon: React.ReactNode;
  loading?: boolean;
};

function StatCard({ title, value, delta, deltaPositive, icon, loading }: StatCardProps) {
  return (
    <Card className="rounded-3xl border-slate-200 shadow-sm hover:shadow-md transition relative overflow-hidden">
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium text-slate-500">{title}</div>
          <div className="h-8 w-8 rounded-full bg-slate-100 grid place-items-center text-slate-600 shrink-0">
            {icon}
          </div>
        </div>
        {loading ? (
          <Skeleton className="h-8 w-32" />
        ) : (
          <div className="text-3xl font-bold text-slate-900 tracking-tight leading-tight">
            {value}
          </div>
        )}
        {delta && !loading && (
          <div className="mt-2 flex items-center gap-1 text-sm">
            {deltaPositive ? (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-rose-500 shrink-0" />
            )}
            <span className={deltaPositive ? "text-emerald-600" : "text-rose-600"}>
              {delta}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

// --- BarChart simples ---
type BarChartProps = {
  months: { label: string; income: number; expense: number }[];
  loading: boolean;
};

function MonthlyChart({ months, loading }: BarChartProps) {
  const max = Math.max(...months.map((m) => Math.max(m.income, m.expense)), 1);

  return (
    <Card className="rounded-2xl border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="text-lg font-semibold text-slate-900">Fluxo Financeiro</div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
            Receitas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400 inline-block" />
            Despesas
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-end gap-3 h-36">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="flex-1 rounded-xl" style={{ height: `${40 + i * 10}%` }} />
          ))}
        </div>
      ) : (
        <div className="flex items-end gap-2 h-36">
          {months.map((m) => (
            <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end gap-0.5 h-28">
                <div
                  className="flex-1 rounded-t-lg bg-emerald-500/80 transition-all"
                  style={{ height: `${(m.income / max) * 100}%`, minHeight: m.income > 0 ? 4 : 0 }}
                  title={formatCurrency(m.income)}
                />
                <div
                  className="flex-1 rounded-t-lg bg-rose-400/80 transition-all"
                  style={{ height: `${(m.expense / max) * 100}%`, minHeight: m.expense > 0 ? 4 : 0 }}
                  title={formatCurrency(m.expense)}
                />
              </div>
              <span className="text-[10px] text-slate-400 capitalize">{m.label}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// --- Distribuição por categoria ---
type CategoryChartProps = {
  categories: { name: string; totalCents: number; color: string }[];
  loading: boolean;
};

const COLORS = [
  "#0A5BC4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316",
];

function CategoryChart({ categories, loading }: CategoryChartProps) {
  const total = categories.reduce((s, c) => s + c.totalCents, 0);

  return (
    <Card className="rounded-2xl border-slate-200 p-6 shadow-sm">
      <div className="text-lg font-semibold text-slate-900 mb-6">Despesas por Categoria</div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 flex-1" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="flex items-center justify-center h-24 text-sm text-slate-400">
          Nenhum lançamento registrado
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => {
            const pct = total > 0 ? Math.round((cat.totalCents / total) * 100) : 0;
            return (
              <div key={cat.name}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-sm text-slate-700 truncate">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-xs text-slate-400">{pct}%</span>
                    <span className="text-xs font-medium text-slate-700">
                      {formatCurrency(cat.totalCents)}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: cat.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// --- Página principal ---
export default function Dashboard() {
  const { isSuperAdmin, enabledModules } = useAuth();
  const hasFinance = isSuperAdmin || enabledModules.includes("finance");
  const hasCommunication = isSuperAdmin || enabledModules.includes("communication");

  const { data: workspaces, isLoading: loadingWorkspaces } = useWorkspaces();
  const { data: entriesData, isLoading: loadingEntries } = useFinanceEntries(undefined, {
    limit: 1000,
    enabled: hasFinance,
  });
  const { data: inbox, isLoading: loadingInbox } = useQuery<MessageListItem[]>({
    queryKey: ["communication", "inbox"],
    queryFn: () => apiRequest("/api/v1/communication/inbox"),
    staleTime: 30_000,
    enabled: hasCommunication,
  });

  const entries: FinanceEntry[] = (entriesData as FinanceEntry[]) || [];

  // Totais do mês atual e mês anterior para comparativo
  const { currentIncome, currentExpense, prevIncome, prevExpense } = useMemo(() => {
    const now = new Date();
    const curY = now.getFullYear(), curM = now.getMonth();
    const prevDate = new Date(now); prevDate.setMonth(curM - 1);
    const prevY = prevDate.getFullYear(), prevM = prevDate.getMonth();

    let cInc = 0, cExp = 0, pInc = 0, pExp = 0;
    entries.forEach((e) => {
      const d = new Date(e.occurredAt);
      const y = d.getFullYear(), m = d.getMonth();
      if (y === curY && m === curM) {
        if (e.type === "INCOME") cInc += e.amountCents;
        if (e.type === "EXPENSE") cExp += e.amountCents;
      } else if (y === prevY && m === prevM) {
        if (e.type === "INCOME") pInc += e.amountCents;
        if (e.type === "EXPENSE") pExp += e.amountCents;
      }
    });
    return { currentIncome: cInc, currentExpense: cExp, prevIncome: pInc, prevExpense: pExp };
  }, [entries]);

  function monthDelta(current: number, prev: number): { label: string; positive: boolean } | undefined {
    if (prev === 0) return undefined;
    const pct = Math.round(((current - prev) / prev) * 100);
    if (pct === 0) return undefined;
    return { label: `${pct > 0 ? "+" : ""}${pct}% vs mês anterior`, positive: pct > 0 };
  }

  const incomeDelta = hasFinance ? monthDelta(currentIncome, prevIncome) : undefined;
  const expenseDelta = hasFinance ? monthDelta(currentExpense, prevExpense) : undefined;

  // Fluxo dos últimos 6 meses
  const monthlyData = useMemo(() => {
    return Array.from({ length: 6 }, (_, idx) => {
      const monthsAgo = 5 - idx;
      const target = new Date();
      target.setMonth(target.getMonth() - monthsAgo);
      const y = target.getFullYear();
      const m = target.getMonth();

      const filtered = entries.filter((e) => {
        const d = new Date(e.occurredAt);
        return d.getFullYear() === y && d.getMonth() === m;
      });

      return {
        label: getMonthLabel(monthsAgo),
        income: filtered.filter((e) => e.type === "INCOME").reduce((s, e) => s + e.amountCents, 0),
        expense: filtered.filter((e) => e.type === "EXPENSE").reduce((s, e) => s + e.amountCents, 0),
      };
    });
  }, [entries]);

  // Despesas por categoria (top 5)
  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    entries
      .filter((e) => e.type === "EXPENSE")
      .forEach((e) => {
        const name = e.categoryName || "Sem categoria";
        map.set(name, (map.get(name) ?? 0) + e.amountCents);
      });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, totalCents], i) => ({ name, totalCents, color: COLORS[i % COLORS.length] }));
  }, [entries]);

  const unreadCount = (inbox ?? []).filter((m) => !m.isRead).length;
  const workspaceCount = workspaces?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="text-3xl font-semibold text-slate-900">Painel de Controle</div>
        <div className="mt-1 text-slate-500">Visão geral da administração municipal.</div>
      </div>

      {/* Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {hasFinance && (
          <StatCard
            title="Receitas (Mês Atual)"
            value={formatCurrency(currentIncome)}
            delta={incomeDelta?.label}
            deltaPositive={incomeDelta?.positive}
            icon={<ArrowUpRight className="h-5 w-5 text-emerald-600" />}
            loading={loadingEntries}
          />
        )}
        {hasFinance && (
          <StatCard
            title="Despesas (Mês Atual)"
            value={formatCurrency(currentExpense)}
            delta={expenseDelta?.label}
            deltaPositive={expenseDelta ? !expenseDelta.positive : undefined}
            icon={<ArrowDownRight className="h-5 w-5 text-rose-500" />}
            loading={loadingEntries}
          />
        )}
        <StatCard
          title="Workspaces Ativos"
          value={String(workspaceCount)}
          icon={<Briefcase className="h-5 w-5 text-[#0A5BC4]" />}
          loading={loadingWorkspaces}
        />
        {hasCommunication && (
          <StatCard
            title="Mensagens não lidas"
            value={String(unreadCount)}
            deltaPositive={unreadCount === 0}
            delta={unreadCount === 0 ? "Em dia" : `${unreadCount} pendente${unreadCount > 1 ? "s" : ""}`}
            icon={<Mail className="h-5 w-5 text-amber-500" />}
            loading={loadingInbox}
          />
        )}
      </div>

      {/* Gráficos — só se finance habilitado */}
      {hasFinance && (
        <div className="grid gap-4 lg:grid-cols-2">
          <MonthlyChart months={monthlyData} loading={loadingEntries} />
          <CategoryChart categories={categoryData} loading={loadingEntries} />
        </div>
      )}
    </div>
  );
}
