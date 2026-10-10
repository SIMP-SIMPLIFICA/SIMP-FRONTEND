import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import FuelingDetailPage from './FuelingDetailPage'
import type { FleetFueling } from '@/lib/api/fleet-fueling'

const cancelMock = vi.fn()
const issueMock = vi.fn()
let current: FleetFueling

const BASE: FleetFueling = {
  id: 'f-1',
  publicId: '3a760890-9f77-415e-9d08-d37f434c3e7b',
  formattedNumber: '0001/2026',
  status: 'ISSUED',
  lifecycle: 'OPEN',
  departmentId: 'dep-1',
  vehicleId: 'veh-1',
  driverId: 'drv-1',
  contractId: 'ctr-1',
  qddItemId: 'qdd-1',
  qddFichaSnapshot: '1234',
  qddFonteSnapshot: '1500',
  qddNaturezaSnapshot: '3.3.90.30',
  fuelType: 'GASOLINA',
  maxVolumeL: '40.000',
  maxAmount: '247.60',
  unitPriceCap: '6.1900',
  validUntil: '2026-10-09T02:59:59.999Z',
  validUntilDate: '2026-10-08',
  purpose: 'Transporte de pacientes para Araguaína',
  plateAttempts: 0,
  budgetOverrun: false,
  cancelReason: null,
  cancelledAt: null,
  sha256Hash: 'ab'.repeat(32),
  issuedAt: '2026-10-05T13:00:00.000Z',
  createdAt: '2026-10-05T12:00:00.000Z',
  updatedAt: '2026-10-05T13:00:00.000Z',
  isExpired: false,
  department: { id: 'dep-1', name: 'Secretaria de Saúde', code: 'SS' },
  vehicle: { id: 'veh-1', plate: 'QBX4E21', makeModel: 'Spin 1.8', vehicleType: 'AUTOMOVEL', fuelType: 'FLEX', tankCapacityL: '55', assetTag: 'PAT-1' },
  driver: { id: 'drv-1', name: 'João Pereira', cnhCategory: 'B', cnhExpiry: '2028-03-15' },
  contract: { id: 'ctr-1', number: '012/2026', supplierName: 'Auto Posto Pequizeiro', supplierCnpj: '11222333000181', unitPrice: '6.1900', endDate: '2027-01-31' },
  qddItem: { id: 'qdd-1', ficha: '1234', fonte: '1500', naturezaDespesa: '3.3.90.30' },
  createdBy: { id: 'u1', name: 'Maria Secretária' },
  issuedBy: { id: 'u1', name: 'Maria Secretária' },
  cancelledBy: null,
  redemption: null,
  warnings: [],
}

vi.mock('@/hooks/useFleetFuelings', () => ({
  useFleetFueling: () => ({ data: current, isLoading: false, isError: false }),
  useIssueFleetFueling: () => ({ mutateAsync: issueMock, isPending: false }),
  useDeleteFleetFueling: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCancelFleetFueling: () => ({ mutateAsync: cancelMock, isPending: false }),
}))
vi.mock('@/hooks/useMe', () => ({ useMe: () => ({ data: { user: { roles: [{ role: { permissions: ['fleet:authorize_fuel'] } }] } } }) }))
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }))
// O formulário de edição tem testes próprios.
vi.mock('@/components/fleet/FuelingFormDialog', () => ({ FuelingFormDialog: () => null }))

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/frota/abastecimentos/f-1']}>
      <Routes>
        <Route path="/frota/abastecimentos/:id" element={<FuelingDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('FuelingDetailPage', () => {
  beforeEach(() => {
    current = { ...BASE }
    cancelMock.mockReset().mockResolvedValue({ ...BASE, lifecycle: 'CANCELLED' })
    issueMock.mockReset()
  })

  test('emitida e aberta: situação, hash, sem edição; cancelamento exige motivo de 10 caracteres', async () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Autorização nº 0001/2026' })).toBeInTheDocument()
    expect(screen.getByText('Aberta')).toBeInTheDocument()
    expect(screen.getByText('ab'.repeat(32))).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar autorização' }))
    const confirm = screen.getAllByRole('button', { name: 'Cancelar autorização' }).at(-1) as HTMLElement
    await userEvent.type(screen.getByLabelText('Motivo'), 'curto')
    expect(confirm).toBeDisabled()

    await userEvent.type(screen.getByLabelText('Motivo'), ' — o motorista perdeu o papel')
    await userEvent.click(confirm)
    await waitFor(() =>
      expect(cancelMock).toHaveBeenCalledWith({ id: 'f-1', reason: 'curto — o motorista perdeu o papel' })
    )
  })

  test('rascunho: editar, excluir e emitir; sem PDF', () => {
    current = { ...BASE, status: 'PENDING', formattedNumber: null, sha256Hash: null, issuedAt: null, issuedBy: null }
    renderPage()
    expect(screen.getByRole('heading', { name: 'Autorização em rascunho' })).toBeInTheDocument()
    expect(screen.getByText('Rascunho')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Emitir e gerar PDF/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Baixar PDF' })).not.toBeInTheDocument()
  })

  test('cancelada mostra o motivo e não oferece cancelar de novo', () => {
    current = { ...BASE, lifecycle: 'CANCELLED', cancelReason: 'Motorista perdeu o papel', cancelledAt: '2026-10-06T10:00:00.000Z' }
    renderPage()
    expect(screen.getAllByText('Cancelada').length).toBeGreaterThan(0)
    expect(screen.getByText('Motorista perdeu o papel')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar autorização' })).not.toBeInTheDocument()
  })
})
