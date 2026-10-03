/**
 * Utilidades comuns às telas de documentos oficiais (Diárias e Frota).
 *
 * As duas telas têm o MESMO ciclo de vida — rascunho editável, emissão que
 * congela — e portanto os mesmos modos de falha. Concentrar aqui evita que as
 * mensagens divirjam entre uma tela e outra.
 */

/** Formato de erro que o backend devolve nas rotas do Épico 3. */
interface ApiErrorShape {
  error?: string
  message?: string
}

function asApiError(error: unknown): ApiErrorShape {
  return (error ?? {}) as ApiErrorShape
}

/**
 * Traduz o erro da API para uma mensagem em pt-BR.
 *
 * Os códigos vêm em inglês por serem contrato de máquina; o texto que o
 * servidor da prefeitura lê tem de estar no idioma dele. A mensagem do backend
 * é preferida quando existe — ela costuma ser mais específica que qualquer
 * texto genérico que possamos inventar aqui.
 */
export function describeDocumentError(error: unknown): string {
  const { error: code, message } = asApiError(error)

  switch (code) {
    case 'ALREADY_ISSUED':
      return (
        message ??
        'Este documento já foi emitido e não pode mais ser alterado. Registre um novo.'
      )
    case 'NOT_ISSUED':
      return message ?? 'Emita o documento antes de baixá-lo.'
    case 'INVALID_PLATE':
      return message ?? 'Placa inválida. Use o formato ABC1234 ou ABC1D23.'
    case 'INVALID_PERIOD':
      return message ?? 'A data de retorno não pode ser anterior à data de saída.'
    case 'MODULE_DISABLED':
      return 'Este módulo não está habilitado para a sua organização.'
    case 'NO_ORGANIZATION':
      return 'Seu usuário não está vinculado a uma organização.'
    case 'Forbidden':
      return 'Você não tem permissão para executar esta ação.'
    case 'VALIDATION_ERROR':
      return message ?? 'Verifique os campos preenchidos.'
    case 'NOT_FOUND':
      return message ?? 'Registro não encontrado.'
    default:
      return message ?? 'Não foi possível concluir a operação. Tente novamente.'
  }
}

/** O registro foi congelado pela emissão? Decide edição vs somente leitura. */
export function isAlreadyIssuedError(error: unknown): boolean {
  return asApiError(error).error === 'ALREADY_ISSUED'
}

/**
 * Entrega um PDF ao usuário a partir dos bytes recebidos.
 *
 * O download passa pelo cliente autenticado e não por um link direto: a rota do
 * PDF exige o token, então um `<a href>` simples receberia 401. Por isso os
 * bytes vêm por fetch e viram um object URL temporário aqui.
 */
export function savePdfBlob(blob: Blob, fileName: string): void {
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

// ─── Formatação (pt-BR, apenas apresentação) ─────────────────────────────────

export function formatCurrency(value: string | number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number(value) || 0
  )
}

export function formatNumber(value: string | number, decimals = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(value) || 0)
}

/**
 * Data em pt-BR.
 *
 * Usa UTC de propósito: o backend guarda a data do deslocamento sem hora, e
 * converter para o fuso local faria "10/09" virar "09/09" à noite.
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' }).format(date)
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

/** Converte ISO para o formato aceito por `<input type="date">`. */
export function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}
