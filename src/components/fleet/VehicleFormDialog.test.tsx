import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { VehicleFormDialog } from './VehicleFormDialog'
import type { FleetVehicle } from '@/lib/api/fleet'

const createMock = vi.fn()
const updateMock = vi.fn()

vi.mock('@/hooks/useFleet', () => ({
  useCreateFleetVehicle: () => ({ mutateAsync: createMock, isPending: false }),
  useUpdateFleetVehicle: () => ({ mutateAsync: updateMock, isPending: false }),
}))

// O seletor de departamento busca a lista no servidor; aqui só importa o valor.
vi.mock('@/components/departments/DepartmentSelect', () => ({
  DepartmentSelect: () => <div data-testid="department-select" />,
}))

vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }))

const LEASED: FleetVehicle = {
  id: 'veh-1',
  plate: 'ABC1D23',
  renavam: null,
  chassis: null,
  makeModel: 'Spin',
  manufactureYear: null,
  modelYear: null,
  ownership: 'LOCADO',
  vehicleType: 'AUTOMOVEL',
  fuelType: 'FLEX',
  usesArla32: false,
  tankCapacityL: '55',
  referenceKmPerL: null,
  workRegime: 'PADRAO_8H',
  status: 'EM_USO',
  odometerKm: 0,
  assetTag: null,
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

describe('VehicleFormDialog', () => {
  beforeEach(() => {
    createMock.mockReset().mockResolvedValue({})
    updateMock.mockReset().mockResolvedValue({})
  })

  test('placa inválida: mensagem orientadora no campo e nada é enviado', async () => {
    render(<VehicleFormDialog open onOpenChange={vi.fn()} />)

    await userEvent.type(screen.getByLabelText('Placa'), 'AB12')
    await userEvent.type(screen.getByLabelText('Tanque (litros)'), '55')
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar' }))

    expect(await screen.findByText('Placa inválida. Use ABC1234 ou ABC1D23.')).toBeInTheDocument()
    expect(createMock).not.toHaveBeenCalled()
  })

  test('envia placa normalizada, Renavam só com dígitos e litros como string decimal', async () => {
    const onOpenChange = vi.fn()
    render(<VehicleFormDialog open onOpenChange={onOpenChange} />)

    await userEvent.type(screen.getByLabelText('Placa'), 'abc-1d23')
    await userEvent.type(screen.getByLabelText('Renavam (opcional)'), '0123456789-7')
    await userEvent.type(screen.getByLabelText('Tanque (litros)'), '55,5')
    await userEvent.type(screen.getByLabelText('Nº de patrimônio'), ' 000123 ')
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar' }))

    expect(createMock).toHaveBeenCalledTimes(1)
    expect(createMock.mock.calls[0][0]).toMatchObject({
      plate: 'ABC1D23',
      assetTag: '000123',
      renavam: '01234567897',
      tankCapacityL: '55.5',
      ownership: 'PROPRIO',
      vehicleType: 'AUTOMOVEL',
      fuelType: 'FLEX',
      departmentId: null,
    })
    expect(createMock.mock.calls[0][0]).not.toHaveProperty('organizationId')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  test('Renavam com dígito verificador errado é recusado antes do envio', async () => {
    render(<VehicleFormDialog open onOpenChange={vi.fn()} />)

    await userEvent.type(screen.getByLabelText('Placa'), 'ABC1234')
    await userEvent.type(screen.getByLabelText('Renavam (opcional)'), '01234567898')
    await userEvent.type(screen.getByLabelText('Tanque (litros)'), '50')
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar' }))

    expect(await screen.findByText('Renavam inválido: confira os 11 dígitos no CRLV.')).toBeInTheDocument()
    expect(createMock).not.toHaveBeenCalled()
  })

  test('veículo próprio sem patrimônio é recusado antes do envio', async () => {
    render(<VehicleFormDialog open onOpenChange={vi.fn()} />)

    expect(screen.getByLabelText('Nº de patrimônio')).toHaveAttribute('aria-required', 'true')
    await userEvent.type(screen.getByLabelText('Placa'), 'ABC1234')
    await userEvent.type(screen.getByLabelText('Tanque (litros)'), '50')
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar' }))

    expect(await screen.findByText('Informe o nº de patrimônio: obrigatório para veículo próprio.')).toBeInTheDocument()
    expect(createMock).not.toHaveBeenCalled()
  })

  test('veículo locado: patrimônio opcional, vazio vai como null', async () => {
    render(<VehicleFormDialog open onOpenChange={vi.fn()} vehicle={LEASED} />)

    expect(screen.getByLabelText('Nº de patrimônio (opcional)')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(updateMock).toHaveBeenCalledTimes(1)
    expect(updateMock.mock.calls[0][0].data).toMatchObject({ ownership: 'LOCADO', assetTag: null })
  })
})
