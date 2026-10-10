import type { FleetCnhCategory } from './api/fleet'
import type { CnhRequirement } from './api/fleet-fueling'

/**
 * Pré-visualização dos smart fields da autorização (TASK 7). Só para a TELA:
 * o valor oficial é o que o servidor calcula e devolve (D2). As contas usam
 * inteiros (BigInt em escala fixa), nunca float — "40 × 6,19" em ponto
 * flutuante dá 247,60000000000002.
 */

/** "40,5" / "40.5" → "40.5" (ou null se não for decimal positivo com até `scale` casas). */
export function parseDecimal(value: string, scale: number): string | null {
  let normalized = value.trim()
  if (normalized.includes(',')) normalized = normalized.replace(/\./g, '').replace(',', '.')
  if (!new RegExp(`^\\d+(\\.\\d{1,${scale}})?$`).test(normalized)) return null
  return /[1-9]/.test(normalized) ? normalized : null
}

function toScaled(decimal: string, scale: number): bigint {
  const [int, frac = ''] = decimal.split('.')
  return BigInt(int + frac.padEnd(scale, '0').slice(0, scale))
}

function fromScaled(value: bigint, scale: number): string {
  const negative = value < 0n
  const digits = (negative ? -value : value).toString().padStart(scale + 1, '0')
  const int = digits.slice(0, digits.length - scale)
  const frac = digits.slice(digits.length - scale)
  return `${negative ? '-' : ''}${int}${scale ? `.${frac}` : ''}`
}

/** Valor máximo = litros × preço, arredondado ao centavo (meio para cima). */
export function previewAmount(litres: string, unitPrice: string): string | null {
  const l = parseDecimal(litres, 3)
  const p = parseDecimal(unitPrice, 4)
  if (!l || !p) return null
  const product = toScaled(l, 3) * toScaled(p, 4) // escala 7
  const cents = (product + 50_000n) / 100_000n // escala 2, meio para cima
  return fromScaled(cents, 2)
}

/** Litros = valor ÷ preço, para baixo, em mililitros. */
export function previewLitres(amount: string, unitPrice: string): string | null {
  const a = parseDecimal(amount, 2)
  const p = parseDecimal(unitPrice, 4)
  if (!a || !p) return null
  // A = a·10², P = p·10⁴ → mililitros = a/p·10³ = A·10⁵ ÷ P (divisão inteira = para baixo).
  const millilitres = (toScaled(a, 2) * 100_000n) / toScaled(p, 4)
  return millilitres > 0n ? fromScaled(millilitres, 3) : null
}

/** a > b, os dois decimais em string. */
export function decimalGreaterThan(a: string, b: string): boolean {
  return toScaled(a, 4) > toScaled(b, 4)
}

const FOUR_WHEEL: Record<string, number> = { B: 1, C: 2, D: 3, E: 4 }

/** Mesma regra do backend (D16): A é independente; B < C < D < E são cumulativas. */
export function cnhCovers(held: FleetCnhCategory, required: CnhRequirement): boolean {
  if (!required) return true
  if (required === 'A') return held.startsWith('A')
  const fourWheel = held.replace('A', '')
  return Boolean(fourWheel) && FOUR_WHEEL[fourWheel] >= FOUR_WHEEL[required]
}

const BRL = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** "247.6" → "R$ 247,60" (apresentação). */
export function formatBrl(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  const [int, frac = ''] = value.split('.')
  const negative = int.startsWith('-')
  const grouped = BRL.format(Number(`${negative ? int.slice(1) : int}`)).split(',')[0]
  return `${negative ? '-' : ''}R$ ${grouped},${frac.padEnd(2, '0').slice(0, 2)}`
}

/** "40.000" → "40 L"; "16.155" → "16,155 L". */
export function formatLitres(value: string | null | undefined): string {
  if (!value) return '—'
  const [int, frac = ''] = value.split('.')
  const trimmed = frac.replace(/0+$/, '')
  return `${Number(int).toLocaleString('pt-BR')}${trimmed ? `,${trimmed}` : ''} L`
}

/** "6.19" → "R$ 6,190" (preço por litro, 3 casas como na bomba). */
export function formatUnitPrice(value: string | null | undefined): string {
  if (!value) return '—'
  const [int, frac = ''] = value.split('.')
  return `R$ ${int},${frac.padEnd(3, '0').slice(0, 4).replace(/(\d{3})0$/, '$1')}`
}
