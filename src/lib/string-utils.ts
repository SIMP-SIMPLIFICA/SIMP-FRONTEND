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
