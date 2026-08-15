import { useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Loader2, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  useGovBrSigningReturn,
  GOVBR_RETURN_PATH_KEY,
} from '@/hooks/useGovBrSigning'

export default function CouncilSignReturnPage() {
  const [searchParams] = useSearchParams()
  const navigate       = useNavigate()

  const { requestId, query, clearSession } = useGovBrSigningReturn(searchParams)

  // Capture returnPath once on mount — sessionStorage will be cleared later
  const returnPath = useRef(
    sessionStorage.getItem(GOVBR_RETURN_PATH_KEY) ?? '/conselhos',
  ).current

  const errorParam = searchParams.get('error')
  const status     = query.data?.status

  // Terminal states: clear sessionStorage so a refresh doesn't re-poll
  useEffect(() => {
    if (status && status !== 'PENDENTE') {
      clearSession()
      sessionStorage.removeItem(GOVBR_RETURN_PATH_KEY)
    }
  }, [status, clearSession])

  // ── Derived state ──────────────────────────────────────────────────────────

  // No requestId at all → backend sent error=NO_REQUEST
  const noRequest = !requestId && !!errorParam

  const isPending = !!requestId && (!status || status === 'PENDENTE') && !noRequest
  const isSuccess = status === 'ASSINADO'
  const isError   = status === 'FALHOU' || status === 'EXPIRADO' || noRequest

  const errorMessage =
    query.data?.errorMsg ??
    (errorParam === 'NO_REQUEST'
      ? 'Solicitação de assinatura não encontrada.'
      : 'Ocorreu um erro durante o processo de assinatura.')

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 flex flex-col items-center gap-6 text-center">

          {/* ── Pending / loading ── */}
          {isPending && (
            <>
              <div className="h-16 w-16 rounded-full bg-violet-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-violet-600 animate-spin" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900 mb-1">
                  Aguardando confirmação do Gov.br
                </h1>
                <p className="text-sm text-slate-500">
                  Verificando o resultado da assinatura digital...
                </p>
              </div>
            </>
          )}

          {/* ── Success ── */}
          {isSuccess && (
            <>
              <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900 mb-1">
                  Documento assinado com sucesso!
                </h1>
                <p className="text-sm text-slate-500">
                  A assinatura digital foi registrada e o documento foi validado pelo Gov.br.
                </p>
              </div>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => navigate(returnPath)}
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar para a Reunião
              </Button>
            </>
          )}

          {/* ── Error ── */}
          {isError && (
            <>
              <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900 mb-1">
                  Falha na assinatura
                </h1>
                <p className="text-sm text-slate-500">{errorMessage}</p>
              </div>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => navigate(returnPath)}
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar para a Reunião
              </Button>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
