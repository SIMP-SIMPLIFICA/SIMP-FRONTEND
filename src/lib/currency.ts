/**
 * Helpers de moeda (BRL) compartilhados.
 *
 * O padrão abaixo já estava duplicado em `UniversalFinanceModal.tsx`,
 * `CovenantFormDialog.tsx` e `EntryFormDialog.tsx`. Este módulo consolida a
 * quarta necessidade (Processos Virtuais) em vez de criar mais uma cópia; a
 * migração dos três arquivos existentes fica para quando cada um for tocado
 * (registrado como dívida em docs/TechStack.md).
 */

/**
 * Formata para exibição: 1500.5 → "R$ 1.500,50".
 *
 * Aceita string porque o `Decimal` do Prisma chega no JSON como string —
 * somar ou comparar sem converter produziria concatenação em vez de aritmética.
 */
export function formatCurrencyBRL(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  const num = Number(value)
  if (Number.isNaN(num)) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num)
}

/** Mantém apenas dígitos e vírgula enquanto o usuário digita. */
export function sanitizeCurrencyInput(raw: string): string {
  return raw.replace(/[^\d,]/g, '')
}

/** Formata o conteúdo do input ao sair do campo: "1500,5" → "1.500,50". */
export function formatCurrencyInput(raw: string): string {
  if (!raw) return ''
  const num = parseFloat(raw.replace(/\./g, '').replace(',', '.'))
  if (Number.isNaN(num)) return raw
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

/**
 * Converte o texto do input para número enviável à API: "1.500,50" → 1500.5.
 * Devolve `undefined` para vazio/inválido — nunca `NaN`, que viraria `null`
 * silencioso no JSON e apagaria o valor sem o usuário perceber.
 */
export function parseCurrencyInput(raw: string): number | undefined {
  if (!raw?.trim()) return undefined
  const n = parseFloat(raw.replace(/\./g, '').replace(',', '.'))
  return Number.isNaN(n) ? undefined : n
}
