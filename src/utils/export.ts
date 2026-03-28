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
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // --- CABEÇALHO BRANDED ---
    doc.setFillColor(10, 91, 196); // SIMP Blue
    doc.rect(0, 0, pageWidth, 5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("Relatório de Lançamentos", 40, 50);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Workspace: ${workspaceName}`, 40, 68);
    // [BUGFIX]: escape 'às' so it doesn't parse 's' as seconds
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, 40, 82);

    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(40, 95, pageWidth - 40, 95);

    // --- RESUMO FINANCEIRO ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("Consolidado do Período", 40, 125);

    autoTable(doc, {
        startY: 135,
        head: [["Total Receitas", "Total Despesas", "Saldo Líquido"]],
        body: [[
            formatBRL(summary.income),
            formatBRL(summary.expense),
            formatBRL(summary.balance)
        ]],
        theme: "plain",
        headStyles: { fillColor: [248, 250, 252], textColor: [100, 116, 139], fontStyle: "bold", halign: "center" },
        bodyStyles: { fontStyle: "bold", halign: "center", fontSize: 14 },
        columnStyles: {
            0: { textColor: [16, 185, 129] }, // emerald-500
            1: { textColor: [244, 63, 94] },  // rose-500
            2: { textColor: summary.balance >= 0 ? [16, 185, 129] : [244, 63, 94] }
        },
        styles: {
            cellPadding: 8,
            lineWidth: 1,
            lineColor: [226, 232, 240] // border-slate-200
        }
    });

    // --- TABELA DE LANÇAMENTOS ---
    const finalY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 190;

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
        headStyles: { fillColor: [10, 91, 196] }, // SIMP Blue
        styles: { fontSize: 9, cellPadding: 6 },
        alternateRowStyles: { fillColor: [248, 250, 252] }, // slate-50
        columnStyles: {
            0: { cellWidth: 70 },
            4: { halign: "right", fontStyle: "bold" }
        },
        willDrawCell: (data) => {
            // Apply RED for Expense values and GREEN for Income values dynamically in the table
            if (data.section === "body" && data.column.index === 4) {
                const tipo = entries[data.row.index].type;
                if (tipo === "EXPENSE") {
                    data.cell.styles.textColor = [244, 63, 94]; // Red
                } else {
                    data.cell.styles.textColor = [16, 185, 129]; // Emerald
                }
            }
        },
        didDrawPage: () => {
            // --- RODAPÉ COM PAGINAÇÃO ---
            const str = `Página ${doc.getNumberOfPages()}`;
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184); // slate-400
            doc.text(
                str,
                pageWidth - 40 - doc.getTextWidth(str),
                pageHeight - 30
            );
            doc.text(
                "Gerado por SIMP - Sistema Integrado de Municípios",
                40,
                pageHeight - 30
            );
        }
    });

    // --- SALVAR PDF ---
    const safeName = workspaceName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`SIMP_Relatorio_Financeiro_${safeName}_${format(new Date(), "yyyyMMdd")}.pdf`);
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
