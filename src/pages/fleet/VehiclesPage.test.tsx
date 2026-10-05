import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import VehiclesPage from './VehiclesPage'
import type { FleetVehicle } from '@/lib/api/fleet'

const exportVehiclesMock = vi.fn()
const savePdfBlobMock = vi.fn()

const VEHICLE: FleetVehicle = {
  id: 'veh-1',
  plate: 'ABC1D23',
  renavam: null,
  chassis: null,
  makeModel: 'Spin 1.8',
  manufactureYear: 2022,
  modelYear: 2023,
  ownership: 'PROPRIO',
  vehicleType: 'AUTOMOVEL',
  fuelType: 'FLEX',
  usesArla32: false,
  tankCapacityL: '55',
  referenceKmPerL: null,
  workRegime: 'PADRAO_8H',
  status: 'EM_USO',
  odometerKm: 12000,
  assetTag: 'TOMB-0077',
  marketValue: null,
  departmentId: null,
  ownerEntityId: null,
  department: null,
  ownerEntity: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  createdBy: null,
  updatedBy: null,
}

vi.mock('@/hooks/useFleet', () => ({
  useFleetVehicles: () => ({ data: { data: [VEHICLE], meta: { total: 1, page: 1, limit: 100, totalPages: 1 } }, isLoading: false, isError: false }),
  useDeleteFleetVehicle: () => ({ mutateAsync: vi.fn() }),
  useCreateFleetVehicle: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateFleetVehicle: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@/lib/api/fleet', async importOriginal => {
  const original = await importOriginal<typeof import('@/lib/api/fleet')>()
  return { ...original, fleetService: { ...original.fleetService, exportVehicles: (f: unknown) => exportVehiclesMock(f) } }
})
vi.mock('@/lib/official-documents', () => ({ savePdfBlob: (...args: unknown[]) => savePdfBlobMock(...args) }))
vi.mock('@/hooks/useMe', () => ({ useMe: () => ({ data: { user: { roles: [{ role: { permissions: ['fleet:manage'] } }] } } }) }))
vi.mock('@/components/departments/DepartmentSelect', () => ({ DepartmentSelect: () => null }))
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/frota/veiculos']}>
      <Routes>
        <Route path="/frota/veiculos" element={<VehiclesPage />} />
        <Route path="/frota/veiculos/:id" element={<p>Detalhe do veículo</p>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('VehiclesPage', () => {
  beforeEach(() => {
    exportVehiclesMock.mockReset().mockResolvedValue(new Blob(['%PDF']))
    savePdfBlobMock.mockReset()
  })

  test('mostra o nº de patrimônio na listagem', () => {
    renderPage()
    expect(screen.getByRole('columnheader', { name: 'Patrimônio' })).toBeInTheDocument()
    expect(screen.getByText('TOMB-0077')).toBeInTheDocument()
  })

  test('Enter na linha abre o detalhe; excluir não navega', async () => {
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Excluir ABC1D23' }))
    expect(screen.queryByText('Detalhe do veículo')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    screen.getByRole('link', { name: 'Ver detalhes de ABC1D23' }).focus()
    await userEvent.keyboard('{Enter}')
    expect(screen.getByText('Detalhe do veículo')).toBeInTheDocument()
  })

  test('exportar envia a busca da tela no corpo e baixa o PDF', async () => {
    renderPage()

    await userEvent.type(screen.getByLabelText('Buscar veículo'), 'TOMB')
    await userEvent.click(screen.getByRole('button', { name: /Exportar PDF/ }))

    expect(exportVehiclesMock).toHaveBeenCalledWith({ search: 'TOMB' })
    expect(savePdfBlobMock).toHaveBeenCalledWith(expect.any(Blob), expect.stringMatching(/^relacao-frota-\d{4}-\d{2}-\d{2}\.pdf$/))
  })
})
