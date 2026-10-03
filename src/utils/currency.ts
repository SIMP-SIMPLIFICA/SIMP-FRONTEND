/**
 * Valores monetários em pt-BR: formatar para exibição, interpretar a digitação.
 *
 * Usado pela edição em linha do QDD — a tela mostra "R$ 1.234,56" e o servidor
 * recebe o número puro. Ficar sem esse par faria o problema clássico de
 * dotação orçamentária: um "1.234,56" salvo como `1234` ou `1.23456`.
 */

const formatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

/** `1234.56` → `"R$ 1.234,56"`. `null`/`undefined` viram travessão. */
export function formatBRL(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  const num = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(num)) return '—'
  return formatter.format(num)
}

/**
 * Interpreta o que o usuário digitou, aceitando os dois formatos comuns:
 * `1.234,56` (pt-BR, com separador de milhar) e `1234.56` (ponto decimal cru,
 * como quem copia de uma planilha ou de outro sistema).
 *
 * Devolve `null` para entrada vazia ou não numérica — nunca `NaN`, que se
 * propagaria em silêncio pelos cálculos seguintes.
 */
export function parseBRL(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  // Tem vírgula: é pt-BR. O ponto, se houver, é separador de milhar e some;
  // a vírgula vira o ponto decimal.
  const normalized = trimmed.includes(',')
    ? trimmed.replace(/\./g, '').replace(',', '.')
    : trimmed

  const num = Number(normalized.replace(/[^\d.-]/g, ''))
  return Number.isFinite(num) ? num : null
}
