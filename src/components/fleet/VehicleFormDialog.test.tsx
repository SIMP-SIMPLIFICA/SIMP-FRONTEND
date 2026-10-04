import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { VehicleFormDialog } from './VehicleFormDialog'

const createMock = vi.fn()

vi.mock('@/hooks/useFleet', () => ({
  useCreateFleetVehicle: () => ({ mutateAsync: createMock, isPending: false }),
  useUpdateFleetVehicle: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

// O seletor de departamento busca a lista no servidor; aqui só importa o valor.
vi.mock('@/components/departments/DepartmentSelect', () => ({
  DepartmentSelect: () => <div data-testid="department-select" />,
}))

vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }))

describe('VehicleFormDialog', () => {
  beforeEach(() => createMock.mockReset().mockResolvedValue({}))

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
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar' }))

    expect(createMock).toHaveBeenCalledTimes(1)
    expect(createMock.mock.calls[0][0]).toMatchObject({
      plate: 'ABC1D23',
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
})
