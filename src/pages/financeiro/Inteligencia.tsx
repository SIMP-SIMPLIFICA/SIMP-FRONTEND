import { useMemo } from "react";
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, Info, XCircle, CheckCircle2, Activity, Gauge, LayoutList } from "lucide-react";
import {
    ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, ReferenceArea,
} from "recharts";
import { format, subMonths, startOfMonth, isSameMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFinanceEntries } from "@/hooks/useFinance";
import { Loader2 } from "lucide-react";
import type { FinanceEntry } from "./types";

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------
function fmtBRL(cents: number) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function fmtShort(cents: number) {
    if (cents >= 100_000_000) return `R$ ${(cents / 100_000_000).toFixed(1)}M`;
    if (cents >= 100_000) return `R$ ${(cents / 100_000).toFixed(0)}k`;
    return fmtBRL(cents);
}

function fmtPct(n: number, forceSign = false) {
    return `${forceSign && n > 0 ? "+" : ""}${Math.round(n)}%`;
}

// ---------------------------------------------------------------------------
// Algorithms
// ---------------------------------------------------------------------------

/** Holt's Linear Exponential Smoothing (ETS com tendência) */
function etsHolt(data: number[], alpha = 0.3, beta = 0.1, horizon = 3): number[] {
    if (data.length === 0) return Array(horizon).fill(0);
    if (data.length === 1) return Array(horizon).fill(data[0]);

    let L = data[0];
    let T = data[1] - data[0];

    for (let i = 1; i < data.length; i++) {
        const prevL = L;
        L = alpha * data[i] + (1 - alpha) * (L + T);
        T = beta * (L - prevL) + (1 - beta) * T;
    }

    return Array.from({ length: horizon }, (_, h) =>
        Math.max(0, Math.round(L + (h + 1) * T))
    );
}

/** Z-score de `current` em relação ao histórico (excluindo zeros para não distorcer) */
function computeZScore(history: number[], current: number): { z: number; mean: number; std: number } {
    const active = history.filter(v => v > 0);
    if (active.length < 2) return { z: 0, mean: 0, std: 0 };
    const mean = active.reduce((s, v) => s + v, 0) / active.length;
    const variance = active.reduce((s, v) => s + (v - mean) ** 2, 0) / active.length;
    const std = Math.sqrt(variance);
    return { z: std === 0 ? 0 : (current - mean) / std, mean, std };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type MonthBucket = { name: string; date: Date; income: number; expense: number };

type AlertSeverity = "critical" | "warning" | "info";

type DiagAlert = {
    id: string;
    severity: AlertSeverity;
    title: string;
    body: string;
};

type ChartPoint = {
    name: string;
    receitas: number | null;
    despesas: number | null;
    projReceitas: number | null;
    projDespesas: number | null;
    isProjected: boolean;
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
const SEVERITY_CONFIG: Record<AlertSeverity, {
    icon: React.ReactNode;
    border: string;
    bg: string;
    badge: string;
    label: string;
}> = {
    critical: {
        icon: <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />,
        border: "border-l-red-500",
        bg: "bg-red-50/60",
        badge: "bg-red-100 text-red-700",
        label: "Crítico",
    },
    warning: {
        icon: <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />,
        border: "border-l-orange-400",
        bg: "bg-orange-50/60",
        badge: "bg-orange-100 text-orange-700",
        label: "Atenção",
    },
    info: {
        icon: <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />,
        border: "border-l-blue-300",
        bg: "bg-blue-50/40",
        badge: "bg-blue-100 text-blue-700",
        label: "Info",
    },
};

function AlertRow({ alert }: { alert: DiagAlert }) {
    const cfg = SEVERITY_CONFIG[alert.severity];
    return (
        <div className={`flex gap-3 px-4 py-3 border-l-4 rounded-r-xl ${cfg.border} ${cfg.bg}`}>
            {cfg.icon}
            <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-800">{alert.title}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${cfg.badge}`}>
                        {cfg.label}
                    </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{alert.body}</p>
            </div>
        </div>
    );
}

type TooltipEntry = { dataKey: string; value: number | null; color: string; name: string; payload: ChartPoint };
type TooltipProps = { active?: boolean; payload?: TooltipEntry[]; label?: string };

function CustomTooltip({ active, payload, label }: TooltipProps) {
    if (!active || !payload?.length) return null;
    const isProj = payload[0]?.payload?.isProjected;
    return (
        <div className="bg-white border border-slate-200 shadow-xl rounded-2xl p-4 min-w-[200px]">
            <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                {isProj && <span className="text-indigo-400 text-[10px] font-bold uppercase tracking-wider">ETS ·</span>}
                {label}
            </p>
            {payload.map((entry: TooltipEntry) => {
                if (entry.value == null) return null;
                const isReceita = entry.dataKey === "receitas" || entry.dataKey === "projReceitas";
                return (
                    <div key={entry.dataKey} className="flex items-center justify-between gap-6 text-xs mb-1">
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                            <span className="text-slate-500">{isReceita ? "Receitas" : "Despesas"}</span>
                        </div>
                        <span className="font-semibold text-slate-900">{fmtBRL(entry.value)}</span>
                    </div>
                );
            })}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function Inteligencia() {
    const { data: entriesData, isLoading } = useFinanceEntries(undefined, { limit: 1000 });
    const entries: FinanceEntry[] = entriesData || [];

    const analysis = useMemo(() => {
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const daysElapsed = now.getDate();
        const daysRemaining = daysInMonth - daysElapsed;

        // ── 1. Buckets mensais (índice 0 = 5 meses atrás, 5 = mês atual) ──
        const buckets: MonthBucket[] = Array.from({ length: 6 }, (_, i) => {
            const d = subMonths(now, 5 - i);
            return { name: format(d, "MMM/yy", { locale: ptBR }), date: startOfMonth(d), income: 0, expense: 0 };
        });

        // catExpense[catName][bucketIdx] = total gasto
        const catExpense = new Map<string, number[]>();

        entries.forEach((e: FinanceEntry) => {
            const d = parseISO(e.occurredAt);
            const idx = buckets.findIndex(b => isSameMonth(d, b.date));
            if (idx === -1) return;

            if (e.type === "INCOME") {
                buckets[idx].income += e.amountCents;
            } else {
                buckets[idx].expense += e.amountCents;
                if (!catExpense.has(e.categoryName)) catExpense.set(e.categoryName, Array(6).fill(0));
                catExpense.get(e.categoryName)![idx] += e.amountCents;
            }
        });

        // ── 2. Velocidade de gasto ──
        const currentExpense = buckets[5].expense;
        const currentIncome = buckets[5].income;
        const lastMonthExpense = buckets[4].expense;
        const dailyPace = daysElapsed > 0 ? currentExpense / daysElapsed : 0;
        const projectedExpense = Math.round(dailyPace * daysInMonth);
        const velocityVsLastMonth = lastMonthExpense > 0
            ? ((projectedExpense / lastMonthExpense) - 1) * 100
            : 0;

        // ── 3. Comprometimento orçamentário ──
        const commitPct = currentIncome > 0
            ? Math.round((currentExpense / currentIncome) * 100)
            : (currentExpense > 0 ? 100 : 0);

        // ── 4. Detecção de anomalias por Z-score ──
        type AnomalyItem = {
            category: string;
            z: number;
            current: number;
            mean: number;
            severity: "critical" | "warning";
        };

        const anomalies: AnomalyItem[] = [];
        catExpense.forEach((monthly, category) => {
            const history = monthly.slice(0, 5); // 5 meses completos
            const current = monthly[5];
            if (current === 0) return;

            const { z, mean } = computeZScore(history, current);
            if (z > 1.5) {
                anomalies.push({
                    category,
                    z,
                    current,
                    mean,
                    severity: z > 2.5 ? "critical" : "warning",
                });
            }
        });
        anomalies.sort((a, b) => b.z - a.z);

        // ── 5. Concentração de despesas ──
        const catCurrentMonth = Array.from(catExpense.entries())
            .map(([name, m]) => ({ name, value: m[5] }))
            .filter(c => c.value > 0)
            .sort((a, b) => b.value - a.value);
        const catPrevMonth = Array.from(catExpense.entries())
            .map(([name, m]) => ({ name, value: m[4] }))
            .filter(c => c.value > 0)
            .sort((a, b) => b.value - a.value);

        const top2Current = catCurrentMonth.slice(0, 2);
        const top2Prev = catPrevMonth.slice(0, 2);
        const totalCurrentExp = catCurrentMonth.reduce((s, c) => s + c.value, 0);
        const totalPrevExp = catPrevMonth.reduce((s, c) => s + c.value, 0);
        const concentrationCurrent = totalCurrentExp > 0
            ? Math.round((top2Current.reduce((s, c) => s + c.value, 0) / totalCurrentExp) * 100)
            : 0;
        const concentrationPrev = totalPrevExp > 0
            ? Math.round((top2Prev.reduce((s, c) => s + c.value, 0) / totalPrevExp) * 100)
            : 0;

        // ── 6. Geração de alertas ──
        const alerts: DiagAlert[] = [];

        // Anomalias por categoria
        anomalies.forEach(a => {
            const monthLabel = format(now, "MMM", { locale: ptBR });
            const mean = a.mean > 0 ? ` vs média histórica ${fmtBRL(a.mean)}` : "";
            alerts.push({
                id: `anomaly-${a.category}`,
                severity: a.severity,
                title: `${a.category}: gasto atípico detectado`,
                body: `${fmtBRL(a.current)} em ${monthLabel}${mean} · ${a.z.toFixed(1)}σ acima do normal (mês em andamento: dia ${daysElapsed}/${daysInMonth})`,
            });
        });

        // Velocidade de gasto
        if (daysRemaining > 5 && Math.abs(velocityVsLastMonth) > 15) {
            const prevLabel = format(subMonths(now, 1), "MMM", { locale: ptBR });
            alerts.push({
                id: "velocity",
                severity: velocityVsLastMonth > 50 ? "critical" : "warning",
                title: "Ritmo de gasto acima do normal",
                body: `Projeção para o mês completo: ${fmtBRL(projectedExpense)} (${fmtPct(velocityVsLastMonth, true)} vs ${prevLabel} com ${fmtBRL(lastMonthExpense)}) · Baseado nos ${daysElapsed} dias decorridos`,
            });
        }

        // Comprometimento orçamentário
        if (commitPct > 85 && currentIncome > 0) {
            alerts.push({
                id: "budget",
                severity: commitPct > 100 ? "critical" : "warning",
                title: commitPct > 100 ? "Déficit: despesas superam receitas do mês" : "Alto comprometimento orçamentário",
                body: `${commitPct}% da receita (${fmtBRL(currentIncome)}) já comprometida em despesas (${fmtBRL(currentExpense)})`,
            });
        }

        // Concentração
        if (concentrationCurrent > 70 && top2Current.length === 2) {
            const names = top2Current.map(c => c.name).join(" e ");
            const delta = concentrationCurrent - concentrationPrev;
            alerts.push({
                id: "concentration",
                severity: "info",
                title: "Alta concentração de despesas",
                body: `${names} representam ${concentrationCurrent}% das despesas${delta > 5 ? ` (aumento de ${delta}pp vs mês anterior)` : ""}`,
            });
        }

        // Ordenar por severidade
        const order: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
        alerts.sort((a, b) => order[a.severity] - order[b.severity]);

        // ── 7. ETS Forecast ──
        // Treinar nos 5 meses completos (excluindo mês atual que está incompleto)
        const incomeHistory = buckets.slice(0, 5).map(b => b.income);
        const expenseHistory = buckets.slice(0, 5).map(b => b.expense);
        const projIncome = etsHolt(incomeHistory, 0.3, 0.1, 3);
        const projExpense = etsHolt(expenseHistory, 0.3, 0.1, 3);

        // Chart data: 6 meses históricos + 3 projetados
        // O mês atual é o ponto de conexão (ambos campos preenchidos)
        const chartData: ChartPoint[] = buckets.map((b, idx) => ({
            name: b.name,
            receitas: b.income,
            despesas: b.expense,
            projReceitas: idx === 5 ? b.income : null,
            projDespesas: idx === 5 ? b.expense : null,
            isProjected: false,
        }));

        projIncome.forEach((inc, i) => {
            const d = subMonths(now, -(i + 1));
            chartData.push({
                name: format(d, "MMM/yy", { locale: ptBR }),
                receitas: null,
                despesas: null,
                projReceitas: inc,
                projDespesas: projExpense[i],
                isProjected: true,
            });
        });

        return {
            alerts,
            anomalies,
            chartData,
            currentExpense,
            currentIncome,
            commitPct,
            isHealthy: currentExpense <= currentIncome,
            velocityVsLastMonth,
            projectedExpense,
            lastMonthExpense,
            daysElapsed,
            daysInMonth,
            concentrationCurrent,
            concentrationPrev,
            top2Current,
            currentMonthLabel: buckets[5].name,
            hasData: entries.length > 0,
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

    if (!analysis.hasData) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
                <Activity className="h-12 w-12 opacity-30" />
                <p className="text-base">Nenhum lançamento encontrado para gerar diagnóstico.</p>
            </div>
        );
    }

    const {
        alerts, chartData, currentExpense, currentIncome,
        commitPct, isHealthy, velocityVsLastMonth, projectedExpense,
        lastMonthExpense, daysElapsed, daysInMonth,
        concentrationCurrent, concentrationPrev, top2Current, currentMonthLabel,
    } = analysis;

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <div>
                <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-semibold text-slate-900">Diagnóstico Financeiro</h1>
                    <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 border-indigo-200">
                        <Sparkles className="h-3 w-3 mr-1" /> Beta
                    </Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                    Anomalias detectadas por Z-score · Projeção via ETS (Holt's Linear Smoothing) · Dia {daysElapsed}/{daysInMonth} do mês
                </p>
            </div>

            {/* PAINEL DE ALERTAS */}
            <Card className="rounded-3xl border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <LayoutList className="h-4 w-4 text-slate-500" />
                        Alertas & Anomalias
                        {alerts.length > 0 && (
                            <span className={`ml-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                                alerts.some(a => a.severity === "critical")
                                    ? "bg-red-100 text-red-700"
                                    : alerts.some(a => a.severity === "warning")
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-blue-100 text-blue-700"
                            }`}>
                                {alerts.length}
                            </span>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {alerts.length === 0 ? (
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border-l-4 border-l-emerald-500">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-emerald-800">Nenhuma anomalia detectada</p>
                                <p className="text-xs text-emerald-600 mt-0.5">
                                    Todos os indicadores estão dentro dos padrões históricos.
                                </p>
                            </div>
                        </div>
                    ) : (
                        alerts.map(alert => <AlertRow key={alert.id} alert={alert} />)
                    )}
                </CardContent>
            </Card>

            {/* MÉTRICAS */}
            <div className="grid gap-4 md:grid-cols-3">
                {/* Velocidade de Gasto */}
                <Card className="rounded-3xl border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                            <Gauge className="h-4 w-4" />
                            Velocidade de Gasto
                        </CardTitle>
                        <CardDescription className="text-xs">Projeção baseada no ritmo atual</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900 mb-1">
                            {fmtBRL(projectedExpense)}
                        </div>
                        <p className="text-xs text-slate-500 mb-3">projetado para o mês completo</p>
                        <div className={`flex items-center gap-1.5 text-sm font-medium ${
                            velocityVsLastMonth > 15 ? "text-orange-500"
                            : velocityVsLastMonth < -15 ? "text-emerald-600"
                            : "text-slate-500"
                        }`}>
                            {velocityVsLastMonth > 0
                                ? <TrendingUp className="h-4 w-4" />
                                : <TrendingDown className="h-4 w-4" />}
                            {fmtPct(velocityVsLastMonth, true)} vs mês anterior ({fmtBRL(lastMonthExpense)})
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                            Baseado em {daysElapsed} dias · Ritmo: {fmtBRL(Math.round(currentExpense / daysElapsed))}/dia
                        </p>
                    </CardContent>
                </Card>

                {/* Comprometimento Orçamentário */}
                <Card className="rounded-3xl border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                            {isHealthy
                                ? <TrendingUp className="h-4 w-4 text-emerald-500" />
                                : <TrendingDown className="h-4 w-4 text-red-500" />}
                            Comprometimento
                        </CardTitle>
                        <CardDescription className="text-xs">Despesa vs receita do mês atual</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-3xl font-bold mb-1 ${
                            commitPct > 100 ? "text-red-600"
                            : commitPct > 85 ? "text-orange-500"
                            : "text-emerald-600"
                        }`}>
                            {commitPct}%
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                            <div
                                className={`h-full rounded-full transition-all ${
                                    commitPct > 100 ? "bg-red-500"
                                    : commitPct > 85 ? "bg-orange-400"
                                    : "bg-emerald-500"
                                }`}
                                style={{ width: `${Math.min(commitPct, 100)}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-400">
                            Receita: {fmtBRL(currentIncome)}<br />
                            Despesa: {fmtBRL(currentExpense)}
                        </p>
                    </CardContent>
                </Card>

                {/* Concentração */}
                <Card className="rounded-3xl border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                            <Activity className="h-4 w-4 text-indigo-500" />
                            Concentração de Despesas
                        </CardTitle>
                        <CardDescription className="text-xs">Top 2 categorias vs total</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900 mb-1">{concentrationCurrent}%</div>
                        <div className={`flex items-center gap-1.5 text-xs font-medium mb-3 ${
                            concentrationCurrent > concentrationPrev ? "text-orange-500" : "text-slate-400"
                        }`}>
                            {concentrationCurrent > concentrationPrev
                                ? <TrendingUp className="h-3.5 w-3.5" />
                                : <TrendingDown className="h-3.5 w-3.5" />}
                            {concentrationCurrent > concentrationPrev ? "+" : ""}
                            {concentrationCurrent - concentrationPrev}pp vs mês anterior
                        </div>
                        {top2Current.map((cat, i) => (
                            <div key={cat.name} className="flex items-center justify-between text-xs mb-1">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className={`h-2 w-2 rounded-full shrink-0 ${i === 0 ? "bg-indigo-500" : "bg-indigo-300"}`} />
                                    <span className="text-slate-600 truncate">{cat.name}</span>
                                </div>
                                <span className="font-medium text-slate-700 shrink-0 ml-2">{fmtBRL(cat.value)}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {/* GRÁFICO ETS */}
            <Card className="rounded-3xl border-slate-200 shadow-sm">
                <CardHeader className="border-b bg-slate-50/50 pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-indigo-600" />
                                Fluxo Histórico + Projeção ETS
                            </CardTitle>
                            <p className="text-sm text-slate-500 mt-1">
                                6 meses reais · 3 meses projetados por Holt's Linear Exponential Smoothing (α=0.3, β=0.1)
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-500 shrink-0">
                            <div className="flex items-center gap-2">
                                <svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="#10b981" strokeWidth="2.5" /></svg>
                                Receitas reais
                            </div>
                            <div className="flex items-center gap-2">
                                <svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="#f87171" strokeWidth="2.5" /></svg>
                                Despesas reais
                            </div>
                            <div className="flex items-center gap-2">
                                <svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="#818cf8" strokeWidth="2" strokeDasharray="5 3" /></svg>
                                Projeção ETS
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <ResponsiveContainer width="100%" height={320}>
                        <ComposedChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />

                            <ReferenceArea x1={currentMonthLabel} fill="#eef2ff" fillOpacity={0.5} />
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
                            <Line type="monotone" dataKey="receitas" name="receitas"
                                stroke="#10b981" strokeWidth={3}
                                dot={{ r: 4, fill: "#fff", stroke: "#10b981", strokeWidth: 2 }}
                                activeDot={{ r: 6, fill: "#10b981", strokeWidth: 0 }}
                                connectNulls={false} />
                            <Line type="monotone" dataKey="despesas" name="despesas"
                                stroke="#f87171" strokeWidth={3}
                                dot={{ r: 4, fill: "#fff", stroke: "#f87171", strokeWidth: 2 }}
                                activeDot={{ r: 6, fill: "#f87171", strokeWidth: 0 }}
                                connectNulls={false} />

                            {/* Linhas tracejadas — projeção ETS */}
                            <Line type="monotone" dataKey="projReceitas" name="projReceitas"
                                stroke="#818cf8" strokeWidth={2} strokeDasharray="6 4" strokeOpacity={0.8}
                                dot={{ r: 3, fill: "#fff", stroke: "#818cf8", strokeWidth: 1.5 }}
                                activeDot={{ r: 5, fill: "#818cf8", strokeWidth: 0 }}
                                connectNulls={false} legendType="none" />
                            <Line type="monotone" dataKey="projDespesas" name="projDespesas"
                                stroke="#818cf8" strokeWidth={2} strokeDasharray="6 4" strokeOpacity={0.5}
                                dot={{ r: 3, fill: "#fff", stroke: "#818cf8", strokeWidth: 1.5 }}
                                activeDot={{ r: 5, fill: "#818cf8", strokeWidth: 0 }}
                                connectNulls={false} legendType="none" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
