import { differenceInCalendarDays } from "date-fns";

/**
 * Faixas de alerta de vencimento de processo virtual.
 *
 * Fonte ÚNICA das regras — listagem, detalhe e qualquer tela futura devem
 * consumir daqui, para que não divirjam (mesmo motivo da consolidação de
 * TASK_STATUS_LABELS no Épico 2).
 */
export type ExpiryLevel =
  | "expired"   // já venceu — o caso mais grave
  | "critical"  // 3, 2, 1 ou 0 dias
  | "urgent"    // até 7 dias
  | "attention" // até 15 dias
  | "notice"    // até 30 dias
  | "none";     // mais de 30 dias, ou sem data

export interface ExpiryAlert {
  level: ExpiryLevel;
  /** Dias de calendário até o vencimento. Negativo = vencido. `null` sem data. */
  days: number | null;
  /** Rótulo pronto para exibição. `null` quando não há alerta a mostrar. */
  label: string | null;
  /** Classes Tailwind do badge. `null` quando não há alerta. */
  className: string | null;
}

const NO_ALERT: ExpiryAlert = { level: "none", days: null, label: null, className: null };

/**
 * Calcula a faixa de alerta para uma data de validade.
 *
 * Usa differenceInCalendarDays (não subtração de milissegundos) de propósito:
 * a diferença bruta faria um processo que vence amanhã às 09h ser exibido como
 * "vence hoje" quando consultado hoje às 14h (faltam 19h → 0 dias inteiros).
 * Comparando DIAS DE CALENDÁRIO, "amanhã" é sempre 1, qualquer que seja a hora
 * da consulta — que é o que mantém a faixa estável ao longo do dia.
 */
export function getExpiryAlert(validityDate: string | Date | null | undefined): ExpiryAlert {
  if (!validityDate) return NO_ALERT;

  const target = validityDate instanceof Date ? validityDate : new Date(validityDate);
  if (Number.isNaN(target.getTime())) return NO_ALERT;

  const days = differenceInCalendarDays(target, new Date());

  // Avaliado da faixa MAIS GRAVE para a menos grave. O crítico é `days <= 3`
  // (não `=== 3`), o que cobre 3, 2, 1 e 0 de forma contínua, sem buraco.
  if (days < 0) {
    const overdue = Math.abs(days);
    return {
      level: "expired",
      days,
      label: overdue === 1 ? "Vencido há 1 dia" : `Vencido há ${overdue} dias`,
      className: "bg-red-600 text-white",
    };
  }

  if (days <= 3) {
    return {
      level: "critical",
      days,
      label: days === 0 ? "Vence hoje" : days === 1 ? "Vence amanhã" : `Vence em ${days} dias`,
      className: "bg-red-100 text-red-700 border border-red-300",
    };
  }

  if (days <= 7) {
    return { level: "urgent", days, label: `Vence em ${days} dias`, className: "bg-orange-100 text-orange-700" };
  }

  if (days <= 15) {
    return { level: "attention", days, label: `Vence em ${days} dias`, className: "bg-amber-100 text-amber-700" };
  }

  if (days <= 30) {
    return { level: "notice", days, label: `Vence em ${days} dias`, className: "bg-yellow-50 text-yellow-700" };
  }

  // Mais de 30 dias: sem alerta, mas os dias seguem disponíveis para quem quiser.
  return { ...NO_ALERT, days };
}

/** Janela padrão do atalho "Quase Vencendo" — a faixa mais externa. */
export const EXPIRING_SOON_DAYS = 30;
