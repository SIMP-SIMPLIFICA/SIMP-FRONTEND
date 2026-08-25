import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { AlertTriangle } from "lucide-react";
import { TURNSTILE_SITE_KEY, isTurnstileEnabled } from "@/lib/turnstile";

/**
 * Widget do Cloudflare Turnstile — verificação anti-bot invisível.
 *
 * O token produzido aqui NÃO é prova de nada por si só: quem controla o navegador
 * controla este componente. A prova é o backend trocar o token com a Cloudflare
 * (ver turnstile.service.ts). Este componente só obtém o token e o entrega ao
 * formulário.
 *
 * Tokens do Turnstile são de USO ÚNICO e expiram (~5 min). Por isso o widget é
 * resetado após cada submit — sem isso, uma segunda tentativa de login reenviaria
 * o mesmo token e receberia `timeout-or-duplicate` da Cloudflare, o que o usuário
 * veria como "falha na verificação" sem entender o motivo.
 */


export interface TurnstileWidgetHandle {
  /** Token atual, ou `undefined` se ainda não resolvido. */
  getToken: () => string | undefined;
  /** Descarta o token atual e pede um novo. Chamar após cada submit. */
  reset: () => void;
}

interface TurnstileWidgetProps {
  /** Recebe o token assim que a Cloudflare o emite. */
  onToken?: (token: string | undefined) => void;
  className?: string;
}

export const TurnstileWidget = forwardRef<TurnstileWidgetHandle, TurnstileWidgetProps>(
  function TurnstileWidget({ onToken, className }, ref) {
    const instanceRef = useRef<TurnstileInstance | null>(null);
    const tokenRef = useRef<string | undefined>(undefined);
    const [failed, setFailed] = useState(false);

    useImperativeHandle(ref, () => ({
      getToken: () => tokenRef.current,
      reset: () => {
        tokenRef.current = undefined;
        onToken?.(undefined);
        instanceRef.current?.reset();
      },
    }));

    if (!isTurnstileEnabled) return null;

    function handleToken(token: string) {
      tokenRef.current = token;
      setFailed(false);
      onToken?.(token);
    }

    function handleFailure() {
      tokenRef.current = undefined;
      setFailed(true);
      onToken?.(undefined);
    }

    return (
      <div className={className}>
        <Turnstile
          ref={instanceRef}
          siteKey={TURNSTILE_SITE_KEY as string}
          onSuccess={handleToken}
          onError={handleFailure}
          onExpire={handleFailure}
          options={{
            // "invisible" não renderiza caixa nenhuma; a Cloudflare só interrompe
            // com um desafio se a heurística dela achar necessário.
            size: "invisible",
            theme: "light",
            language: "pt-br",
            // Renova sozinho antes de expirar, para que um formulário aberto por
            // muito tempo não submeta com token vencido.
            refreshExpired: "auto",
          }}
        />

        {failed && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Não foi possível concluir a verificação de segurança. Recarregue a página.
          </p>
        )}
      </div>
    );
  },
);
