/**
 * Normalização de texto compartilhada entre telas que mantêm pequenas
 * listas de cadastro livre (categorias, origens, etc.).
 *
 * Extraído de `pages/processos-virtuais/CategoryCombobox.tsx` — a mesma
 * regra também precisa valer no gerenciador de Configurações
 * (`pages/processos-virtuais/Configuracoes.tsx`), que é uma segunda porta
 * de entrada para criar categoria e não pode aplicar uma regra diferente
 * (achado de bug, 2026-09-24: "oBrAs" passava direto por ali e só o
 * servidor recusava, com erro cru em vez de um aviso amigável).
 */

/** "obras públicas" → "Obras Públicas". */
export function toTitleCase(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\b\p{L}/gu, c => c.toUpperCase());
}

/**
 * "  Recurso   Próprio  " → "Recurso Próprio". Limpa espaços sem mudar
 * capitalização — ao contrário de `toTitleCase`, que corromperia siglas
 * como "FPM"/"ICMS" (viraria "Fpm"/"Icms"). Usado em Origens do Recurso
 * (achado de bug, 2026-09-24): a comparação de duplicata continua sem
 * caixa em quem chama isto, então "fpm" ainda é pego como duplicata de
 * "FPM" — só o texto digitado não é reescrito.
 */
export function collapseWhitespace(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}
