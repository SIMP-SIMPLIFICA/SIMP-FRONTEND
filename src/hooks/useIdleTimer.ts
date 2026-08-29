import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Expiração de sessão por inatividade (Épico 2, Task 2.2).
 *
 * Após 30 minutos sem interação, a sessão é encerrada: tokens e cache são
 * limpos e o usuário volta para o login. Nos 60 segundos finais é exibido um
 * aviso, para que ninguém perca trabalho em andamento sem chance de reagir.
 *
 * POR QUE OS TIMERS FICAM EM useRef E NÃO EM ESTADO:
 *   Guardar o instante da última atividade em estado dispararia um re-render a
 *   cada movimento de mouse — a tela inteira re-renderizaria dezenas de vezes
 *   por segundo. O ref muda sem provocar render; só o aviso final é estado.
 */

const MINUTE = 60 * 1000;

/** Tempo total de inatividade até o logout automático. */
export const IDLE_TIMEOUT_MS = 30 * MINUTE;

/** Antecedência do aviso "sua sessão vai expirar". */
export const WARNING_LEAD_TIME_MS = 1 * MINUTE;

/**
 * Eventos que contam como atividade.
 * `visibilitychange` entra para que voltar à aba conte como presença — sem ele,
 * quem deixa o SIMP aberto em outra aba durante uma reunião perde a sessão.
 */
const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "wheel",
  "visibilitychange",
] as const;

interface IdleTimerOptions {
  /** Executado ao esgotar o tempo — deve limpar tokens e redirecionar. */
  onExpire: () => void;
  /** Desliga o monitoramento (ex: usuário não autenticado). */
  enabled?: boolean;
  idleTimeoutMs?: number;
  warningLeadTimeMs?: number;
}

export function useIdleTimer({
  onExpire,
  enabled = true,
  idleTimeoutMs = IDLE_TIMEOUT_MS,
  warningLeadTimeMs = WARNING_LEAD_TIME_MS,
}: IdleTimerOptions) {
  const [isWarningVisible, setIsWarningVisible] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expirationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ref para o callback: assim o efeito de listeners não precisa recriar-se a
  // cada render só porque a função mudou de identidade. A atribuição vai num
  // efeito (e não no corpo do componente) porque escrever em ref durante o
  // render é acesso fora de hora — React pode descartar o render.
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  const clearTimers = useCallback(() => {
    if (warningTimer.current) clearTimeout(warningTimer.current);
    if (expirationTimer.current) clearTimeout(expirationTimer.current);
    if (countdownInterval.current) clearInterval(countdownInterval.current);
    warningTimer.current = null;
    expirationTimer.current = null;
    countdownInterval.current = null;
  }, []);

  /**
   * Apenas (re)agenda os timers, sem tocar em estado.
   *
   * Separado de `reset` porque a montagem precisa agendar sem chamar
   * setState: um setState síncrono dentro de efeito provoca render em cascata
   * (react-hooks/set-state-in-effect). Na montagem não há aviso na tela, então
   * não há o que limpar.
   */
  const scheduleTimers = useCallback(() => {
    clearTimers();

    if (!enabled) return;

    warningTimer.current = setTimeout(() => {
      setIsWarningVisible(true);
      setSecondsRemaining(Math.ceil(warningLeadTimeMs / 1000));

      countdownInterval.current = setInterval(() => {
        setSecondsRemaining(s => (s > 0 ? s - 1 : 0));
      }, 1000);
    }, idleTimeoutMs - warningLeadTimeMs);

    expirationTimer.current = setTimeout(() => {
      clearTimers();
      setIsWarningVisible(false);
      onExpireRef.current();
    }, idleTimeoutMs);
  }, [enabled, idleTimeoutMs, warningLeadTimeMs, clearTimers]);

  /** Reinicia a contagem e esconde o aviso — usado por interação e pelos botões. */
  const reset = useCallback(() => {
    setIsWarningVisible(false);
    scheduleTimers();
  }, [scheduleTimers]);

  useEffect(() => {
    if (!enabled) {
      // Sem setState aqui: o aviso exposto já é derivado de `enabled`
      // (ver o retorno do hook), então basta parar os timers.
      clearTimers();
      return;
    }

    scheduleTimers();

    // Enquanto o aviso está na tela, mover o mouse NÃO deve cancelá-lo: o
    // usuário precisa confirmar de forma consciente que continua ali. Sem isso,
    // o modal sumiria sozinho por um esbarrão no mouse e a contagem reiniciaria
    // sem ninguém de fato presente.
    const handleInteraction = () => {
      if (!isWarningVisible) reset();
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, handleInteraction, { passive: true });
    }

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, handleInteraction);
      }
      clearTimers();
    };
  }, [enabled, isWarningVisible, scheduleTimers, reset, clearTimers]);

  return {
    /**
     * O aviso de expiração iminente deve ser exibido?
     * Derivado de `enabled` para que desligar o monitoramento nunca deixe um
     * modal órfão na tela — e sem precisar de setState dentro de efeito.
     */
    isWarningVisible: enabled && isWarningVisible,
    /** Segundos restantes até o logout automático. */
    secondsRemaining,
    /** Continuar conectado — reinicia a contagem. */
    stayConnected: reset,
    /** Sair agora, sem esperar a contagem. */
    logoutNow: () => {
      clearTimers();
      setIsWarningVisible(false);
      onExpireRef.current();
    },
  };
}
