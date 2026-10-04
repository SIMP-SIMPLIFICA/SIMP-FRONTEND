import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { DriverFormDialog } from './DriverFormDialog'
import type { FleetDriver } from '@/lib/api/fleet'

const createMock = vi.fn()
const updateMock = vi.fn()

vi.mock('@/hooks/useFleet', () => ({
  useCreateFleetDriver: () => ({ mutateAsync: createMock, isPending: false }),
  useUpdateFleetDriver: () => ({ mutateAsync: updateMock, isPending: false }),
}))
vi.mock('@/components/departments/DepartmentSelect', () => ({
  DepartmentSelect: () => <div data-testid="department-select" />,
}))
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }))

const EXISTING: FleetDriver = {
  id: 'drv-1',
  name: 'João Pereira',
  cpfMasked: '***.982.247-**',
  cnhMasked: '*******6461',
  cnhCategory: 'B',
  cnhExpiry: '2028-03-15',
  cnhStatus: 'REGULAR',
  employmentKind: 'EFETIVO',
  active: true,
  departmentId: null,
  userId: null,
  department: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
}

async function fillRequired() {
  await userEvent.type(screen.getByLabelText('Nome completo'), 'João Pereira')
  await userEvent.type(screen.getByLabelText('Nº da CNH'), '02650306461')
  await userEvent.type(screen.getByLabelText('Validade da CNH'), '2028-03-15')
}

describe('DriverFormDialog', () => {
  beforeEach(() => {
    createMock.mockReset().mockResolvedValue({})
    updateMock.mockReset().mockResolvedValue({})
  })

  test('CPF inválido: mensagem no campo e nada é enviado', async () => {
    render(<DriverFormDialog open onOpenChange={vi.fn()} />)
    await fillRequired()
    await userEvent.type(screen.getByLabelText('CPF'), '52998224724')
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar' }))

    expect(await screen.findByText('CPF inválido. Confira os 11 dígitos.')).toBeInTheDocument()
    expect(createMock).not.toHaveBeenCalled()
  })

  test('aplica a máscara ao digitar e envia o CPF só com dígitos', async () => {
    render(<DriverFormDialog open onOpenChange={vi.fn()} />)
    await fillRequired()
    const cpf = screen.getByLabelText('CPF')
    await userEvent.type(cpf, '52998224725')

    expect(cpf).toHaveValue('529.982.247-25')
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar' }))

    expect(createMock).toHaveBeenCalledTimes(1)
    expect(createMock.mock.calls[0][0]).toMatchObject({ cpf: '52998224725', cnhNumber: '02650306461', cnhCategory: 'B' })
  })

  test('na edição, CPF e CNH vazios não são enviados (mantém o valor cifrado no servidor)', async () => {
    render(<DriverFormDialog open onOpenChange={vi.fn()} driver={EXISTING} />)

    expect(screen.getByLabelText('CPF')).toHaveAttribute('placeholder', '***.982.247-** (manter)')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(updateMock).toHaveBeenCalledTimes(1)
    const { data } = updateMock.mock.calls[0][0]
    expect(data).not.toHaveProperty('cpf')
    expect(data).not.toHaveProperty('cnhNumber')
    expect(data.name).toBe('João Pereira')
  })
})
