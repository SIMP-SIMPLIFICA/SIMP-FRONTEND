import { useMemo } from "react";
import { Sparkles, Brain, TrendingUp, AlertCircle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { useFinanceEntries } from "@/hooks/useFinance";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import type { FinanceEntry } from "./types";

const forecastData = [
    { name: 'Nov', receitas: 150000000, despesas: 230000000 },
    { name: 'Dez', receitas: 110000000, despesas: 210000000 },
    { name: 'Jan', receitas: 140000000, despesas: 220000000 },
    { name: 'Fev (Atual)', receitas: 100000000, despesas: 200000000 },
    { name: 'Mar (Proj)', receitas: 60000000, despesas: 230000000 },
    { name: 'Abr (Proj)', receitas: 70000000, despesas: 240000000 },
    { name: 'Mai (Proj)', receitas: 50000000, despesas: 250000000 },
];

export default function Inteligencia() {
    const { workspaceId } = useParams();
    const { data: entriesData, isLoading } = useFinanceEntries(workspaceId, { limit: 1000 });
    const entries = entriesData || [];

    // --- COMPUTE INSIGHTS ---
    const { topCategoryName, topCategoryValue, isPositiveBalance } = useMemo(() => {
        let income = 0;
        let expense = 0;
        const catMap = new Map<string, number>();

        entries.forEach((e: FinanceEntry) => {
            if (e.type === "INCOME") {
                income += e.amountCents;
            } else {
                expense += e.amountCents;
                catMap.set(e.categoryName, (catMap.get(e.categoryName) || 0) + e.amountCents);
            }
        });

        // Find highest expense
        let topName = "N/A";
        let topVal = 0;
        catMap.forEach((v, k) => {
            if (v > topVal) {
                topVal = v;
                topName = k;
            }
        });

        return {
            topCategoryName: topName,
            topCategoryValue: topVal,
            isPositiveBalance: income >= expense
        };
    }, [entries]);

    const totalExpense = entries.filter((e: FinanceEntry) => e.type === "EXPENSE").reduce((acc: number, curr: FinanceEntry) => acc + curr.amountCents, 1);
    const topCategoryPercentage = Math.round((topCategoryValue / totalExpense) * 100);

    function formatValue(c: number) {
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c / 100);
    }

    // Chart Formatters
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-2xl">
                    <p className="text-sm font-semibold text-slate-800 mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center justify-between gap-6 text-xs font-medium mb-1">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className="text-slate-500 capitalize">{entry.name}:</span>
                            </div>
                            <span className="text-slate-900">{formatValue(entry.value)}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    // --- RENDER ---
    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center p-12 text-slate-500">
                <Loader2 className="h-6 w-6 animate-spin mr-3" />
                Analisando fluxo de caixa...
            </div>
        );
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* HEADER */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between shrink-0">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-semibold text-slate-900">Inteligência Financeira</h1>
                        <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-indigo-200">
                            <Sparkles className="h-3 w-3 mr-1" /> Beta
                        </Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                        Insights automáticos baseados no fluxo de caixa atual do município.
                    </p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* AUTOMATED INSIGHTS CARDS */}

                <Card className="rounded-3xl border-slate-200 shadow-sm border-l-4 border-l-orange-500 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                        <AlertCircle className="w-24 h-24" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-orange-500" /> Alerta de Gasto
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-800 font-medium mb-1">Cuidado com <span className="text-orange-600 font-bold">{topCategoryName}</span></p>
                        <p className="text-sm text-slate-600">
                            Esta categoria consumiu <strong className="text-slate-900">{formatValue(topCategoryValue)}</strong> do caixa, representando cerca de <strong className="text-orange-600">{topCategoryPercentage}%</strong> das despesas no período. É recomendada uma revisão dos contratos atuais.
                        </p>
                    </CardContent>
                </Card>

                <Card className={`rounded-3xl border-slate-200 shadow-sm border-l-4 overflow-hidden relative ${isPositiveBalance ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                        <TrendingUp className="w-24 h-24" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                            {isPositiveBalance
                                ? <><TrendingUp className="h-4 w-4 text-emerald-500" /> Oportunidade Financeira</>
                                : <><TrendingUp className="h-4 w-4 text-red-500" /> Risco de Déficit</>
                            }
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isPositiveBalance ? (
                            <>
                                <p className="text-slate-800 font-medium mb-1">Superávit Detectado</p>
                                <p className="text-sm text-slate-600">
                                    As receitas municipais superaram as despesas mapeadas no sistema. Considere reverter o saldo excedente em reservas de contenção ou novas licitações para serviços essenciais.
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="text-slate-800 font-medium mb-1">Déficit Mapeado</p>
                                <p className="text-sm text-slate-600">
                                    O volume das despesas está atualmente ultrapassando as receitas mapeadas. É recomendada a suspensão imediata de repasses na categoria <strong>{topCategoryName}</strong> para readequação orçamentária.
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card className="rounded-3xl border-slate-200 shadow-sm border-l-4 border-l-indigo-500 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                        <Brain className="w-32 h-32" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                            <Brain className="h-4 w-4 text-indigo-500" /> Análise de Padrão (Em Breve)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-800 font-medium mb-1">Detecção de Anomalias</p>
                        <p className="text-sm text-slate-600">
                            O módulo analítico preditivo ainda está coletando base histórica suficiente. Em breve, enviaremos relatórios quinzenais avaliando a saúde e legalidade do fluxo orçamentário.
                        </p>
                    </CardContent>
                </Card>

                {/* FORECAST CHART (Full Width) */}
                <Card className="rounded-3xl border-slate-200 shadow-sm md:col-span-2 lg:col-span-3 overflow-hidden">
                    <CardHeader className="border-b bg-slate-50/50 pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-indigo-600" />
                                    Projeção Orçamentária (6 Meses)
                                </CardTitle>
                                <p className="text-sm text-slate-500 mt-1">Modelo preditivo baseado no histórico de arrecadação e despesas fixas.</p>
                            </div>
                            <div className="flex gap-4 text-sm font-medium shrink-0">
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm"></div> Receitas Estimadas</div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-400 shadow-sm"></div> Despesas Estimadas</div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="w-full h-[280px] mt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={forecastData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f87171" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
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
                                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                                        tickFormatter={(val) => `R$ ${(val / 100000000).toFixed(1)}M`}
                                        dx={-10}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area
                                        type="monotone"
                                        dataKey="receitas"
                                        name="Receitas"
                                        stroke="#10b981"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorReceitas)"
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="despesas"
                                        name="Despesas"
                                        stroke="#f87171"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorDespesas)"
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
