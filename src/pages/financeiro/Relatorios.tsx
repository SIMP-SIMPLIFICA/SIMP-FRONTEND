import { useMemo, useState } from "react";
import { Download, Filter, FileText, Frown } from "lucide-react";
import { toast } from "@/hooks/use-toast";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check } from "lucide-react";

import type { EntryType } from "./types";
import { useFinanceEntries } from "@/hooks/useFinance";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useParams } from "react-router-dom";
import { exportAggregatedToExcel } from "@/utils/export";

// --- HELPERS ---
function formatCurrency(cents: number): string {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(cents / 100);
}

// --- MAIN COMPONENT ---
export default function Relatorios() {
    const { workspaceId } = useParams();
    const { data: workspaces, isLoading: isLoadingWorkspaces } = useWorkspaces();
    const resolvedWorkspaceId = workspaceId || workspaces?.[0]?.id;
    const activeWorkspaceName = workspaces?.find((w: { id: string; name: string }) => w.id === resolvedWorkspaceId)?.name || "Resumo Financeiro";

    const { data: entriesData, isLoading: isLoadingEntries } = useFinanceEntries(resolvedWorkspaceId);
    const entries = entriesData || [];

    const availableMonths = useMemo(() => {
        return Array.from(
            new Set(
                entries.map((e) => {
                    const d = new Date(e.occurredAt);
                    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
                })
            )
        ).sort((a, b) => b.localeCompare(a)); // Newest first
    }, [entries]);

    const availableCategories = useMemo(() => {
        return Array.from(
            new Set(entries.map((e) => e.categoryName || "Geral"))
        ).sort((a, b) => a.localeCompare(b));
    }, [entries]);

    // Filters State
    const [filterMonth, setFilterMonth] = useState<string>("ALL");
    const [filterType, setFilterType] = useState<"ALL" | EntryType>("ALL");
    const [filterCategory, setFilterCategory] = useState<string[]>([]);
    const [openCategory, setOpenCategory] = useState(false);

    function handleExport() {
        if (aggregatedData.length === 0) {
            toast({ title: "Atenção", description: "Não há dados para exportar.", variant: "destructive" });
            return;
        }
        exportAggregatedToExcel(aggregatedData, activeWorkspaceName, filterMonth);
        toast({
            title: "Exportação Concluída",
            description: "O relatório consolidado foi salvo no seu computador.",
        });
    }

    // Process & Aggregate Data
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    const aggregatedData = useMemo(() => {
        // 1. Filter raw data
        let filtered = entries;
        if (filterMonth !== "ALL") {
            filtered = filtered.filter(e => e.occurredAt.startsWith(filterMonth));
        }
        if (filterType !== "ALL") {
            filtered = filtered.filter(e => e.type === filterType);
        }
        if (filterCategory.length > 0) {
            filtered = filtered.filter(e => filterCategory.includes(e.categoryName));
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
    }, [entries, filterMonth, filterType, filterCategory]);

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
    if (isLoadingWorkspaces || isLoadingEntries) {
        return <div className="p-8 text-center text-slate-500">Carregando relatórios...</div>;
    }

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

                <Popover open={openCategory} onOpenChange={setOpenCategory}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openCategory}
                            className="h-9 justify-between font-normal min-w-[180px]"
                        >
                            {filterCategory.length === 0
                                ? "Categorias (Todas)"
                                : `${filterCategory.length} selecionada(s)`}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0">
                        <Command>
                            <CommandInput placeholder="Buscar categoria..." />
                            <CommandList>
                                <CommandEmpty>Nenhuma categoria.</CommandEmpty>
                                <CommandGroup>
                                    <CommandItem
                                        onSelect={() => setFilterCategory([])}
                                    >
                                        <div className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary ${filterCategory.length === 0 ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"}`}>
                                            <Check className="h-4 w-4" />
                                        </div>
                                        Todas as Categorias
                                    </CommandItem>
                                    {availableCategories.map((c) => (
                                        <CommandItem
                                            key={c}
                                            value={c}
                                            onSelect={() => {
                                                setFilterCategory(prev =>
                                                    prev.includes(c)
                                                        ? prev.filter(item => item !== c)
                                                        : [...prev, c]
                                                );
                                            }}
                                        >
                                            <div className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary ${filterCategory.includes(c) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"}`}>
                                                <Check className="h-4 w-4" />
                                            </div>
                                            {c}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
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
