import { useMemo, useState } from "react";
import { Download, Filter, FileText, Frown } from "lucide-react";
import { toast } from "@/hooks/use-toast";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableFooter,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { EntryType } from "./types";
import { mockEntries } from "./mock/entries";

// --- HELPERS ---
function formatCurrency(cents: number): string {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(cents / 100);
}

// Generate unique months from mock data for the select
const availableMonths = Array.from(
    new Set(
        mockEntries.map((e) => {
            const d = new Date(e.occurredAt);
            return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
        })
    )
).sort((a, b) => b.localeCompare(a)); // Newest first

// --- MAIN COMPONENT ---
export default function Relatorios() {
    // Filters State
    const [filterMonth, setFilterMonth] = useState<string>(availableMonths[0] || "ALL");
    const [filterType, setFilterType] = useState<"ALL" | EntryType>("ALL");
    const [filterCategory, setFilterCategory] = useState<string>("ALL");

    function handleExport() {
        toast({
            title: "Exportação Iniciada",
            description: "O relatório detalhado está sendo gerado e o download iniciará em breve.",
        });
    }

    // Process & Aggregate Data
    const aggregatedData = useMemo(() => {
        // 1. Filter raw data
        let filtered = mockEntries;
        if (filterMonth !== "ALL") {
            filtered = filtered.filter(e => e.occurredAt.startsWith(filterMonth));
        }
        if (filterType !== "ALL") {
            filtered = filtered.filter(e => e.type === filterType);
        }
        if (filterCategory !== "ALL") {
            filtered = filtered.filter(e => e.categoryName === filterCategory);
        }

        // 2. Reduce by Category & Type
        // A given Category might theoretically have both INCOME and EXPENSE, 
        // so we group by a compound key: "Category|Type"
        const groups = new Map<string, { category: string, type: EntryType, count: number, totalCents: number }>();

        filtered.forEach(e => {
            const key = `${e.categoryName}|${e.type}`;
            const existing = groups.get(key);
            if (existing) {
                existing.count += 1;
                existing.totalCents += e.amountCents;
            } else {
                groups.set(key, {
                    category: e.categoryName,
                    type: e.type,
                    count: 1,
                    totalCents: e.amountCents
                });
            }
        });

        // 3. Convert back to array and sort by value desc
        return Array.from(groups.values()).sort((a, b) => b.totalCents - a.totalCents);
    }, [filterMonth, filterType, filterCategory]);

    // Compute footer balance
    const aggregatedBalance = useMemo(() => {
        let income = 0;
        let expense = 0;
        aggregatedData.forEach(row => {
            if (row.type === "INCOME") income += row.totalCents;
            if (row.type === "EXPENSE") expense += row.totalCents;
        });
        return income - expense;
    }, [aggregatedData]);

    // --- RENDER ---
    return (
        <div className="space-y-6">
            {/* HEADER */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-3xl font-semibold text-slate-900">Relatórios Financeiros</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Resumos consolidados por período e categoria.
                    </p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
                    <Button variant="outline" className="h-11 rounded-2xl gap-2 border-slate-200" onClick={handleExport}>
                        <Download className="h-4 w-4 text-slate-600" />
                        <span className="text-slate-700">Exportar (CSV)</span>
                    </Button>
                </div>
            </div>

            {/* FILTERS TRAY */}
            <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-500 pr-2 border-r">
                    <Filter className="h-4 w-4" />
                    Filtros Gerais
                </div>

                <Select value={filterMonth} onValueChange={setFilterMonth}>
                    <SelectTrigger className="w-[140px] h-9">
                        <SelectValue placeholder="Período" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Todo Período</SelectItem>
                        {availableMonths.map(m => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={filterType} onValueChange={(v: "ALL" | EntryType) => setFilterType(v)}>
                    <SelectTrigger className="w-[140px] h-9">
                        <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Todos os Tipos</SelectItem>
                        <SelectItem value="EXPENSE">Despesas</SelectItem>
                        <SelectItem value="INCOME">Receitas</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-[180px] h-9">
                        <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Todas as Categorias</SelectItem>
                        <SelectItem value="Serviços">Serviços</SelectItem>
                        <SelectItem value="Fornecedores">Fornecedores</SelectItem>
                        <SelectItem value="Utilidades">Utilidades</SelectItem>
                        <SelectItem value="Vendas">Vendas</SelectItem>
                        <SelectItem value="Despesas Administrativas">Despesas Admin</SelectItem>
                        <SelectItem value="TI">TI</SelectItem>
                        <SelectItem value="Projetos">Projetos</SelectItem>
                        <SelectItem value="Manutenção">Manutenção</SelectItem>
                        <SelectItem value="Outros">Outros</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* REPORT TABLE */}
            <Card className="rounded-3xl border-slate-200 shadow-sm">
                <CardContent className="p-0">
                    <div className="overflow-hidden rounded-3xl">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50 hover:bg-slate-50 border-b-slate-200">
                                    <TableHead className="w-[40%] px-6 py-4 text-slate-600 font-semibold">Categoria / Agrupamento</TableHead>
                                    <TableHead className="w-[20%] text-center text-slate-600 font-semibold">Tipo</TableHead>
                                    <TableHead className="w-[20%] text-center text-slate-600 font-semibold">Volume Lançado</TableHead>
                                    <TableHead className="w-[20%] text-right px-6 text-slate-600 font-semibold">Total Consolidado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {aggregatedData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-48 text-center text-slate-500">
                                            <div className="flex flex-col items-center justify-center space-y-3">
                                                <div className="h-12 w-12 rounded-full bg-slate-100 grid place-items-center">
                                                    <Frown className="h-6 w-6 text-slate-400" />
                                                </div>
                                                <p>Nenhum dado financeiro encontrado para os filtros atuais.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    aggregatedData.map((row, i) => (
                                        <TableRow key={i} className="hover:bg-slate-50/50 transition-colors">
                                            <TableCell className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-md bg-slate-100 flex items-center justify-center">
                                                        <FileText className="h-4 w-4 text-slate-500" />
                                                    </div>
                                                    <span className="font-medium text-slate-900">{row.category}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge
                                                    variant="outline"
                                                    className={row.type === "INCOME" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}
                                                >
                                                    {row.type === "INCOME" ? "Receita" : "Despesa"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center text-slate-600">
                                                {row.count} {row.count === 1 ? 'item' : 'itens'}
                                            </TableCell>
                                            <TableCell className={`px-6 text-right font-semibold text-lg ${row.type === 'INCOME' ? 'text-emerald-600' : 'text-slate-900'}`}>
                                                {row.type === "EXPENSE" ? "- " : "+ "}
                                                {formatCurrency(row.totalCents)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                            {aggregatedData.length > 0 && (
                                <TableFooter className="bg-[#0A5BC4]/5">
                                    <TableRow>
                                        <TableCell colSpan={3} className="px-6 py-4 text-right font-semibold text-slate-700">
                                            SALDO LÍQUIDO DO PERÍODO
                                        </TableCell>
                                        <TableCell className={`px-6 py-4 text-right font-bold text-xl ${aggregatedBalance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                            {formatCurrency(aggregatedBalance)}
                                        </TableCell>
                                    </TableRow>
                                </TableFooter>
                            )}
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
