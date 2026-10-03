/**
 * Restringe o `src` de uma <img> a esquemas que nunca disparam script:
 * `blob:` (prévias locais via `URL.createObjectURL`) e `http(s):` (logo
 * servida pelo backend). Rejeita `javascript:`, `data:`, `vbscript:`, `file:`
 * e qualquer outro esquema — mesmo sem um sink de innerHTML na página, uma
 * URL construída a partir de dado vindo do servidor (fileKey da logo) não
 * deveria alcançar um atributo de URL sem essa checagem de esquema.
 */
const ALLOWED_IMAGE_SCHEMES = new Set(['blob:', 'http:', 'https:']);

export function sanitizeImageSrc(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    // URL relativa (sem esquema, ex.: "/uploads/foo.png") resolve contra a
    // própria origem — esse caso é sempre seguro.
    const parsed = new URL(url, window.location.origin);
    return ALLOWED_IMAGE_SCHEMES.has(parsed.protocol) ? url : null;
  } catch {
    return null;
  }
}
