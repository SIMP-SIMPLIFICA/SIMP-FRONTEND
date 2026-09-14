/**
 * CNPJ: máscara para exibição e limpeza para envio.
 *
 * Espelho do utilitário do backend (`src/utils/cnpj.util.ts`). A API guarda e
 * devolve só dígitos — a máscara é apresentação, e mandá-la de volta criaria
 * dois registros do mesmo órgão.
 */

/** Só os dígitos. Devolve string vazia quando não há nada aproveitável. */
export function normalizeCnpj(raw: string | null | undefined): string {
  return (raw ?? '').replace(/\D/g, '').slice(0, 14)
}

/**
 * Forma com máscara: `11.222.333/0001-81`.
 *
 * Devolve string vazia para entrada incompleta: mostrar meio CNPJ é pior que
 * não mostrar nada, porque parece um número válido.
 */
export function formatCnpj(raw: string | null | undefined): string {
  const d = normalizeCnpj(raw)
  if (d.length !== 14) return ''
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

/**
 * Máscara progressiva, para aplicar a cada tecla digitada.
 *
 * Diferente de `formatCnpj`: aqui o número ainda está incompleto e precisa
 * aparecer assim mesmo, senão o campo ficaria em branco enquanto o usuário
 * digita.
 */
export function maskCnpjInput(raw: string): string {
  const d = normalizeCnpj(raw)

  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}
