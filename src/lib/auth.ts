// ─────────────────────────────────────────────────────────────────────────────
// Token storage strategy
//
//  accessToken           → JS module memory only. Cleared when the tab closes.
//                          Never written to localStorage / sessionStorage.
//
//  refreshToken          → httpOnly cookie (managed exclusively by the backend).
//                          JS cannot read it; the browser sends it automatically
//                          when fetch is called with credentials:'include'.
//
//  _impersonateRefreshToken → memory only, populated when a super-admin enters
//                          impersonation mode. The backend's impersonate endpoint
//                          returns the token in the response body because it
//                          cannot set a second httpOnly cookie from there.
//                          The api.ts refresh path sends this in the request body
//                          with credentials:'omit' so the super-admin's own
//                          httpOnly cookie is never exposed or overwritten.
// ─────────────────────────────────────────────────────────────────────────────

let _accessToken: string | null = null
let _impersonateRefreshToken: string | null = null

export function getAccessToken(): string | null {
  return _accessToken
}

export function setAccessToken(token: string): void {
  _accessToken = token
}

/**
 * Set the access token (always) and optionally the impersonation refresh token.
 * - Normal login / post-refresh: call with one arg → only _accessToken is updated.
 * - Impersonation start: call with two args → both are updated.
 * - Passing undefined as second arg is the same as omitting it (no-op on
 *   _impersonateRefreshToken), which is correct for normal refreshes where the
 *   backend does not return a body refreshToken.
 */
export function setAuthTokens(access: string, impersonateRefresh?: string): void {
  _accessToken = access
  if (impersonateRefresh !== undefined) {
    _impersonateRefreshToken = impersonateRefresh
  }
}

/**
 * Returns the in-memory impersonation refresh token when an impersonation
 * session is active; null otherwise.
 *
 * Used by api.ts to include this token in the request body during an
 * impersonation refresh (credentials:'omit'), bypassing the httpOnly cookie.
 */
export function getImpersonateRefreshToken(): string | null {
  return _impersonateRefreshToken
}

export function clearImpersonateRefreshToken(): void {
  _impersonateRefreshToken = null
}

export function clearAuth(): void {
  _accessToken = null
  _impersonateRefreshToken = null
}

// Kept as an alias — Sidebar logout handler and other callers use this name.
export const clearAccessToken = clearAuth

export function isAuthenticated(): boolean {
  return _accessToken !== null
}
