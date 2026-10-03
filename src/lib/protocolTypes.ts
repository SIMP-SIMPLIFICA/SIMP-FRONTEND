import type { DocumentCategory } from '@/lib/api/protocols'

/**
 * Tipos de documento oficial por categoria.
 *
 * EXTRAÍDO para um lugar único: a lista vivia dentro de GenerateProtocolModal, e
 * o modal de relatório precisa exatamente dela. Duas cópias divergiriam na
 * primeira vez que um tipo novo fosse criado — e o filtro do relatório passaria
 * a não oferecer um tipo que o sistema já emite.
 */

export const COMUNICACAO_TYPES = [
  'Ofício',
  'Ofício Circular',
  'Memorando',
  'CI',
  'Nota Informativa',
] as const

export const NORMATIVO_TYPES = [
  'Lei',
  'Decreto',
  'Portaria',
  'Edital',
  'Resolução',
  'Instrução Normativa',
] as const

export const ALL_PROTOCOL_TYPES: string[] = [...COMUNICACAO_TYPES, ...NORMATIVO_TYPES]

/** Tipos disponíveis para a categoria; todos quando nenhuma está selecionada. */
export function typesForCategory(category?: DocumentCategory | ''): string[] {
  if (category === 'COMUNICACAO') return [...COMUNICACAO_TYPES]
  if (category === 'NORMATIVO') return [...NORMATIVO_TYPES]
  return ALL_PROTOCOL_TYPES
}

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  COMUNICACAO: 'Comunicação',
  NORMATIVO: 'Normativo',
}
