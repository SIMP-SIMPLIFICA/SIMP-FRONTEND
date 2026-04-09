import { useMemo } from "react";
import { Sparkles, TrendingUp, TrendingDown, AlertCircle, Activity } from "lucide-react";
import {
    ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, ReferenceArea,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFinanceEntries } from "@/hooks/useFinance";
import { Loader2 } from "lucide-react";
import { format, subMonths, startOfMonth, isSameMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { FinanceEntry } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtBRL(cents: number) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function fmtShort(cents: number) {
    if (cents >= 100_000_000) return `R$ ${(cents / 100_000_000).toFixed(1)}M`;
    if (cents >= 100_000) return `R$ ${(cents / 100_000).toFixed(0)}k`;
    return fmtBRL(cents);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type MonthBucket = { name: string; date: Date; income: number; expense: number };

type ChartPoint = {
    name: string;
    // histórico (linhas sólidas) — null nos meses projetados
    receitas: number | null;
    despesas: number | null;
    // projeção (linhas tracejadas) — null nos meses históricos exceto o atual (ponto de conexão)
    projReceitas: number | null;
    projDespesas: number | null;
    isProjected: boolean;
};

// ---------------------------------------------------------------------------
// Tooltip customizado
// ---------------------------------------------------------------------------
function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;

    const isProj = payload[0]?.payload?.isProjected;

    return (
        <div className="bg-white border border-slate-200 shadow-xl rounded-2xl p-4 min-w-[200px]">
            <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                {isProj && <span className="text-indigo-400">◈</span>}
                {label}
                {isProj && <span className="text-indigo-400 ml-1">(projetado)</span>}
            </p>
            {payload.map((entry: any) => {
                if (entry.value == null) return null;
                const name = entry.name === "receitas" || entry.name === "projReceitas"
                    ? "Receitas" : "Despesas";
                const color = entry.color;
                return (
                    <div key={entry.dataKey} className="flex items-center justify-between gap-6 text-xs mb-1">
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <span className="text-slate-500">{name}</span>
                        </div>
                        <span className="font-semibold text-slate-900">{fmtBRL(entry.value)}</span>
                    </div>
                );
            })}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export default function Inteligencia() {
    const { data: entriesData, isLoading } = useFinanceEntries(undefined, { limit: 1000 });
    const entries: FinanceEntry[] = entriesData || [];

    const insights = useMemo(() => {
        const now = new Date();

        // Montar buckets dos últimos 6 meses (0 = atual, 5 = mais antigo)
        const buckets: MonthBucket[] = Array.from({ length: 6 }, (_, i) => {
            const d = subMonths(now, 5 - i);
            return { name: format(d, "MMM/yy", { locale: ptBR }), date: startOfMonth(d), income: 0, expense: 0 };
        });

        // Categoria com maior gasto — mês atual e mês anterior
        const currentStart = startOfMonth(now);
        const prevStart = startOfMonth(subMonths(now, 1));
        const catCurrent = new Map<string, number>();
        const catPrev = new Map<string, number>();

        entries.forEach((e: FinanceEntry) => {
            const d = parseISO(e.occurredAt);
            const bucket = buckets.find(b => isSameMonth(d, b.date));
            if (bucket) {
                if (e.type === "INCOME") bucket.income += e.amountCents;
                else bucket.expense += e.amountCents;
            }
            if (e.type === "EXPENSE") {
                if (isSameMonth(d, currentStart)) catCurrent.set(e.categoryName, (catCurrent.get(e.categoryName) ?? 0) + e.amountCents);
                if (isSameMonth(d, prevStart)) catPrev.set(e.categoryName, (catPrev.get(e.categoryName) ?? 0) + e.amountCents);
            }
        });

        // Top categoria mês atual
        let topCatName = "N/A";
        let topCatValue = 0;
        catCurrent.forEach((val, name) => { if (val > topCatValue) { topCatValue = val; topCatName = name; } });
        const topCatPrev = catPrev.get(topCatName) ?? 0;
        const topCatMOM = topCatPrev === 0 ? 100 : ((topCatValue - topCatPrev) / topCatPrev) * 100;

        // Saúde orçamentária — mês atual
        const current = buckets[5];
        const isHealthy = current.income >= current.expense;
        const commitPct = current.income > 0 ? Math.round((current.expense / current.income) * 100) : 100;

        // Tendência de gastos — comparar últimos 3 meses completos (buckets 2,3,4 = 3,2,1 meses atrás)
        const m3 = buckets[2]; // 3 meses atrás
        const m2 = buckets[3]; // 2 meses atrás
        const m1 = buckets[4]; // mês anterior (mais recente completo)
        const trendExpense = m3.expense > 0
            ? ((m1.expense - m3.expense) / m3.expense) * 100
            : 0;
        const trendIncome = m3.income > 0
            ? ((m1.income - m3.income) / m3.income) * 100
            : 0;

        // ── Projeção determinística (linear extrapolation dos últimos 3 meses completos) ──
        // Slope = diferença média por mês
        const incSlope = (m1.income - m3.income) / 2;
        const expSlope = (m1.expense - m3.expense) / 2;

        // Base = média ponderada (peso: 1, 2, 3)
        const wIncBase = (m3.income * 1 + m2.income * 2 + m1.income * 3) / 6;
        const wExpBase = (m3.expense * 1 + m2.expense * 2 + m1.expense * 3) / 6;

        // Projected values: start from weighted base, apply slope
        const proj = [1, 2, 3].map(i => ({
            income: Math.max(0, Math.round(wIncBase + incSlope * i)),
            expense: Math.max(0, Math.round(wExpBase + expSlope * i)),
        }));

        // ── Montar dados do gráfico ──
        // Os 6 buckets históricos como linhas sólidas
        const chartData: ChartPoint[] = buckets.map((b, idx) => {
            const isCurrentMonth = idx === 5;
            return {
                name: b.name,
                receitas: b.income,
                despesas: b.expense,
                // Mês atual: preencher também as colunas proj para criar ponto de conexão
                projReceitas: isCurrentMonth ? b.income : null,
                projDespesas: isCurrentMonth ? b.expense : null,
                isProjected: false,
            };
        });

        // Adicionar 3 meses projetados
        proj.forEach((p, i) => {
            const d = subMonths(now, -1 - i);
            chartData.push({
                name: format(d, "MMM/yy", { locale: ptBR }),
                receitas: null,
                despesas: null,
                projReceitas: p.income,
                projDespesas: p.expense,
                isProjected: true,
            });
        });

        return {
            chartData,
            topCatName,
            topCatValue,
            topCatMOM,
            isHealthy,
            commitPct,
            currentIncome: current.income,
            currentExpense: current.expense,
            trendExpense,
            trendIncome,
            currentMonthLabel: buckets[5].name,
        };
    }, [entries]);

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center p-12 text-slate-500">
                <Loader2 className="h-6 w-6 animate-spin mr-3" />
                Analisando fluxo de caixa...
            </div>
        );
    }

    const {
        chartData, topCatName, topCatValue, topCatMOM,
        isHealthy, commitPct, currentIncome, currentExpense,
        trendExpense, trendIncome, currentMonthLabel,
    } = insights;

    const noData = currentIncome === 0 && currentExpense === 0;

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-semibold text-slate-900">Inteligência Financeira</h1>
                        <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 border-indigo-200">
                            <Sparkles className="h-3 w-3 mr-1" /> Beta
                        </Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                        Insights automáticos e projeção baseada no histórico de fluxo de caixa.
                    </p>
                </div>
            </div>

            {noData ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
                    <Activity className="h-12 w-12 opacity-30" />
                    <p className="text-base">Nenhum lançamento encontrado para gerar insights.</p>
                </div>
            ) : (
                <>
                    {/* CARDS */}
                    <div className="grid gap-6 md:grid-cols-3">
                        {/* Card 1 — Alerta de Gasto */}
                        <Card className="rounded-3xl border-slate-200 shadow-sm border-l-4 border-l-orange-500">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-orange-500" />
                                    Maior Despesa do Mês
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-900 font-semibold mb-1 truncate" title={topCatName}>
                                    {topCatName}
                                </p>
                                <p className="text-2xl font-bold text-slate-900 mb-2">{fmtBRL(topCatValue)}</p>
                                <div className="flex items-center gap-1.5 text-sm">
                                    {topCatMOM > 0 ? (
                                        <TrendingUp className="h-4 w-4 text-orange-500 shrink-0" />
                                    ) : (
                                        <TrendingDown className="h-4 w-4 text-emerald-500 shrink-0" />
                                    )}
                                    <span className={topCatMOM > 0 ? "text-orange-600" : "text-emerald-600"}>
                                        {topCatMOM > 0 ? "+" : ""}{Math.round(topCatMOM)}% vs mês anterior
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Card 2 — Saúde Orçamentária */}
                        <Card className={`rounded-3xl border-slate-200 shadow-sm border-l-4 ${isHealthy ? "border-l-emerald-500" : "border-l-red-500"}`}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                                    {isHealthy
                                        ? <TrendingUp className="h-4 w-4 text-emerald-500" />
                                        : <TrendingDown className="h-4 w-4 text-red-500" />}
                                    {isHealthy ? "Folga Orçamentária" : "Risco de Déficit"}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-900 font-semibold mb-1">
                                    {isHealthy ? "Comprometimento Saudável" : "Déficit Mapeado"}
                                </p>
                                <div className="flex items-baseline gap-2 mb-2">
                                    <span className={`text-3xl font-bold ${isHealthy ? "text-emerald-600" : "text-red-600"}`}>
                                        {commitPct}%
                                    </span>
                                    <span className="text-sm text-slate-400">da receita comprometido</span>
                                </div>
                                {/* Progress bar */}
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${commitPct > 100 ? "bg-red-500" : commitPct > 80 ? "bg-orange-400" : "bg-emerald-500"}`}
                                        style={{ width: `${Math.min(commitPct, 100)}%` }}
                                    />
                                </div>
                                <p className="text-xs text-slate-400 mt-1.5">
                                    Receita: {fmtBRL(currentIncome)} · Despesa: {fmtBRL(currentExpense)}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Card 3 — Tendência de Gastos (3 meses) */}
                        <Card className={`rounded-3xl border-slate-200 shadow-sm border-l-4 ${trendExpense > 5 ? "border-l-red-400" : trendExpense < -5 ? "border-l-emerald-400" : "border-l-slate-300"}`}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-indigo-500" />
                                    Tendência (3 meses)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-900 font-semibold mb-3">
                                    {trendExpense > 5 ? "Gastos em Alta" : trendExpense < -5 ? "Gastos em Queda" : "Gastos Estáveis"}
                                </p>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                            <span className="text-slate-500">Receitas</span>
                                        </div>
                                        <div className={`flex items-center gap-1 font-medium ${trendIncome >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                            {trendIncome >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                                            {trendIncome >= 0 ? "+" : ""}{Math.round(trendIncome)}%
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-red-400" />
                                            <span className="text-slate-500">Despesas</span>
                                        </div>
                                        <div className={`flex items-center gap-1 font-medium ${trendExpense <= 0 ? "text-emerald-600" : "text-orange-500"}`}>
                                            {trendExpense > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                                            {trendExpense >= 0 ? "+" : ""}{Math.round(trendExpense)}%
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400 mt-3">Comparando mês -3 com mês -1</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* GRÁFICO DE PROJEÇÃO */}
                    <Card className="rounded-3xl border-slate-200 shadow-sm">
                        <CardHeader className="border-b bg-slate-50/50 pb-4">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                <div>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5 text-indigo-600" />
                                        Histórico + Projeção (9 meses)
                                    </CardTitle>
                                    <p className="text-sm text-slate-500 mt-1">
                                        6 meses reais · 3 meses projetados por extrapolação linear ponderada
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-500">
                                    <div className="flex items-center gap-2">
                                        <svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="#10b981" strokeWidth="2.5" /></svg>
                                        Receitas
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="#f87171" strokeWidth="2.5" /></svg>
                                        Despesas
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="#10b981" strokeWidth="2" strokeDasharray="5 3" /></svg>
                                        Projeção
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <ResponsiveContainer width="100%" height={320}>
                                <ComposedChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />

                                    {/* Área de projeção com fundo diferente */}
                                    <ReferenceArea
                                        x1={currentMonthLabel}
                                        fill="#eef2ff"
                                        fillOpacity={0.5}
                                    />

                                    <ReferenceLine
                                        x={currentMonthLabel}
                                        stroke="#818cf8"
                                        strokeWidth={1.5}
                                        strokeDasharray="4 3"
                                        label={{ value: "Hoje", position: "insideTopRight", fill: "#818cf8", fontSize: 11, fontWeight: 600 }}
                                    />

                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: "#64748b", fontSize: 12 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        width={75}
                                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                                        tickFormatter={fmtShort}
                                        dx={-6}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#e2e8f0", strokeWidth: 2 }} />

                                    {/* Linhas sólidas — dados reais */}
                                    <Line
                                        type="monotone"
                                        dataKey="receitas"
                                        name="receitas"
                                        stroke="#10b981"
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: "#fff", stroke: "#10b981", strokeWidth: 2 }}
                                        activeDot={{ r: 6, fill: "#10b981", strokeWidth: 0 }}
                                        connectNulls={false}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="despesas"
                                        name="despesas"
                                        stroke="#f87171"
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: "#fff", stroke: "#f87171", strokeWidth: 2 }}
                                        activeDot={{ r: 6, fill: "#f87171", strokeWidth: 0 }}
                                        connectNulls={false}
                                    />

                                    {/* Linhas tracejadas — projeção */}
                                    <Line
                                        type="monotone"
                                        dataKey="projReceitas"
                                        name="projReceitas"
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        strokeDasharray="6 4"
                                        strokeOpacity={0.7}
                                        dot={{ r: 3, fill: "#fff", stroke: "#10b981", strokeWidth: 1.5 }}
                                        activeDot={{ r: 5, fill: "#10b981", strokeWidth: 0 }}
                                        connectNulls={false}
                                        legendType="none"
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="projDespesas"
                                        name="projDespesas"
                                        stroke="#f87171"
                                        strokeWidth={2}
                                        strokeDasharray="6 4"
                                        strokeOpacity={0.7}
                                        dot={{ r: 3, fill: "#fff", stroke: "#f87171", strokeWidth: 1.5 }}
                                        activeDot={{ r: 5, fill: "#f87171", strokeWidth: 0 }}
                                        connectNulls={false}
                                        legendType="none"
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
