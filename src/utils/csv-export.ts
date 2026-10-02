/**
 * Exportação de tabelas para CSV, no navegador — sem lib nova.
 *
 * Genérico de propósito: nasceu com o Painel de Auditoria (FR-010/FR-011),
 * mas não depende de nada daquele domínio — qualquer tela que precise levar
 * um recorte filtrado para fora do sistema pode reaproveitar.
 */

export interface CsvColumn<T> {
  header: string
  /** Extrai o valor de uma linha; o retorno já deve estar pronto para exibição. */
  accessor: (row: T) => string | number | null | undefined
}

/** Sem isto, acentuação (ç, ã, é...) abre corrompida ao clicar duas vezes no arquivo no Excel pt-BR. */
const BOM = '﻿'

function escapeCsvField(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value)
  // Aspas, ponto e vírgula (delimitador usado aqui) ou quebra de linha exigem
  // envolver o campo em aspas duplas — regra do formato, não do Excel.
  if (/["\n\r;]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

/**
 * Monta o CSV como Blob — quem chama decide se baixa, anexa a um e-mail etc.
 *
 * `metaLines`: texto livre, uma linha por item, impresso ANTES do cabeçalho
 * de colunas — o uso pretendido é declarar os filtros ativos no momento da
 * exportação (FR-011). Sem isso, um recorte parcial abre indistinguível da
 * lista completa, o mesmo princípio já usado nos relatórios de Diárias.
 *
 * Delimitador `;` (não `,`): é o que o Excel em pt-BR espera para abrir em
 * colunas sem passar pelo assistente de importação — a vírgula ali é o
 * separador decimal.
 */
export function buildCsv<T>(
  rows: T[],
  columns: CsvColumn<T>[],
  metaLines: string[] = []
): Blob {
  const lines: string[] = []

  if (metaLines.length > 0) {
    for (const meta of metaLines) lines.push(escapeCsvField(meta))
    lines.push('') // linha em branco separando os metadados da tabela
  }

  lines.push(columns.map(c => escapeCsvField(c.header)).join(';'))
  for (const row of rows) {
    lines.push(columns.map(c => escapeCsvField(c.accessor(row))).join(';'))
  }

  return new Blob([BOM + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
}

/** Dispara o download no navegador a partir de um Blob já pronto. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = window.URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()

  // Libera a memória do object URL — sem isso o blob fica retido enquanto a
  // aba estiver aberta.
  window.URL.revokeObjectURL(url)
}

/** Atalho: monta e baixa em um só passo — o caso comum. */
export function exportCsv<T>(
  rows: T[],
  columns: CsvColumn<T>[],
  fileName: string,
  metaLines: string[] = []
): void {
  const safeName = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`
  downloadBlob(buildCsv(rows, columns, metaLines), safeName)
}
