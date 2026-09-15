import { api } from '../api'

/**
 * Feriados cadastráveis por organização (Épico 8, FR-020).
 *
 * Alimenta o alerta de fim de semana/feriado da Diária: sábado e domingo o
 * sistema já sabe sozinho, mas feriado municipal (padroeiro, aniversário da
 * cidade) só existe aqui — nenhuma biblioteca genérica cobre isso.
 */

export type HolidayScope = 'NATIONAL' | 'STATE' | 'MUNICIPAL'

export const HOLIDAY_SCOPE_LABELS: Record<HolidayScope, string> = {
  NATIONAL: 'Nacional',
  STATE: 'Estadual',
  MUNICIPAL: 'Municipal',
}

export interface Holiday {
  id: string
  organizationId: string
  /** Data pura (sem hora) — mesma convenção do backend (`@db.Date`). */
  date: string
  name: string
  scope: HolidayScope
  createdAt: string
}

export interface CreateHolidayDTO {
  date: string
  name: string
  scope?: HolidayScope
}

const BASE = '/holidays'

export const holidayService = {
  list: (params?: { year?: number }) => {
    const query = new URLSearchParams()
    if (params?.year) query.set('year', String(params.year))
    const qs = query.toString() ? `?${query.toString()}` : ''
    return api.get<Holiday[]>(`${BASE}${qs}`).then(r => r.data)
  },

  create: (data: CreateHolidayDTO) => api.post<Holiday>(BASE, data).then(r => r.data),

  remove: (id: string) => api.delete<void>(`${BASE}/${id}`).then(r => r.data),
}
