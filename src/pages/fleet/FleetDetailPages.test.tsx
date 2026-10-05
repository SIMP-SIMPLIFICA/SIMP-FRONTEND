import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import DriverDetailPage from './DriverDetailPage'
import VehicleDetailPage from './VehicleDetailPage'
import type { FleetDriver, FleetVehicle } from '@/lib/api/fleet'

const exportVehicleSheetMock = vi.fn()
const exportDriverSheetMock = vi.fn()
let permissions = ['fleet:manage']
let vehicleState: { data?: FleetVehicle; isLoading: boolean; isError: boolean; error?: unknown }
let driverState: { data?: FleetDriver; isLoading: boolean; isError: boolean; error?: unknown }

const VEHICLE: FleetVehicle = {
  id: 'veh-1',
  plate: 'ABC1234',
  renavam: '01234567897',
  chassis: '9BWZZZ377VT004251',
  makeModel: 'Spin 1.8',
  manufactureYear: 2022,
  modelYear: 2023,
  ownership: 'PROPRIO',
  vehicleType: 'AUTOMOVEL',
  fuelType: 'FLEX',
  usesArla32: false,
  tankCapacityL: '55.5',
  referenceKmPerL: '10.5',
  workRegime: 'PADRAO_8H',
  status: 'RESERVA',
  odometerKm: 12000,
  assetTag: 'TOMB-0077',
  marketValue: '85000.00',
  departmentId: 'dep-1',
  ownerEntityId: null,
  department: { id: 'dep-1', name: 'Secretaria de Saúde' },
  ownerEntity: null,
  createdAt: '2026-10-01T13:00:00.000Z',
  updatedAt: '2026-10-02T13:00:00.000Z',
  createdBy: { id: 'u1', name: 'Maria Cadastro' },
  updatedBy: { id: 'u2', name: 'Paulo Edição' },
}

const DRIVER: FleetDriver = {
  id: 'drv-1',
  name: 'João Pereira',
  registrationNumber: '2024-1001',
  cpfMasked: '***.982.***-**',
  cnhMasked: '*******6461',
  cnhCategory: 'D',
  cnhExpiry: '2020-01-10',
  cnhStatus: 'REGULAR',
  employmentKind: 'EFETIVO',
  active: true,
  departmentId: null,
  userId: null,
  user: null,
  department: null,
  createdAt: '2026-10-01T13:00:00.000Z',
  updatedAt: '2026-10-01T13:00:00.000Z',
  createdBy: { id: 'u1', name: 'Maria Cadastro' },
  updatedBy: null,
}

vi.mock('@/hooks/useFleet', () => ({
  useFleetVehicle: () => vehicleState,
  useFleetDriver: () => driverState,
  useCreateFleetVehicle: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateFleetVehicle: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateFleetDriver: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateFleetDriver: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@/lib/api/fleet', async importOriginal => {
  const original = await importOriginal<typeof import('@/lib/api/fleet')>()
  return {
    ...original,
    fleetService: {
      ...original.fleetService,
      exportVehicleSheet: (id: string) => exportVehicleSheetMock(id),
      exportDriverSheet: (id: string) => exportDriverSheetMock(id),
    },
  }
})
vi.mock('@/lib/official-documents', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/official-documents')>()),
  savePdfBlob: vi.fn(),
}))
vi.mock('@/hooks/useMe', () => ({ useMe: () => ({ data: { user: { roles: [{ role: { permissions } }] } } }) }))
vi.mock('@/components/departments/DepartmentSelect', () => ({ DepartmentSelect: () => null }))
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }))

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/frota/veiculos/:id" element={<VehicleDetailPage />} />
        <Route path="/frota/motoristas/:id" element={<DriverDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('Detalhe do veículo', () => {
  beforeEach(() => {
    permissions = ['fleet:manage']
    vehicleState = { data: VEHICLE, isLoading: false, isError: false }
    exportVehicleSheetMock.mockReset().mockResolvedValue(new Blob(['%PDF']))
  })

  test('agrupa todos os dados e mostra quem cadastrou e quem alterou', () => {
    renderAt('/frota/veiculos/veh-1')

    for (const heading of ['Identificação', 'Dados técnicos', 'Situação e propriedade', 'Departamento', 'Registro', 'Histórico']) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
    }
    expect(screen.getAllByText('TOMB-0077').length).toBeGreaterThan(0)
    expect(screen.getByText('9BWZZZ377VT004251')).toBeInTheDocument()
    expect(screen.getByText('Secretaria de Saúde')).toBeInTheDocument()
    expect(screen.getByText(/por Maria Cadastro/)).toBeInTheDocument()
    expect(screen.getByText(/por Paulo Edição/)).toBeInTheDocument()
    expect(screen.getByText(/Abastecimentos, viagens e manutenções aparecerão aqui/)).toBeInTheDocument()
  })

  test('exporta a ficha pelo id e mostra Editar só para quem gerencia', async () => {
    renderAt('/frota/veiculos/veh-1')
    await userEvent.click(screen.getByRole('button', { name: /Exportar ficha/ }))
    expect(exportVehicleSheetMock).toHaveBeenCalledWith('veh-1')
    expect(screen.getByRole('button', { name: /Editar/ })).toBeInTheDocument()
  })

  test('só leitura: sem botão Editar, mas exporta', () => {
    permissions = ['fleet:read']
    renderAt('/frota/veiculos/veh-1')
    expect(screen.queryByRole('button', { name: /Editar/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Exportar ficha/ })).toBeInTheDocument()
  })

  test('veículo de outra organização/escopo (404): mensagem e nenhum dado', () => {
    vehicleState = {
      isLoading: false,
      isError: true,
      error: { error: 'NOT_FOUND', message: 'Veículo não encontrado.' },
    }
    renderAt('/frota/veiculos/de-outra-org')
    expect(screen.getByRole('alert')).toHaveTextContent('Veículo não encontrado.')
    expect(screen.queryByRole('button', { name: /Exportar ficha/ })).not.toBeInTheDocument()
  })
})

describe('Detalhe do motorista', () => {
  beforeEach(() => {
    driverState = { data: DRIVER, isLoading: false, isError: false }
    exportDriverSheetMock.mockReset().mockResolvedValue(new Blob(['%PDF']))
  })

  test('CPF e CNH só mascarados; CNH vencida destacada; matrícula visível', () => {
    renderAt('/frota/motoristas/drv-1')

    expect(screen.getByText('***.982.***-**')).toBeInTheDocument()
    expect(screen.getByText('*******6461')).toBeInTheDocument()
    expect(screen.getByText('Vencida')).toBeInTheDocument()
    expect(screen.getAllByText(/2024-1001/).length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: 'Habilitação' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Histórico' })).toBeInTheDocument()
  })

  test('exporta a ficha do motorista', async () => {
    renderAt('/frota/motoristas/drv-1')
    await userEvent.click(screen.getByRole('button', { name: /Exportar ficha/ }))
    expect(exportDriverSheetMock).toHaveBeenCalledWith('drv-1')
  })
})
