import { api } from '../api'
import type { FleetCnhCategory, FleetCnhStatus, FleetFuelType, FleetUserRef, FleetVehicleStatus, FleetVehicleType, Paginated } from './fleet'

/**
 * Simplifica Frotas — contratos de combustível e autorização de abastecimento
 * (TASK 3A). Rotas em /api/v1/fleet. Decimal chega e vai como string; litros ×
 * preço oficial é sempre o do servidor (D2).
 */

const BASE = '/api/v1/fleet'

/** Combustível de bomba (o que uma autorização e um contrato liberam). */
export type AuthorizableFuel = 'GASOLINA' | 'ETANOL' | 'DIESEL_S10' | 'DIESEL_S500' | 'GNV'
export const AUTHORIZABLE_FUELS: AuthorizableFuel[] = ['GASOLINA', 'ETANOL', 'DIESEL_S10', 'DIESEL_S500', 'GNV']

export type FuelingStatus = 'PENDING' | 'ISSUED'
export type FuelingLifecycle = 'OPEN' | 'IN_USE' | 'AWAITING_REVIEW' | 'USED' | 'CLOSED' | 'EXPIRED' | 'BLOCKED' | 'CANCELLED'

export const LIFECYCLE_LABELS: Record<FuelingLifecycle, string> = {
  OPEN: 'Aberta',
  IN_USE: 'Em uso no posto',
  AWAITING_REVIEW: 'Aguardando conferência',
  USED: 'Usada',
  CLOSED: 'Fechada',
  EXPIRED: 'Vencida',
  BLOCKED: 'Bloqueada',
  CANCELLED: 'Cancelada',
}

export type CnhRequirement = 'A' | 'B' | 'C' | 'D' | 'E' | null

export interface FuelingWarning {
  code: 'TANK_CAPACITY_EXCEEDED' | 'OPEN_AUTHORIZATION_EXISTS' | 'CNH_EXPIRES_BEFORE_VALIDITY' | 'CNH_CATEGORY_UNCHECKED' | 'BUDGET_OVERRUN'
  message: string
}

export interface FleetContract {
  id: string
  number: string
  supplierName: string
  supplierCnpj: string
  object: string
  fuelType: AuthorizableFuel
  unitPrice: string
  totalAmount: string
  maxVolumeL: string | null
  commitmentNumber: string | null
  qddItemId: string | null
  qddItem: { id: string; ficha: string; fonte: string; naturezaDespesa: string } | null
  /** AAAA-MM-DD */
  startDate: string
  endDate: string
  inForce: boolean
  committedAmount: string
  availableAmount: string
  committedVolumeL: string
  availableVolumeL: string | null
  createdBy: FleetUserRef | null
  createdAt: string
  updatedAt: string
}

export interface ContractInput {
  number: string
  supplierName: string
  supplierCnpj: string
  object: string
  fuelType: AuthorizableFuel
  unitPrice: string
  totalAmount: string
  maxVolumeL?: string | null
  commitmentNumber?: string | null
  startDate: string
  endDate: string
}

export interface FleetFueling {
  id: string
  publicId: string
  formattedNumber: string | null
  status: FuelingStatus
  lifecycle: FuelingLifecycle
  departmentId: string
  vehicleId: string
  driverId: string
  contractId: string | null
  qddItemId: string | null
  qddFichaSnapshot: string | null
  qddFonteSnapshot: string | null
  qddNaturezaSnapshot: string | null
  fuelType: AuthorizableFuel
  maxVolumeL: string
  maxAmount: string
  unitPriceCap: string
  validUntil: string
  /** AAAA-MM-DD (dia local da validade; vale até 23:59). */
  validUntilDate: string
  purpose: string
  plateAttempts: number
  budgetOverrun: boolean
  cancelReason: string | null
  cancelledAt: string | null
  sha256Hash: string | null
  issuedAt: string | null
  createdAt: string
  updatedAt: string
  isExpired: boolean
  department: { id: string; name: string; code: string }
  vehicle: { id: string; plate: string; makeModel: string | null; vehicleType: FleetVehicleType; fuelType: FleetFuelType; tankCapacityL: string; assetTag: string | null }
  driver: { id: string; name: string; cnhCategory: FleetCnhCategory; cnhExpiry: string }
  contract: { id: string; number: string; supplierName: string; supplierCnpj: string; unitPrice: string | null; endDate: string } | null
  qddItem: { id: string; ficha: string; fonte: string; naturezaDespesa: string } | null
  createdBy: FleetUserRef | null
  issuedBy: FleetUserRef | null
  cancelledBy: FleetUserRef | null
  redemption: {
    mode: 'MANUAL' | 'PHOTO_ONLY'
    volumeL: string | null
    unitPrice: string | null
    totalAmount: string | null
    odometerKm: number | null
    submittedAt: string
    reviewedAt: string | null
  } | null
  warnings: FuelingWarning[]
}

export interface FuelingInput {
  departmentId: string
  vehicleId: string
  driverId: string
  fuelType: AuthorizableFuel
  contractId: string | null
  qddItemId: string | null
  unitPriceCap: string
  maxVolumeL: string | null
  maxAmount: string | null
  validUntil: string
  purpose: string
}

export interface FuelingOptions {
  defaultValidUntil: string
  vehicles: Array<{
    id: string
    plate: string
    makeModel: string | null
    vehicleType: FleetVehicleType
    fuelType: FleetFuelType
    tankCapacityL: string
    status: FleetVehicleStatus
    assetTag: string | null
    departmentId: string | null
    compatibleFuels: AuthorizableFuel[]
    requiredCnhCategory: CnhRequirement
    unavailableReason: string | null
  }>
  drivers: Array<{
    id: string
    name: string
    cnhCategory: FleetCnhCategory
    cnhExpiry: string
    cnhStatus: FleetCnhStatus
    departmentId: string | null
    ineligibleReason: string | null
  }>
  contracts: Array<{
    id: string
    number: string
    supplierName: string
    fuelType: AuthorizableFuel
    unitPrice: string | null
    totalAmount: string
    endDate: string
    availableAmount: string
  }>
  qddItems: Array<{ id: string; ficha: string; fonte: string; naturezaDespesa: string; projetoAtividade: string; saldoRestante: string | null }>
}

export interface FuelingSuggestions {
  compatibleFuels: AuthorizableFuel[]
  suggestedFuelType: AuthorizableFuel | null
  suggestedContractId: string | null
  suggestedUnitPrice: string | null
  habitualDriverId: string | null
  tankCapacityL: string
  openAuthorization: FuelingWarning | null
  recentPurposes: string[]
}

export interface FuelingListParams {
  status?: FuelingStatus
  lifecycle?: FuelingLifecycle
  departmentId?: string
  search?: string
  from?: string
  to?: string
  page?: number
  /** Máximo 100 (teto do backend). */
  limit?: number
}

export interface ContractListParams {
  search?: string
  fuelType?: AuthorizableFuel
  inForce?: boolean
  page?: number
  limit?: number
}

/** Id de rota sempre codificado no caminho (useParams decodifica %2F). */
const seg = (id: string) => encodeURIComponent(id)

function query(params: object = {}): string {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') qs.set(key, String(value))
  }
  const s = qs.toString()
  return s ? `?${s}` : ''
}

export const fleetFuelingService = {
  listContracts: (params?: ContractListParams) =>
    api.get<Paginated<FleetContract>>(`${BASE}/contracts${query(params)}`).then(r => r.data),
  createContract: (data: ContractInput) => api.post<FleetContract>(`${BASE}/contracts`, data).then(r => r.data),
  updateContract: (id: string, data: Partial<ContractInput>) =>
    api.patch<FleetContract>(`${BASE}/contracts/${seg(id)}`, data).then(r => r.data),
  removeContract: (id: string) => api.delete<void>(`${BASE}/contracts/${seg(id)}`).then(r => r.data),

  list: (params?: FuelingListParams) =>
    api.get<Paginated<FleetFueling>>(`${BASE}/fuelings${query(params)}`).then(r => r.data),
  get: (id: string) => api.get<FleetFueling>(`${BASE}/fuelings/${seg(id)}`).then(r => r.data),
  departments: () =>
    api.get<{ data: Array<{ id: string; name: string; code: string }> }>(`${BASE}/fuelings/departments`).then(r => r.data),
  options: (departmentId: string) =>
    api.get<FuelingOptions>(`${BASE}/fuelings/options${query({ departmentId })}`).then(r => r.data),
  suggestions: (departmentId: string, vehicleId: string) =>
    api.get<FuelingSuggestions>(`${BASE}/fuelings/suggestions${query({ departmentId, vehicleId })}`).then(r => r.data),
  create: (data: FuelingInput) => api.post<FleetFueling>(`${BASE}/fuelings`, data).then(r => r.data),
  update: (id: string, data: Partial<FuelingInput>) =>
    api.patch<FleetFueling>(`${BASE}/fuelings/${seg(id)}`, data).then(r => r.data),
  remove: (id: string) => api.delete<void>(`${BASE}/fuelings/${seg(id)}`).then(r => r.data),
  issue: (id: string) => api.post<FleetFueling>(`${BASE}/fuelings/${seg(id)}/issue`, {}).then(r => r.data),
  cancel: (id: string, reason: string) =>
    api.post<FleetFueling>(`${BASE}/fuelings/${seg(id)}/cancel`, { reason }).then(r => r.data),
  /** PDF original (com o QR operacional). O download é auditado no servidor. */
  downloadPdf: (id: string) =>
    api.get<Blob>(`${BASE}/fuelings/${seg(id)}/pdf`, { responseType: 'blob' }).then(r => r.data),
}
