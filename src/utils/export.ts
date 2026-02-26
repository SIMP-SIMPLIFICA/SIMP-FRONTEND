import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import type { FinanceEntry } from "@/pages/financeiro/types";

/**
 * Formata moeda para BRL (usado nas exportações)
 */
const formatBRL = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(cents / 100);
};

/**
 * Formata data no padrão brasileiro
 */
const formatDate = (isoString: string) => {
    return format(new Date(isoString), "dd/MM/yyyy");
};

/**
 * Exporta um array de FinanceEntry para um documento PDF profissional com AutoTable.
 */
export const exportToPDF = (
    entries: FinanceEntry[],
    workspaceName: string,
    summary: { income: number; expense: number; balance: number }
) => {
    const doc = new jsPDF("p", "pt", "A4");

    // Cabeçalho (Título e Data)
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text(`Relatório Financeiro Lançamentos`, 40, 40);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Empresa/Workspace: ${workspaceName}`, 40, 55);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy às HH:mm")}`, 40, 70);

    // Resumo Financeiro (WySiWyG dos Filtros)
    doc.setFontSize(12);
    doc.setTextColor(40);
    doc.text("Resumo do Período (Filtros Aplicados)", 40, 100);

    autoTable(doc, {
        startY: 110,
        head: [["Receitas", "Despesas", "Saldo Líquido"]],
        body: [[
            formatBRL(summary.income),
            formatBRL(summary.expense),
            formatBRL(summary.balance)
        ]],
        theme: "grid",
        headStyles: { fillColor: [50, 50, 50], textColor: 255 },
        styles: { fontSize: 10, halign: "center" },
        columnStyles: {
            0: { textColor: [16, 185, 129] }, // Emerald
            1: { textColor: [244, 63, 94] },  // Rose
            2: { textColor: summary.balance >= 0 ? [16, 185, 129] : [244, 63, 94], fontStyle: "bold" }
        }
    });

    // Tabela de Dados Principais
    const finalY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 150;

    const tableColumn = ["Data", "Descrição", "Categoria", "Tipo", "Valor"];
    const tableRows = entries.map((entry) => [
        formatDate(entry.occurredAt),
        entry.description,
        entry.categoryName || "Geral",
        entry.type === "INCOME" ? "Receita" : "Despesa",
        formatBRL(entry.amountCents)
    ]);

    autoTable(doc, {
        startY: finalY + 30,
        head: [tableColumn],
        body: tableRows,
        theme: "striped",
        headStyles: { fillColor: [10, 91, 196] }, // Azul Brand da SIMP
        styles: { fontSize: 9 },
        columnStyles: {
            4: { halign: "right" }
        }
    });

    // Salvar
    doc.save(`Relatorio_Financeiro_${format(new Date(), "yyyyMMdd")}.pdf`);
};

/**
 * Exporta um array de FinanceEntry para uma planilha formato Excel (.xlsx).
 */
export const exportToExcel = (
    entries: FinanceEntry[],
    workspaceName: string,
    summary: { income: number; expense: number; balance: number }
) => {
    // Configurar dados brutos
    const rawData: Record<string, string | number>[] = entries.map((e) => ({
        Data: formatDate(e.occurredAt),
        Descrição: e.description,
        Categoria: e.categoryName || "Geral",
        Tipo: e.type === "INCOME" ? "Receita" : "Despesa",
        "Valor (R$)": e.amountCents / 100 // Formato numérico para permitir SOMA() no excel
    }));

    // Adicionar LInhas em Branco como Respiro
    rawData.push({});
    rawData.push({});

    // Adicionar Rodapé de Resumo WySiWyG
    rawData.push({
        Data: "RESUMO DOS FILTROS",
        Descrição: "",
        Categoria: "",
        Tipo: "Total Receitas:",
        "Valor (R$)": summary.income / 100
    });
    rawData.push({
        Data: "",
        Descrição: "",
        Categoria: "",
        Tipo: "Total Despesas:",
        "Valor (R$)": summary.expense / 100
    });
    rawData.push({
        Data: "",
        Descrição: "",
        Categoria: "",
        Tipo: "Saldo Líquido:",
        "Valor (R$)": summary.balance / 100
    });

    // Criar planilha e workbook
    const worksheet = XLSX.utils.json_to_sheet(rawData);
    const workbook = XLSX.utils.book_new();

    // Formatar a coluna "Valor (R$)" (Coluna E -> índice 4) como Moeda
    const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:A1");
    for (let R = range.s.r; R <= range.e.r; ++R) {
        const cellRef = XLSX.utils.encode_cell({ c: 4, r: R });
        if (worksheet[cellRef] && worksheet[cellRef].t === "n") {
            worksheet[cellRef].z = '"R$ "#,##0.00';
        }
    }

    // Ajustar a largura das colunas
    worksheet["!cols"] = [
        { wch: 12 }, // Data
        { wch: 45 }, // Descrição
        { wch: 25 }, // Categoria
        { wch: 12 }, // Tipo
        { wch: 18 }  // Valor (R$)
    ];

    // Ajustar o Título da Aba
    XLSX.utils.book_append_sheet(workbook, worksheet, "Lançamentos");

    // Salvar
    const safeName = workspaceName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    XLSX.writeFile(workbook, `Relatorio_Financeiro_${safeName}_${format(new Date(), "yyyyMMdd")}.xlsx`);
};

/**
 * Exporta dados AGREGADOS (Tela de Relatórios) para Excel.
 */
export const exportAggregatedToExcel = (
    aggregatedData: { category: string; type: string; count: number; totalCents: number }[],
    workspaceName: string,
    periodName: string
) => {
    // Configurar dados brutos
    const rawData: Record<string, string | number>[] = aggregatedData.map((row) => ({
        "Categoria / Agrupamento": row.category,
        Tipo: row.type === "INCOME" ? "Receita" : "Despesa",
        "Volume Lançado": row.count,
        "Consolidado (R$)": row.totalCents / 100
    }));

    let income = 0;
    let expense = 0;
    aggregatedData.forEach(row => {
        if (row.type === "INCOME") income += row.totalCents;
        if (row.type === "EXPENSE") expense += row.totalCents;
    });
    const balance = income - expense;

    // Adicionar Espaço
    rawData.push({ "Categoria / Agrupamento": "" });
    rawData.push({ "Categoria / Agrupamento": "" });

    // Adicionar Totalizador
    rawData.push({
        "Categoria / Agrupamento": "SALDO LÍQUIDO DO PERÍODO:",
        Tipo: "",
        "Volume Lançado": "",
        "Consolidado (R$)": balance / 100
    });

    // Criar planilha e workbook
    const worksheet = XLSX.utils.json_to_sheet(rawData);
    const workbook = XLSX.utils.book_new();

    // Formatar a coluna "Consolidado (R$)" (Coluna D -> índice 3) como Moeda
    const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:A1");
    for (let R = range.s.r; R <= range.e.r; ++R) {
        const cellRef = XLSX.utils.encode_cell({ c: 3, r: R });
        if (worksheet[cellRef] && worksheet[cellRef].t === "n") {
            worksheet[cellRef].z = '"R$ "#,##0.00';
        }
    }

    // Ajustar a largura das colunas
    worksheet["!cols"] = [
        { wch: 35 }, // Categoria / Agrupamento
        { wch: 12 }, // Tipo
        { wch: 18 }, // Volume Lançado
        { wch: 20 }  // Consolidado (R$)
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Consolidado");

    const safeName = workspaceName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    XLSX.writeFile(workbook, `Resumo_Consolidado_${safeName}_${periodName === 'ALL' ? 'Geral' : periodName}.xlsx`);
};
