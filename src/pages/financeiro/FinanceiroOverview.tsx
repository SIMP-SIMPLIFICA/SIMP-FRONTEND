/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ArrowDownRight, DollarSign, Clock, FileText, ChevronRight, Loader2, HeartPulse, HardHat, Car, Home } from "lucide-react";
import { isSameMonth, isSameYear, isAfter, subDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { useFinanceEntries } from "@/hooks/useFinance";
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

const CHART_COLORS = ["#0A5BC4", "#10b981", "#f59e0b", "#6366f1", "#f43f5e", "#8b5cf6"];

const CategoryIconMap: Record<string, React.ReactNode> = {
  Saúde: <HeartPulse className="h-5 w-5" />,
  Obras: <HardHat className="h-5 w-5" />,
  Transporte: <Car className="h-5 w-5" />,
  Habitação: <Home className="h-5 w-5" />,
};

// --- MAIN COMPONENT ---
type TimeFilter = "month" | "30d" | "year" | "all";

export default function FinanceiroOverview() {
  const { data: entriesData, isLoading } = useFinanceEntries(undefined, { limit: 1000 });
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("month");
  const [activeIndex, setActiveIndex] = useState(0);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  // Global Time Filter filtering
  const entries = useMemo(() => {
    if (!entriesData) return [];
    if (timeFilter === "all") return entriesData;

    const now = new Date();
    return entriesData.filter((e: FinanceEntry) => {
      const d = new Date(e.occurredAt);
      if (timeFilter === "month") return isSameMonth(d, now) && isSameYear(d, now);
      if (timeFilter === "30d") return isAfter(d, subDays(now, 30));
      if (timeFilter === "year") return isSameYear(d, now);
      return true;
    });
  }, [entriesData, timeFilter]);

  // Computed Metrics
  const { totalIncome, totalExpense, balance, pendingCount } = useMemo(() => {
    let inc = 0, exp = 0, pend = 0;
    entries.forEach((e: FinanceEntry) => {
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
  }, [entries]);

  // Recent Transactions (top 5)
  const recentTransactions = useMemo(() => {
    return [...entries]
      .sort((a: FinanceEntry, b: FinanceEntry) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, 5);
  }, [entries]);

  // Compute Chart Data (Cash Flow)
  const cashFlowChartData = useMemo(() => {
    const isDaily = timeFilter === "month" || timeFilter === "30d";
    const map = new Map<string, { name: string; date: Date; receitas: number; despesas: number }>();

    entries.forEach((e: FinanceEntry) => {
      const d = new Date(e.occurredAt);
      if (isNaN(d.getTime())) return;

      const key = isDaily ? format(d, "yyyy-MM-dd") : format(d, "yyyy-MM");
      const name = isDaily ? format(d, "dd MMM", { locale: ptBR }) : format(d, "MMM yy", { locale: ptBR });

      if (!map.has(key)) {
        map.set(key, { name, date: d, receitas: 0, despesas: 0 });
      }

      const node = map.get(key)!;
      if (e.type === "INCOME") node.receitas += e.amountCents;
      if (e.type === "EXPENSE") node.despesas += e.amountCents;
    });

    return Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [entries, timeFilter]);

  // Compute Chart Data (Expenses by Category)
  const expenseChartData = useMemo(() => {
    const expenses = entries.filter((e: FinanceEntry) => e.type === "EXPENSE");
    const map = new Map<string, number>();
    expenses.forEach((e: FinanceEntry) => {
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
  }, [entries]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin mr-3" />
        Carregando painel financeiro...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Visão Geral do Financeiro</h1>
          <p className="mt-1 text-sm text-slate-500">
            Acompanhe as principais métricas e transações recentes.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {/* Time Filter Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(["month", "30d", "year", "all"] as TimeFilter[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeFilter(tf)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${timeFilter === tf ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
              >
                {tf === "month" && "Este Mês"}
                {tf === "30d" && "Últimos 30d"}
                {tf === "year" && "Este Ano"}
                {tf === "all" && "Tudo"}
              </button>
            ))}
          </div>

          <Button asChild className="h-9 rounded-xl gap-2 bg-[#0A5BC4] hover:bg-[#094FA8] text-sm">
            <Link to="/financeiro/lancamentos">
              <PlusIcon className="h-4 w-4" />
              Novo
            </Link>
          </Button>
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* CARDS */}
        <Card className="rounded-3xl border-slate-200 shadow-sm hover:shadow-md transition relative overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-slate-500">Saldo Atual</CardTitle>
            <div className={`h-8 w-8 rounded-full grid place-items-center backdrop-blur-md ${balance > 0 ? 'bg-emerald-500/10' : balance < 0 ? 'bg-red-500/10' : 'bg-[#0A5BC4]/10'}`}>
              <DollarSign className={`h-4 w-4 ${balance > 0 ? 'text-emerald-600' : balance < 0 ? 'text-red-600' : 'text-[#0A5BC4]'}`} />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className={`text-3xl font-bold tracking-tight ${balance > 0 ? 'text-emerald-600' : balance < 0 ? 'text-red-600' : 'text-slate-900'}`}>
              {formatCurrency(balance)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Acumulado do período</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200 shadow-sm hover:shadow-md transition relative overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-slate-500">Receitas</CardTitle>
            <div className="h-8 w-8 rounded-full bg-emerald-500/10 grid place-items-center backdrop-blur-md">
              <ArrowUpRight className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-slate-900 tracking-tight">{formatCurrency(totalIncome)}</div>
            <p className="text-xs text-slate-500 mt-1">Todas as entradas computadas</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200 shadow-sm hover:shadow-md transition relative overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-slate-500">Despesas</CardTitle>
            <div className="h-8 w-8 rounded-full bg-red-500/10 grid place-items-center backdrop-blur-md">
              <ArrowDownRight className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-slate-900 tracking-tight">{formatCurrency(totalExpense)}</div>
            <p className="text-xs text-slate-500 mt-1">Todas as saídas computadas</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200 shadow-sm hover:shadow-md transition relative overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-slate-500">Pendências</CardTitle>
            <div className="h-8 w-8 rounded-full bg-orange-500/10 grid place-items-center backdrop-blur-md">
              <Clock className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-slate-900 tracking-tight">{pendingCount} <span className="text-lg font-medium text-slate-500">lançamentos</span></div>
            <p className="text-xs text-slate-500 mt-1">Anexos não enviados</p>
          </CardContent>
        </Card>
      </div>

      {/* MAIN CHART (CASH FLOW) */}
      <Card className="rounded-3xl border-slate-200 shadow-sm flex flex-col">
        <CardHeader>
          <CardTitle>Fluxo de Caixa</CardTitle>
          <CardDescription>Comparativo real de Receitas vs Despesas no período.</CardDescription>
        </CardHeader>
        <CardContent className="min-h-[350px] w-full pt-4">
          {cashFlowChartData.length === 0 ? (
            <div className="flex h-full min-h-[300px] items-center justify-center text-slate-400">Sem dados de fluxo.</div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={cashFlowChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={(value) => value === 0 ? '0' : `R$ ${Math.round(value / 1000)}k`}
                />
                <Tooltip
                  formatter={(value: any) => formatCurrency(Number(value))}
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.1)', padding: '12px 16px' }}
                  itemStyle={{ fontWeight: 600, fontSize: '14px' }}
                  labelStyle={{ color: '#64748b', fontSize: '12px', marginBottom: '8px' }}
                />
                <Bar dataKey="receitas" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="despesas" name="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* SECONDARY DASHBOARD GRIDS */}
      <div className="grid gap-6 xl:grid-cols-7">

        {/* DONUT CHART: 3 cols span out of 7 */}
        <Card className="xl:col-span-3 rounded-3xl border-slate-200 shadow-sm h-full flex flex-col">
          <CardHeader>
            <CardTitle>Despesas por Categoria (Top 5)</CardTitle>
            <CardDescription>
              Comparativo visual simples das maiores despesas do período.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col pt-5">
            {expenseChartData.length === 0 ? (
              <div className="flex items-center justify-center flex-1 text-slate-400">Sem dados de despesa.</div>
            ) : (
              <div className="flex-1 w-full min-h-[300px] relative flex flex-col items-center justify-center">
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-30px]">
                  <span className="text-sm font-medium text-slate-400">Total Despesas</span>
                  <span className="text-2xl font-bold text-slate-900 tracking-tight">
                    {formatCurrency(totalExpense)}
                  </span>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      {...({
                        activeIndex,
                        activeShape: (props: any) => {
                          const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
                          return (
                            <g>
                              <Sector
                                cx={cx}
                                cy={cy}
                                innerRadius={innerRadius}
                                outerRadius={outerRadius + 8}
                                startAngle={startAngle}
                                endAngle={endAngle}
                                fill={fill}
                                cornerRadius={6}
                              />
                              <Sector
                                cx={cx}
                                cy={cy}
                                startAngle={startAngle}
                                endAngle={endAngle}
                                innerRadius={outerRadius + 12}
                                outerRadius={outerRadius + 15}
                                fill={fill}
                                cornerRadius={6}
                                opacity={0.3}
                              />
                            </g>
                          );
                        }
                      } as any)}
                      data={expenseChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={100}
                      outerRadius={125}
                      paddingAngle={4}
                      dataKey="amountCents"
                      nameKey="category"
                      cornerRadius={6}
                      onMouseEnter={onPieEnter}
                      stroke="none"
                    >
                      {expenseChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => formatCurrency(Number(value))}
                      contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.1)', padding: '12px 16px' }}
                      itemStyle={{ color: '#0f172a', fontWeight: 600, fontSize: '14px' }}
                      labelStyle={{ color: '#64748b', fontSize: '12px', marginBottom: '4px' }}
                      cursor={{ fill: 'transparent' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Legend Overlay */}
                <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-2 px-4">
                  {expenseChartData.map((d, i) => (
                    <div
                      key={d.category}
                      className={`flex items-center gap-2 text-xs font-medium cursor-pointer transition-all duration-300 ${activeIndex === i ? 'text-slate-900 scale-105' : 'text-slate-500 hover:text-slate-700'}`}
                      onMouseEnter={() => setActiveIndex(i)}
                    >
                      <div className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="truncate max-w-[120px]" title={d.category}>{d.category}</span>
                      <span className="text-slate-400 ml-1 hidden sm:inline">{Math.round((d.amountCents / totalExpense) * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* RECENT TRANSACTIONS: 4 cols span out of 7 */}
        <Card className="xl:col-span-4 rounded-3xl border-slate-200 shadow-sm h-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Últimos Lançamentos</CardTitle>
              <CardDescription>Atividades recentes do fluxo de caixa.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {recentTransactions.map(e => {
                const Icon = e.type === 'INCOME' ? <ArrowUpRight className="h-5 w-5" /> : (CategoryIconMap[e.categoryName] || <FileText className="h-5 w-5" />);

                return (
                  <div key={e.id} className="flex items-center group">
                    <div className={`h-11 w-11 flex-shrink-0 grid place-items-center rounded-2xl mr-4 transition-colors ${e.type === 'INCOME' ? 'bg-emerald-100/50 text-emerald-600 group-hover:bg-emerald-100' : 'bg-slate-100/80 text-slate-500 group-hover:text-[#0A5BC4] group-hover:bg-[#0A5BC4]/10'}`}>
                      {Icon}
                    </div>
                    <div className="ml-1 space-y-1 w-full overflow-hidden">
                      <p className="text-sm font-semibold leading-none text-slate-900 truncate group-hover:text-[#0A5BC4] transition-colors">
                        {e.description}
                      </p>
                      <div className="flex items-center text-xs text-slate-500 font-medium">
                        <span>{formatDateShort(e.occurredAt)}</span>
                        <span className="mx-2 text-slate-300">•</span>
                        <span className="truncate">{e.categoryName}</span>
                        {e.attachmentsStatus === 'pending' && (
                          <Badge variant="secondary" className="ml-auto bg-orange-100 text-orange-800 hover:bg-orange-200 border-none text-[9px] px-1.5 py-0 h-4 uppercase tracking-wider">Pend</Badge>
                        )}
                      </div>
                    </div>
                    <div className={`ml-4 font-bold text-sm tracking-tight shrink-0 ${e.type === 'INCOME' ? 'text-emerald-500' : 'text-slate-900'}`}>
                      {e.type === "EXPENSE" ? "- " : "+ "}
                      {formatCurrency(e.amountCents)}
                    </div>
                  </div>
                )
              })}
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
