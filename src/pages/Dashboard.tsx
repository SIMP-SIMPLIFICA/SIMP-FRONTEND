import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Plus, ArrowUpRight, ArrowDownRight, Briefcase, Bell } from "lucide-react";
import { useMemo } from "react";
import { useFinanceEntries } from "@/hooks/useFinance";

function StatCard({
  title,
  value,
  delta,
  deltaPositive,
  icon,
}: {
  title: string;
  value: string;
  delta: string;
  deltaPositive?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <Card className="rounded-2xl border-slate-200 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold tracking-wide text-slate-500">{title}</div>
          <div className="mt-4 text-3xl font-semibold text-slate-800">{value}</div>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className={deltaPositive ? "text-emerald-600" : "text-rose-600"}>
              {delta}
            </span>
          </div>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-50 text-slate-700">
          {icon}
        </div>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { data: entriesData, isLoading } = useFinanceEntries(undefined, { limit: 1000 });
  const entries = entriesData || [];

  const { totalIncome, totalExpense } = useMemo(() => {
    let inc = 0, exp = 0;
    entries.forEach((e: any) => {
      if (e.type === "INCOME") inc += e.amountCents;
      if (e.type === "EXPENSE") exp += e.amountCents;
    });
    return { totalIncome: inc, totalExpense: exp };
  }, [entries]);

  function formatCurrency(cents: number) {
    if (isLoading) return "Calculando...";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-3xl font-semibold text-slate-900">Painel de Controle</div>
          <div className="mt-1 text-slate-500">
            Visão geral da administração municipal hoje.
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-[260px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input className="h-11 rounded-2xl pl-9" placeholder="Buscar" />
          </div>

          <Button className="h-11 rounded-2xl bg-[#0A5BC4] px-5 hover:bg-[#094FA8]">
            <Plus className="mr-2 h-4 w-4" />
            Novo Relatório
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="RECEITAS (TOTAL)"
          value={formatCurrency(totalIncome)}
          delta={isLoading ? "-" : "+12%"}
          deltaPositive
          icon={<ArrowUpRight className="h-5 w-5 text-emerald-600" />}
        />
        <StatCard
          title="DESPESAS (TOTAL)"
          value={formatCurrency(totalExpense)}
          delta={isLoading ? "-" : "-2%"}
          icon={<ArrowDownRight className="h-5 w-5 text-rose-600" />}
        />
        <StatCard
          title="OBRAS ATIVAS"
          value="24"
          delta="+3"
          deltaPositive
          icon={<Briefcase className="h-5 w-5 text-[#0A5BC4]" />}
        />
        <StatCard
          title="SOLICITAÇÕES (SAC)"
          value="142"
          delta="+5%"
          deltaPositive
          icon={<Bell className="h-5 w-5 text-amber-500" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold text-slate-900">Fluxo Financeiro (Mensal)</div>
            <div className="text-sm text-slate-500">Últimos 7 meses</div>
          </div>

          <div className="mt-10 grid grid-cols-7 items-end gap-4">
            {[40, 68, 30, 72, 55, 42, 65].map((h, i) => (
              <div key={i} className="h-40 rounded-2xl bg-slate-50 flex items-end">
                <div
                  className="w-full rounded-2xl bg-[#0A5BC4]/20"
                  style={{ height: `${h}%` }}
                />
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-2xl border-slate-200 p-6 shadow-sm">
          <div className="text-lg font-semibold text-slate-900">Distribuição de Verba</div>

          <div className="mt-8 flex flex-col items-center gap-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative grid h-48 w-48 place-items-center">
              <div className="h-44 w-44 rounded-full border-[14px] border-slate-100" />
              <div className="absolute h-44 w-44 rounded-full border-[14px] border-transparent border-t-[#0A5BC4] border-r-amber-500 border-b-emerald-400" />
              <div className="absolute grid h-24 w-24 place-items-center rounded-full bg-white shadow-sm">
                <div className="text-sm text-slate-500">Total</div>
                <div className="text-xl font-semibold text-slate-900">100%</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-[#0A5BC4]" />
                <span className="text-slate-700 font-medium">Educação</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-amber-500" />
                <span className="text-slate-700 font-medium">Saúde</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
                <span className="text-slate-700 font-medium">Infraestrutura</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
