import { api, apiRequest } from '../api'

/**
 * Controle de abastecimento de frota (Épico 3).
 *
 * Mesmo ciclo de vida das diárias: rascunho enquanto `sha256Hash` é nulo,
 * documento oficial e imutável depois da emissão.
 */

export interface FleetFuelingUser {
  id: string
  firstName?: string | null
  lastName?: string | null
}

export interface FleetFueling {
  id: string
  publicId: string
  organizationId: string
  createdById: string
  /** Sempre normalizada pelo backend: maiúsculas, sem hífen. */
  licensePlate: string
  odometer: number
  /** Strings vindas de Decimal do Prisma. */
  liters: string
  totalValue: string
  date: string
  sha256Hash: string | null
  issuedAt: string | null
  pdfFileKey: string | null
  createdAt: string
  updatedAt: string
  createdBy?: FleetFuelingUser
}

export interface CreateFleetFuelingDTO {
  licensePlate: string
  odometer: number
  liters: number
  totalValue: number
  date: string
}

export type UpdateFleetFuelingDTO = Partial<CreateFleetFuelingDTO>

export interface FleetFuelingListParams {
  page?: number
  limit?: number
  licensePlate?: string
  issued?: boolean
  startDate?: string
  endDate?: string
}

export interface PaginatedFleetFuelings {
  data: FleetFueling[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

const BASE = '/api/v1/fleet-fuelings'

function buildQuery(params?: FleetFuelingListParams): string {
  if (!params) return ''
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}

export function isIssued(fueling: FleetFueling): boolean {
  return Boolean(fueling.sha256Hash)
}

/**
 * Formata a placa para leitura humana: ABC1234 → ABC-1234.
 *
 * Só o formato antigo leva hífen; a placa Mercosul (ABC1D23) é escrita sem
 * separador. O banco guarda sempre normalizado — isto é apenas apresentação.
 */
export function formatLicensePlate(plate: string): string {
  return /^[A-Z]{3}\d{4}$/.test(plate) ? `${plate.slice(0, 3)}-${plate.slice(3)}` : plate
}

/** Preço por litro para exibição. O backend também o calcula na leitura. */
export function pricePerLiter(fueling: FleetFueling): number {
  const liters = Number(fueling.liters)
  if (!liters) return 0
  return Number(fueling.totalValue) / liters
}

export const fleetFuelingService = {
  list: (params?: FleetFuelingListParams) =>
    api.get<PaginatedFleetFuelings>(`${BASE}${buildQuery(params)}`).then(r => r.data),

  getById: (id: string) => api.get<FleetFueling>(`${BASE}/${id}`).then(r => r.data),

  create: (data: CreateFleetFuelingDTO) =>
    api.post<FleetFueling>(BASE, data).then(r => r.data),

  update: (id: string, data: UpdateFleetFuelingDTO) =>
    api.patch<FleetFueling>(`${BASE}/${id}`, data).then(r => r.data),

  remove: (id: string) => api.delete<void>(`${BASE}/${id}`).then(r => r.data),

  issue: (id: string) => api.post<FleetFueling>(`${BASE}/${id}/issue`, {}).then(r => r.data),

  downloadPdf: (id: string) =>
    apiRequest<Blob>(`${BASE}/${id}/pdf`, { method: 'GET', responseType: 'blob' }),
}
