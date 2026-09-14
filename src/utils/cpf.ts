/**
 * CPF: máscara para exibição e digitação, limpeza para envio.
 *
 * Espelho do utilitário do backend (`src/utils/cpf.util.ts`). O número
 * INTEIRO nunca chega do backend — a API já devolve mascarado
 * (`***.123.456-**`) mesmo para quem tem permissão de leitura. Por isso este
 * arquivo não tem uma função "desmascarar": não há o que desmascarar no
 * cliente, só o que o próprio usuário está digitando agora.
 */

/** Só os dígitos, até 11. */
export function normalizeCpf(raw: string | null | undefined): string {
  return (raw ?? '').replace(/\D/g, '').slice(0, 11)
}

/**
 * Máscara progressiva, para aplicar a cada tecla digitada.
 *
 * Só o CPF que o PRÓPRIO usuário está digitando passa por aqui — nunca o que
 * vem da API, que já chega mascarado de propósito.
 */
export function maskCpfInput(raw: string): string {
  const d = normalizeCpf(raw)

  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}
