import type { QueryClient } from "@tanstack/react-query";
import type { NavigateFunction } from "react-router-dom";
import { setAuthTokens, clearImpersonateRefreshToken } from "@/lib/auth";

/**
 * Estado da impersonação de organizações pelo Super Admin.
 *
 * Extraído de `pages/admin/AdminPanel.tsx`: exportar funções utilitárias no
 * mesmo arquivo de um componente quebra o Fast Refresh do Vite
 * (react-refresh/only-export-components).
 */

/** Preserva o access token do super admin durante a impersonação. */
export const PREV_ACCESS_KEY = "simp:impersonate:prev:access";
export const IMPERSONATE_ORG_KEY = "simp:impersonate:org";

export function isImpersonating(): boolean {
  return !!sessionStorage.getItem(PREV_ACCESS_KEY);
}

/**
 * Encerra a impersonação e restaura a sessão do super admin.
 *
 * O refreshToken do super admin nunca é tocado durante a impersonação (o
 * endpoint de impersonate não seta cookie), então continua válido na saída.
 */
export function exitImpersonation(queryClient: QueryClient, navigate: NavigateFunction) {
  const prevAccess = sessionStorage.getItem(PREV_ACCESS_KEY);
  if (!prevAccess) return;

  setAuthTokens(prevAccess);        // restaura o access token do super admin
  clearImpersonateRefreshToken();   // limpa o refresh token da sessão impersonada
  sessionStorage.removeItem(PREV_ACCESS_KEY);
  sessionStorage.removeItem(IMPERSONATE_ORG_KEY);
  queryClient.clear();
  navigate("/admin");
}
