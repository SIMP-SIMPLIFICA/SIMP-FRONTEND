/**
 * Configuração do Cloudflare Turnstile.
 *
 * Separado de `TurnstileWidget.tsx` porque o ESLint (`react-refresh/only-export-components`)
 * exige que um arquivo de componente exporte apenas componentes — mesmo motivo da
 * extração de `lib/impersonation.ts` no Épico 2.
 */

export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

/**
 * `true` quando há site key configurada.
 *
 * Sem ela os formulários seguem funcionando normalmente — é o cenário de
 * desenvolvimento local, e espelha o backend, que também pula a verificação
 * quando `TURNSTILE_SECRET_KEY` não está definida.
 */
export const isTurnstileEnabled = Boolean(TURNSTILE_SITE_KEY);

/** Header em que o token é enviado ao backend. */
export const TURNSTILE_HEADER = "x-turnstile-token";

/**
 * Monta o header do Turnstile para uma requisição, ou `undefined` quando não há
 * token. Evita repetir o literal do header em cada formulário.
 */
export function turnstileHeaders(token: string | undefined): Record<string, string> | undefined {
  return token ? { [TURNSTILE_HEADER]: token } : undefined;
}
