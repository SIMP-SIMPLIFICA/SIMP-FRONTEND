import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ArrowDownRight, DollarSign, Clock, FileText, ChevronRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { mockEntries } from "./mock/entries";
import type { FinanceEntry } from "./types";

// --- HELPERS ---
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: '2-digit', month: 'short' });
}

// --- MAIN COMPONENT ---
export default function FinanceiroOverview() {

  // Computed Metrics
  const { totalIncome, totalExpense, balance, pendingCount } = useMemo(() => {
    let inc = 0, exp = 0, pend = 0;
    mockEntries.forEach(e => {
      if (e.type === "INCOME") inc += e.amountCents;
      if (e.type === "EXPENSE") exp += e.amountCents;
      if (e.attachmentsStatus === "pending") pend += 1;
    });
    return {
      totalIncome: inc,
      totalExpense: exp,
      balance: inc - exp,
      pendingCount: pend,
    };
  }, []);

  // Recent Transactions (top 5)
  const recentTransactions = useMemo(() => {
    return [...mockEntries]
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, 5);
  }, []);

  // Compute Chart Data (Expenses by Category)
  const expenseChartData = useMemo(() => {
    const expenses = mockEntries.filter(e => e.type === "EXPENSE");
    const map = new Map<string, number>();
    expenses.forEach(e => {
      const current = map.get(e.categoryName) || 0;
      map.set(e.categoryName, current + e.amountCents);
    });

    const data = Array.from(map.entries()).map(([category, amountCents]) => ({ category, amountCents }));
    data.sort((a, b) => b.amountCents - a.amountCents);

    // Top 5 categories
    const topData = data.slice(0, 5);
    const maxAmount = Math.max(...topData.map(d => d.amountCents), 1); // prevent DIV/0

    return topData.map(d => ({
      ...d,
      heightPercentage: Math.max((d.amountCents / maxAmount) * 100, 5) // Floor at 5% so bar is visible
    }));
  }, []);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Visão Geral do Financeiro</h1>
          <p className="mt-1 text-sm text-slate-500">
            Acompanhe as principais métricas e transações recentes.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
          <Button asChild className="h-11 rounded-2xl gap-2 bg-[#0A5BC4] hover:bg-[#094FA8]">
            <Link to="/financeiro/lancamentos">
              <PlusIcon className="h-4 w-4" />
              Ver Lançamentos
            </Link>
          </Button>
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* CARDS */}
        <Card className="rounded-3xl border-slate-200 shadow-sm hover:shadow-md transition">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Saldo Atual</CardTitle>
            <div className="h-8 w-8 rounded-full bg-[#0A5BC4]/10 grid place-items-center">
              <DollarSign className="h-4 w-4 text-[#0A5BC4]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(balance)}</div>
            <p className="text-xs text-slate-500 mt-1">Acumulado do período</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200 shadow-sm hover:shadow-md transition">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Receitas</CardTitle>
            <div className="h-8 w-8 rounded-full bg-emerald-100 grid place-items-center">
              <ArrowUpRight className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalIncome)}</div>
            <p className="text-xs text-slate-500 mt-1">Todas as entradas mockadas</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200 shadow-sm hover:shadow-md transition">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Despesas</CardTitle>
            <div className="h-8 w-8 rounded-full bg-red-100 grid place-items-center">
              <ArrowDownRight className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalExpense)}</div>
            <p className="text-xs text-slate-500 mt-1">Todas as saídas mockadas</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200 shadow-sm hover:shadow-md transition">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Pendências</CardTitle>
            <div className="h-8 w-8 rounded-full bg-orange-100 grid place-items-center">
              <Clock className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{pendingCount} lançamentos</div>
            <p className="text-xs text-slate-500 mt-1">Anexos não enviados</p>
          </CardContent>
        </Card>
      </div>

      {/* DASHBOARD GRIDS */}
      <div className="grid gap-6 lg:grid-cols-7">

        {/* CHART COMPARISON: 4 cols span out of 7 */}
        <Card className="lg:col-span-4 rounded-3xl border-slate-200 shadow-sm h-full flex flex-col">
          <CardHeader>
            <CardTitle>Despesas por Categoria (Top 5)</CardTitle>
            <CardDescription>
              Comparativo visual simples das maiores despesas do período.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-end pt-5">
            {expenseChartData.length === 0 ? (
              <div className="flex items-center justify-center flex-1 h-[250px] text-slate-400">Sem dados de despesa.</div>
            ) : (
              <div className="flex items-end justify-between gap-2 sm:gap-4 h-[250px] w-full px-2 sm:px-6">
                {expenseChartData.map((d, i) => (
                  <div key={d.category} className="group flex flex-col items-center justify-end w-full h-full">
                    {/* Tooltip native fallback */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity mb-2 bg-slate-800 text-white text-xs px-2 py-1 rounded-md text-center pointer-events-none whitespace-nowrap">
                      {formatCurrency(d.amountCents)}
                    </div>
                    {/* Bar */}
                    <div
                      className="w-full sm:w-16 rounded-t-xl bg-[#0A5BC4] transition-all duration-500 ease-out group-hover:bg-[#094FA8]"
                      style={{ height: `${d.heightPercentage}%` }}
                    />
                    {/* Label */}
                    <span className="text-[10px] sm:text-xs text-slate-500 font-medium mt-3 text-center truncate w-full px-1">
                      {d.category.length > 12 ? d.category.substring(0, 10) + '...' : d.category}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* RECENT TRANSACTIONS: 3 cols span out of 7 */}
        <Card className="lg:col-span-3 rounded-3xl border-slate-200 shadow-sm h-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Últimos Lançamentos</CardTitle>
              <CardDescription>Atividades recentes do fluxo de caixa.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {recentTransactions.map(e => (
                <div key={e.id} className="flex items-center">
                  <div className={`h-10 w-10 flex-shrink-0 grid place-items-center rounded-full mr-4 ${e.type === 'INCOME' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                    {e.type === 'INCOME' ? <ArrowUpRight className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                  </div>
                  <div className="ml-1 space-y-1 w-full overflow-hidden">
                    <p className="text-sm font-medium leading-none text-slate-900 truncate">
                      {e.description}
                    </p>
                    <div className="flex items-center text-xs text-slate-500">
                      <span>{formatDateShort(e.occurredAt)}</span>
                      <span className="mx-2">•</span>
                      <span className="truncate">{e.categoryName}</span>
                      {e.attachmentsStatus === 'pending' && (
                        <Badge variant="secondary" className="ml-auto bg-orange-100 text-orange-800 text-[9px] px-1.5 py-0 h-4">Pend</Badge>
                      )}
                    </div>
                  </div>
                  <div className={`ml-4 font-semibold text-sm shrink-0 ${e.type === 'INCOME' ? 'text-emerald-600' : 'text-slate-900'}`}>
                    {e.type === "EXPENSE" ? "- " : "+ "}
                    {formatCurrency(e.amountCents)}
                  </div>
                </div>
              ))}
            </div>

            <Button asChild variant="outline" className="w-full mt-6 rounded-xl border-slate-200 hover:bg-slate-50">
              <Link to="/financeiro/lancamentos">
                Ver todos os lançamentos <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}
