import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { FuelingFormDialog } from './FuelingFormDialog'
import type { FuelingOptions, FuelingSuggestions } from '@/lib/api/fleet-fueling'

const createMock = vi.fn()
const issueMock = vi.fn()
const toastMock = vi.fn()

const OPTIONS: FuelingOptions = {
  defaultValidUntil: '2026-10-08',
  vehicles: [
    {
      id: 'veh-1', plate: 'QBX4E21', makeModel: 'Spin 1.8', vehicleType: 'AUTOMOVEL', fuelType: 'FLEX', tankCapacityL: '55',
      status: 'EM_USO', assetTag: 'PAT-1', departmentId: 'dep-1', compatibleFuels: ['GASOLINA', 'ETANOL'],
      requiredCnhCategory: 'B', unavailableReason: null,
    },
    {
      id: 'veh-2', plate: 'ABC1234', makeModel: 'Hilux', vehicleType: 'CAMINHONETE', fuelType: 'DIESEL_S10', tankCapacityL: '80',
      status: 'MANUTENCAO', assetTag: 'PAT-2', departmentId: 'dep-1', compatibleFuels: ['DIESEL_S10'],
      requiredCnhCategory: 'B', unavailableReason: 'Veículo em manutenção',
    },
  ],
  drivers: [
    { id: 'drv-1', name: 'João Pereira', cnhCategory: 'B', cnhExpiry: '2028-03-15', cnhStatus: 'REGULAR', departmentId: 'dep-1', ineligibleReason: null },
    { id: 'drv-2', name: 'Ana Vencida', cnhCategory: 'B', cnhExpiry: '2026-01-01', cnhStatus: 'REGULAR', departmentId: null, ineligibleReason: 'CNH vencida em 01/01/2026' },
  ],
  contracts: [
    { id: 'ctr-1', number: '012/2026', supplierName: 'Auto Posto Pequizeiro', fuelType: 'GASOLINA', unitPrice: '6.19', totalAmount: '50000', endDate: '2027-01-31', availableAmount: '49000' },
  ],
  qddItems: [
    { id: 'qdd-1', ficha: '1234', fonte: '1500', naturezaDespesa: '3.3.90.30', projetoAtividade: '2.010', saldoRestante: '18420' },
  ],
}

const SUGGESTIONS: FuelingSuggestions = {
  compatibleFuels: ['GASOLINA', 'ETANOL'],
  suggestedFuelType: 'GASOLINA',
  suggestedContractId: 'ctr-1',
  suggestedUnitPrice: '6.19',
  habitualDriverId: 'drv-1',
  tankCapacityL: '55',
  openAuthorization: { code: 'OPEN_AUTHORIZATION_EXISTS', message: 'Este veículo já tem a autorização nº 0042/2026 aberta, válida até 09/10/2026.' },
  recentPurposes: ['Transporte de pacientes para Araguaína'],
}

vi.mock('@/hooks/useFleetFuelings', () => ({
  useFuelingDepartments: () => ({ data: { data: [{ id: 'dep-1', name: 'Secretaria de Saúde', code: 'SS' }] }, isLoading: false, isSuccess: true }),
  useFuelingOptions: (departmentId?: string) => ({ data: departmentId ? OPTIONS : undefined }),
  useFuelingSuggestions: (departmentId?: string, vehicleId?: string) => ({ data: departmentId && vehicleId ? SUGGESTIONS : undefined }),
  useCreateFleetFueling: () => ({ mutateAsync: createMock, isPending: false }),
  useUpdateFleetFueling: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useIssueFleetFueling: () => ({ mutateAsync: issueMock, isPending: false }),
}))

vi.mock('@/hooks/use-toast', () => ({ toast: (...args: unknown[]) => toastMock(...args) }))

async function chooseVehicle() {
  await userEvent.click(screen.getByRole('combobox', { name: 'Veículo' }))
  await userEvent.click(await screen.findByRole('option', { name: /QBX4E21/ }))
}

describe('FuelingFormDialog', () => {
  beforeEach(() => {
    createMock.mockReset().mockResolvedValue({ id: 'f-1', formattedNumber: null, warnings: [] })
    issueMock.mockReset().mockResolvedValue({ id: 'f-1', formattedNumber: '0001/2026', warnings: [] })
    toastMock.mockReset()
  })

  test('departamento único já vem escolhido; validade padrão de 3 dias úteis', async () => {
    render(<FuelingFormDialog open onOpenChange={vi.fn()} />)
    expect(await screen.findByLabelText('Válida até')).toHaveValue('2026-10-08')
    expect(screen.getByText(/3 dias úteis/)).toBeInTheDocument()
  })

  test('escolher o veículo preenche combustível, motorista habitual, contrato e preço; avisa autorização aberta', async () => {
    render(<FuelingFormDialog open onOpenChange={vi.fn()} />)
    await chooseVehicle()

    await waitFor(() => expect(screen.getByLabelText('Preço por litro (R$)')).toHaveValue('6,19'))
    expect(screen.getByRole('combobox', { name: 'Combustível' })).toHaveTextContent('Gasolina')
    expect(screen.getByRole('combobox', { name: 'Motorista' })).toHaveTextContent('João Pereira')
    expect(screen.getByRole('combobox', { name: 'Contrato' })).toHaveTextContent('012/2026')
    expect(screen.getByText(/0042\/2026 aberta/)).toBeInTheDocument()
  })

  test('veículo em manutenção e motorista com CNH vencida aparecem desabilitados, com o motivo', async () => {
    render(<FuelingFormDialog open onOpenChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('combobox', { name: 'Veículo' }))
    expect(await screen.findByRole('option', { name: /em manutenção/ })).toHaveAttribute('aria-disabled', 'true')
  })

  test('litros × preço mostra o valor máximo calculado e avisa quando passa do tanque', async () => {
    render(<FuelingFormDialog open onOpenChange={vi.fn()} />)
    await chooseVehicle()
    await waitFor(() => expect(screen.getByLabelText('Preço por litro (R$)')).toHaveValue('6,19'))

    await userEvent.type(screen.getByLabelText('Litros (máx.)'), '40')
    expect(screen.getByText('R$ 247,60')).toBeInTheDocument()
    expect(screen.queryByText(/capacidade do tanque/)).not.toBeInTheDocument()

    await userEvent.clear(screen.getByLabelText('Litros (máx.)'))
    await userEvent.type(screen.getByLabelText('Litros (máx.)'), '60')
    expect(screen.getByText(/passa da capacidade do tanque \(55 L\)/)).toBeInTheDocument()
  })

  test('valor digitado calcula os litros para baixo e só o valor vai ao servidor', async () => {
    render(<FuelingFormDialog open onOpenChange={vi.fn()} />)
    await chooseVehicle()
    await waitFor(() => expect(screen.getByLabelText('Preço por litro (R$)')).toHaveValue('6,19'))

    await userEvent.type(screen.getByLabelText('Valor (máx.)'), '100')
    expect(screen.getByText('16,155 L')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Transporte de pacientes para Araguaína' }))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }))

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1))
    expect(createMock.mock.calls[0][0]).toMatchObject({
      departmentId: 'dep-1',
      vehicleId: 'veh-1',
      driverId: 'drv-1',
      fuelType: 'GASOLINA',
      contractId: 'ctr-1',
      qddItemId: 'qdd-1',
      unitPriceCap: '6.19',
      maxVolumeL: null,
      maxAmount: '100',
      validUntil: '2026-10-08',
    })
    expect(issueMock).not.toHaveBeenCalled()
  })

  test('"Emitir e gerar PDF" salva e emite; finalidade curta é barrada antes', async () => {
    const onSaved = vi.fn()
    render(<FuelingFormDialog open onOpenChange={vi.fn()} onSaved={onSaved} />)
    await chooseVehicle()
    await waitFor(() => expect(screen.getByLabelText('Preço por litro (R$)')).toHaveValue('6,19'))
    await userEvent.type(screen.getByLabelText('Litros (máx.)'), '40')

    await userEvent.type(screen.getByLabelText('Finalidade'), 'curta')
    await userEvent.click(screen.getByRole('button', { name: 'Emitir e gerar PDF' }))
    expect(await screen.findByText(/pelo menos 15 caracteres/)).toBeInTheDocument()
    expect(createMock).not.toHaveBeenCalled()

    await userEvent.type(screen.getByLabelText('Finalidade'), ' — consulta em Palmas')
    await userEvent.click(screen.getByRole('button', { name: 'Emitir e gerar PDF' }))
    await waitFor(() => expect(issueMock).toHaveBeenCalledWith('f-1'))
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ formattedNumber: '0001/2026' }), true)
  })

  test('erro do servidor aparece com a mensagem orientadora', async () => {
    createMock.mockRejectedValueOnce({ error: 'DRIVER_NOT_ELIGIBLE', message: 'A CNH de João Pereira venceu em 12/09/2026. Escolha outro motorista ou atualize o cadastro.' })
    render(<FuelingFormDialog open onOpenChange={vi.fn()} />)
    await chooseVehicle()
    await waitFor(() => expect(screen.getByLabelText('Preço por litro (R$)')).toHaveValue('6,19'))
    await userEvent.type(screen.getByLabelText('Litros (máx.)'), '40')
    await userEvent.type(screen.getByLabelText('Finalidade'), 'Transporte de pacientes para Palmas')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }))

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: expect.stringContaining('venceu em 12/09/2026'), variant: 'destructive' }))
    )
  })
})
