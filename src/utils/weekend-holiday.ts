import type { Holiday } from "@/lib/api/holidays";

/**
 * O período `[departureDate, returnDate]` (inclusive) toca sábado, domingo ou
 * um feriado cadastrado? (Épico 8, FR-021)
 *
 * Espelha `touchesWeekendOrHoliday` do backend — só para dar feedback
 * imediato na tela. A regra que vale de verdade é a do SERVIDOR, aplicada na
 * emissão (`issue()`); esta função nunca bloqueia nada sozinha.
 */
export function touchesWeekendOrHoliday(
  departureDate: string,
  returnDate: string,
  holidays: Pick<Holiday, "date">[]
): boolean {
  if (!departureDate || !returnDate) return false;

  const holidayDates = new Set(holidays.map(h => h.date.slice(0, 10)));

  const cursor = new Date(`${departureDate.slice(0, 10)}T00:00:00Z`);
  const end = new Date(`${returnDate.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime())) return false;

  while (cursor <= end) {
    const dayOfWeek = cursor.getUTCDay(); // 0 = domingo, 6 = sábado
    if (dayOfWeek === 0 || dayOfWeek === 6) return true;
    if (holidayDates.has(cursor.toISOString().slice(0, 10))) return true;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return false;
}
