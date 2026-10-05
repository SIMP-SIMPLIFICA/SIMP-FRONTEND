import { api } from '../api'

/**
 * Simplifica Frotas — cadastros (TASK 1/2). Rotas em /api/v1/fleet.
 *
 * Valores Decimal (litros, dinheiro) chegam como string e são enviados como
 * string: nenhuma conta em ponto flutuante viaja para o servidor. CPF e CNH só
 * chegam mascarados — a API nunca devolve o número inteiro.
 */

const BASE = '/api/v1/fleet'

export type FleetOwnership = 'PROPRIO' | 'LOCADO' | 'CEDIDO' | 'COMODATO'
export type FleetVehicleType =
  | 'AUTOMOVEL' | 'CAMINHONETE' | 'CAMIONETA' | 'UTILITARIO' | 'MOTOCICLETA' | 'MICROONIBUS'
  | 'ONIBUS' | 'CAMINHAO' | 'CAMINHAO_TRATOR' | 'REBOQUE' | 'MAQUINA' | 'OUTRO'
export type FleetFuelType = 'GASOLINA' | 'ETANOL' | 'FLEX' | 'DIESEL_S10' | 'DIESEL_S500' | 'GNV' | 'ELETRICO' | 'HIBRIDO'
export type FleetVehicleStatus = 'EM_USO' | 'RESERVA' | 'MANUTENCAO' | 'ACIDENTADO' | 'PARALISADO' | 'A_DOAR' | 'BAIXADO'
export type FleetCnhCategory = 'A' | 'B' | 'C' | 'D' | 'E' | 'AB' | 'AC' | 'AD' | 'AE'
export type FleetCnhStatus = 'REGULAR' | 'SUSPENSA' | 'CASSADA' | 'DESCONHECIDA'
export type FleetEmploymentKind = 'EFETIVO' | 'COMISSIONADO' | 'CONTRATADO' | 'TERCEIRIZADO'

export const OWNERSHIP_LABELS: Record<FleetOwnership, string> = {
  PROPRIO: 'Próprio', LOCADO: 'Locado', CEDIDO: 'Cedido', COMODATO: 'Comodato',
}
export const VEHICLE_TYPE_LABELS: Record<FleetVehicleType, string> = {
  AUTOMOVEL: 'Automóvel', CAMINHONETE: 'Caminhonete', CAMIONETA: 'Camioneta', UTILITARIO: 'Utilitário',
  MOTOCICLETA: 'Motocicleta', MICROONIBUS: 'Micro-ônibus', ONIBUS: 'Ônibus', CAMINHAO: 'Caminhão',
  CAMINHAO_TRATOR: 'Caminhão-trator', REBOQUE: 'Reboque', MAQUINA: 'Máquina', OUTRO: 'Outro',
}
export const FUEL_TYPE_LABELS: Record<FleetFuelType, string> = {
  GASOLINA: 'Gasolina', ETANOL: 'Etanol', FLEX: 'Flex', DIESEL_S10: 'Diesel S10', DIESEL_S500: 'Diesel S500',
  GNV: 'GNV', ELETRICO: 'Elétrico', HIBRIDO: 'Híbrido',
}
export const VEHICLE_STATUS_LABELS: Record<FleetVehicleStatus, string> = {
  EM_USO: 'Em uso', RESERVA: 'Reserva', MANUTENCAO: 'Em manutenção', ACIDENTADO: 'Acidentado',
  PARALISADO: 'Paralisado', A_DOAR: 'A doar', BAIXADO: 'Baixado',
}
export const CNH_STATUS_LABELS: Record<FleetCnhStatus, string> = {
  REGULAR: 'Regular', SUSPENSA: 'Suspensa', CASSADA: 'Cassada', DESCONHECIDA: 'Não verificada',
}
export const EMPLOYMENT_KIND_LABELS: Record<FleetEmploymentKind, string> = {
  EFETIVO: 'Efetivo', COMISSIONADO: 'Comissionado', CONTRATADO: 'Contratado', TERCEIRIZADO: 'Terceirizado',
}
export const CNH_CATEGORIES: FleetCnhCategory[] = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE']

interface DepartmentRef {
  id: string
  name: string
}

/** Autor de cadastro/alteração: só id e nome. */
export interface FleetUserRef {
  id: string
  name: string
}

export const WORK_REGIME_LABELS: Record<FleetVehicle['workRegime'], string> = {
  PADRAO_8H: 'Padrão (8h)', INTEGRAL_24H: 'Integral (24h)',
}

/** Vínculos em que a matrícula é obrigatória (mesma regra do backend). */
export const REGISTRATION_REQUIRED_KINDS: FleetEmploymentKind[] = ['EFETIVO', 'COMISSIONADO']

export interface FleetVehicle {
  id: string
  plate: string
  renavam: string | null
  chassis: string | null
  makeModel: string | null
  manufactureYear: number | null
  modelYear: number | null
  ownership: FleetOwnership
  vehicleType: FleetVehicleType
  fuelType: FleetFuelType
  usesArla32: boolean
  tankCapacityL: string
  referenceKmPerL: string | null
  workRegime: 'PADRAO_8H' | 'INTEGRAL_24H'
  status: FleetVehicleStatus
  odometerKm: number
  assetTag: string | null
  marketValue: string | null
  departmentId: string | null
  ownerEntityId: string | null
  department: DepartmentRef | null
  ownerEntity: DepartmentRef | null
  createdAt: string
  updatedAt: string
  createdBy: FleetUserRef | null
  updatedBy: FleetUserRef | null
}

export interface FleetDriver {
  id: string
  name: string
  registrationNumber: string | null
  cpfMasked: string
  cnhMasked: string
  cnhCategory: FleetCnhCategory
  /** AAAA-MM-DD */
  cnhExpiry: string
  cnhStatus: FleetCnhStatus
  employmentKind: FleetEmploymentKind
  active: boolean
  departmentId: string | null
  userId: string | null
  user: FleetUserRef | null
  department: DepartmentRef | null
  createdAt: string
  updatedAt: string
  createdBy: FleetUserRef | null
  updatedBy: FleetUserRef | null
}

export interface Paginated<T> {
  data: T[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export interface VehicleInput {
  plate: string
  renavam?: string | null
  chassis?: string | null
  makeModel?: string | null
  manufactureYear?: number | null
  modelYear?: number | null
  ownership: FleetOwnership
  vehicleType: FleetVehicleType
  fuelType: FleetFuelType
  tankCapacityL: string
  status?: FleetVehicleStatus
  assetTag?: string | null
  departmentId?: string | null
  odometerKm?: number
}

export interface DriverInput {
  name: string
  cpf: string
  cnhNumber: string
  cnhCategory: FleetCnhCategory
  cnhExpiry: string
  cnhStatus?: FleetCnhStatus
  employmentKind: FleetEmploymentKind
  /** Em branco: o servidor tenta a matrícula de Diárias (mesmo CPF). */
  registrationNumber?: string | null
  departmentId?: string | null
  active?: boolean
}

export interface VehicleListParams {
  search?: string
  status?: FleetVehicleStatus
  departmentId?: string
  page?: number
  /** Máximo 100 (teto do backend). */
  limit?: number
}

export interface DriverListParams {
  /** Só por nome. Para CPF use `lookupDriverByCpf`. */
  search?: string
  active?: boolean
  departmentId?: string
  page?: number
  limit?: number
}

/** Filtros da relação de motoristas em PDF — vão no CORPO do POST. */
export interface DriverExportFilters {
  search?: string
  registration?: string
  active?: boolean
  departmentId?: string
}

export type VehicleExportFilters = Omit<VehicleListParams, 'page' | 'limit'>

/** Remove chaves vazias: o backend usa `.strict()` e trata '' como valor. */
function compact<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined && v !== null && v !== '')) as Partial<T>
}

/**
 * PDFs autenticados: POST com filtros no corpo e resposta binária. `responseType:
 * 'blob'` pelo adaptador (que renova o token), nunca `fetch` cru.
 */
const pdf = (path: string, body: object = {}) =>
  api.post<Blob>(`${BASE}${path}`, compact(body), { responseType: 'blob' }).then(r => r.data)

function query(params: object = {}): string {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') qs.set(key, String(value))
  }
  const s = qs.toString()
  return s ? `?${s}` : ''
}

export const fleetService = {
  listVehicles: (params?: VehicleListParams) =>
    api.get<Paginated<FleetVehicle>>(`${BASE}/vehicles${query(params)}`).then(r => r.data),
  createVehicle: (data: VehicleInput) => api.post<FleetVehicle>(`${BASE}/vehicles`, data).then(r => r.data),
  updateVehicle: (id: string, data: Partial<Omit<VehicleInput, 'odometerKm'>>) =>
    api.patch<FleetVehicle>(`${BASE}/vehicles/${id}`, data).then(r => r.data),
  removeVehicle: (id: string) => api.delete<void>(`${BASE}/vehicles/${id}`).then(r => r.data),

  listDrivers: (params?: DriverListParams) =>
    api.get<Paginated<FleetDriver>>(`${BASE}/drivers${query(params)}`).then(r => r.data),
  /** CPF completo no CORPO de um POST — nunca na URL (log de requisição, histórico). */
  lookupDriverByCpf: (cpf: string) =>
    api.post<{ data: FleetDriver[] }>(`${BASE}/drivers/lookup`, { cpf }).then(r => r.data),
  /** Matrícula no CORPO: a tela não distingue matrícula numérica de CPF incompleto. */
  searchDriversByRegistration: (registration: string) =>
    api.post<{ data: FleetDriver[] }>(`${BASE}/drivers/search-by-registration`, { registration }).then(r => r.data),
  getVehicle: (id: string) => api.get<FleetVehicle>(`${BASE}/vehicles/${id}`).then(r => r.data),
  getDriver: (id: string) => api.get<FleetDriver>(`${BASE}/drivers/${id}`).then(r => r.data),

  exportVehicles: (filters: VehicleExportFilters = {}) => pdf('/vehicles/export', filters),
  exportVehicleSheet: (id: string) => pdf(`/vehicles/${id}/export`),
  exportDrivers: (filters: DriverExportFilters = {}) => pdf('/drivers/export', filters),
  exportDriverSheet: (id: string) => pdf(`/drivers/${id}/export`),
  createDriver: (data: DriverInput) => api.post<FleetDriver>(`${BASE}/drivers`, data).then(r => r.data),
  updateDriver: (id: string, data: Partial<DriverInput>) =>
    api.patch<FleetDriver>(`${BASE}/drivers/${id}`, data).then(r => r.data),
  removeDriver: (id: string) => api.delete<void>(`${BASE}/drivers/${id}`).then(r => r.data),
}
