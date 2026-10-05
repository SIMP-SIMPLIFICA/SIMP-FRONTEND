/** Data de calendário AAAA-MM-DD → DD/MM/AAAA, sem passar por fuso. */
export function formatIsoDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

/**
 * CNH vencida ou vencendo em até 30 dias, comparando datas de calendário (UTC).
 * Mesmo critério do destaque no PDF da relação de motoristas.
 */
export function cnhAlert(expiry: string, now = new Date()): 'vencida' | 'vencendo' | null {
  const today = now.toISOString().slice(0, 10)
  if (expiry < today) return 'vencida'
  const in30 = new Date(now.getTime() + 30 * 86_400_000).toISOString().slice(0, 10)
  return expiry <= in30 ? 'vencendo' : null
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))
}

/** "04/10/2026 17:30 por Maria Silva" (quem cadastrou/alterou). */
export function authorLine(at: string, by: { name: string } | null): string {
  return by ? `${formatDateTime(at)} por ${by.name}` : formatDateTime(at)
}

/** Data local AAAA-MM-DD para nome de arquivo exportado. */
export function todayForFileName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}
