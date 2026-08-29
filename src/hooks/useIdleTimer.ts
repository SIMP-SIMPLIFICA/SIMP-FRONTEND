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

const MINUTO = 60 * 1000;

/** Tempo total de inatividade até o logout automático. */
export const TEMPO_INATIVIDADE_MS = 30 * MINUTO;

/** Antecedência do aviso "sua sessão vai expirar". */
export const ANTECEDENCIA_AVISO_MS = 1 * MINUTO;

/**
 * Eventos que contam como atividade.
 * `visibilitychange` entra para que voltar à aba conte como presença — sem ele,
 * quem deixa o SIMP aberto em outra aba durante uma reunião perde a sessão.
 */
const EVENTOS_ATIVIDADE = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "wheel",
  "visibilitychange",
] as const;

interface OpcoesIdleTimer {
  /** Executado ao esgotar o tempo — deve limpar tokens e redirecionar. */
  aoExpirar: () => void;
  /** Desliga o monitoramento (ex: usuário não autenticado). */
  habilitado?: boolean;
  tempoInatividadeMs?: number;
  antecedenciaAvisoMs?: number;
}

export function useIdleTimer({
  aoExpirar,
  habilitado = true,
  tempoInatividadeMs = TEMPO_INATIVIDADE_MS,
  antecedenciaAvisoMs = ANTECEDENCIA_AVISO_MS,
}: OpcoesIdleTimer) {
  const [avisoVisivel, setAvisoVisivel] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(0);

  const timerAviso = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerExpiracao = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervaloContagem = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ref para o callback: assim o efeito de listeners não precisa recriar-se a
  // cada render só porque a função mudou de identidade. A atribuição vai num
  // efeito (e não no corpo do componente) porque escrever em ref durante o
  // render é acesso fora de hora — React pode descartar o render.
  const aoExpirarRef = useRef(aoExpirar);
  useEffect(() => {
    aoExpirarRef.current = aoExpirar;
  }, [aoExpirar]);

  const limparTimers = useCallback(() => {
    if (timerAviso.current) clearTimeout(timerAviso.current);
    if (timerExpiracao.current) clearTimeout(timerExpiracao.current);
    if (intervaloContagem.current) clearInterval(intervaloContagem.current);
    timerAviso.current = null;
    timerExpiracao.current = null;
    intervaloContagem.current = null;
  }, []);

  /**
   * Apenas (re)agenda os timers, sem tocar em estado.
   *
   * Separado de `reiniciar` porque a montagem precisa agendar sem chamar
   * setState: um setState síncrono dentro de efeito provoca render em cascata
   * (react-hooks/set-state-in-effect). Na montagem não há aviso na tela, então
   * não há o que limpar.
   */
  const agendarTimers = useCallback(() => {
    limparTimers();

    if (!habilitado) return;

    timerAviso.current = setTimeout(() => {
      setAvisoVisivel(true);
      setSegundosRestantes(Math.ceil(antecedenciaAvisoMs / 1000));

      intervaloContagem.current = setInterval(() => {
        setSegundosRestantes(s => (s > 0 ? s - 1 : 0));
      }, 1000);
    }, tempoInatividadeMs - antecedenciaAvisoMs);

    timerExpiracao.current = setTimeout(() => {
      limparTimers();
      setAvisoVisivel(false);
      aoExpirarRef.current();
    }, tempoInatividadeMs);
  }, [habilitado, tempoInatividadeMs, antecedenciaAvisoMs, limparTimers]);

  /** Reinicia a contagem e esconde o aviso — usado por interação e pelos botões. */
  const reiniciar = useCallback(() => {
    setAvisoVisivel(false);
    agendarTimers();
  }, [agendarTimers]);

  useEffect(() => {
    if (!habilitado) {
      // Sem setState aqui: o aviso exposto já é derivado de `habilitado`
      // (ver o retorno do hook), então basta parar os timers.
      limparTimers();
      return;
    }

    agendarTimers();

    // Enquanto o aviso está na tela, mover o mouse NÃO deve cancelá-lo: o
    // usuário precisa confirmar de forma consciente que continua ali. Sem isso,
    // o modal sumiria sozinho por um esbarrão no mouse e a contagem reiniciaria
    // sem ninguém de fato presente.
    const aoInteragir = () => {
      if (!avisoVisivel) reiniciar();
    };

    for (const evento of EVENTOS_ATIVIDADE) {
      window.addEventListener(evento, aoInteragir, { passive: true });
    }

    return () => {
      for (const evento of EVENTOS_ATIVIDADE) {
        window.removeEventListener(evento, aoInteragir);
      }
      limparTimers();
    };
  }, [habilitado, avisoVisivel, agendarTimers, reiniciar, limparTimers]);

  return {
    /**
     * O aviso de expiração iminente deve ser exibido?
     * Derivado de `habilitado` para que desligar o monitoramento nunca deixe um
     * modal órfão na tela — e sem precisar de setState dentro de efeito.
     */
    avisoVisivel: habilitado && avisoVisivel,
    /** Segundos restantes até o logout automático. */
    segundosRestantes,
    /** Continuar conectado — reinicia a contagem. */
    continuarConectado: reiniciar,
    /** Sair agora, sem esperar a contagem. */
    sairAgora: () => {
      limparTimers();
      setAvisoVisivel(false);
      aoExpirarRef.current();
    },
  };
}
