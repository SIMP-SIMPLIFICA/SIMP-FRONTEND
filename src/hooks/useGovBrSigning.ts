import { useQuery, useQueryClient } from '@tanstack/react-query'
import { councilService } from '@/lib/api/councils'
import type { SignatureStatus } from '@/lib/api/councils'

const SESSION_KEY     = 'govbr_signature_id'
export const GOVBR_RETURN_PATH_KEY = 'govbr_return_path'

// ─── initiate ─────────────────────────────────────────────────────────────────
// Calls the backend, saves the requestId (and optional returnPath) in
// sessionStorage (survives the OAuth2 redirect), then navigates the browser
// to the gov.br SSO page.

export async function initiateGovBrSigning(
  documentId: string,
  returnPath?: string,
): Promise<void> {
  const { authorizationUrl, signatureRequestId } = await councilService.initiateSignature(documentId)
  sessionStorage.setItem(SESSION_KEY, signatureRequestId)
  if (returnPath) sessionStorage.setItem(GOVBR_RETURN_PATH_KEY, returnPath)
  window.location.href = authorizationUrl
}

// ─── useGovBrSigningStatus ────────────────────────────────────────────────────
// Polls GET /councils/sign/:requestId/status every 3 seconds while the status
// is PENDENTE. Stops automatically once a terminal status is reached.

export function useGovBrSigningStatus(requestId: string | null) {
  return useQuery({
    queryKey: ['signature-status', requestId],
    queryFn:  () => councilService.getSignatureStatus(requestId!),
    enabled:  !!requestId,
    refetchInterval: (query) => {
      const status: SignatureStatus | undefined = query.state.data?.status
      // Keep polling only while the signature is pending
      return status === 'PENDENTE' ? 3000 : false
    },
  })
}

// ─── useGovBrSigningReturn ────────────────────────────────────────────────────
// Used on the /councils/sign/return page to resume polling after the OAuth2
// redirect. Reads requestId from sessionStorage (set by initiateGovBrSigning)
// or from URL search params (?requestId=...) as a fallback.

export function useGovBrSigningReturn(searchParams: URLSearchParams) {
  const requestId =
    searchParams.get('requestId') ?? sessionStorage.getItem(SESSION_KEY)

  const query = useGovBrSigningStatus(requestId)
  const qc    = useQueryClient()

  const clearSession = () => {
    sessionStorage.removeItem(SESSION_KEY)
    if (requestId) {
      qc.invalidateQueries({ queryKey: ['signature-status', requestId] })
    }
  }

  return { requestId, query, clearSession }
}
