import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import DriversPage from './DriversPage'
import type { FleetDriver } from '@/lib/api/fleet'

/**
 * Nenhum texto com dígito vai para a URL (query string vai para o log de
 * requisição do backend): CPF completo usa o lookup por POST, matrícula usa a
 * busca por POST, e a listagem só recebe busca por nome.
 */

const listParamsSeen: unknown[] = []
const lookupMock = vi.fn()
const registrationMock = vi.fn()
const exportDriversMock = vi.fn()
let listData: FleetDriver[] = []

vi.mock('@/hooks/useFleet', () => ({
  useFleetDrivers: (params: unknown) => {
    listParamsSeen.push(params)
    return { data: { data: listData, meta: { total: listData.length, page: 1, limit: 100, totalPages: 1 } }, isLoading: false, isError: false }
  },
  useLookupFleetDriverByCpf: () => ({ mutate: lookupMock, isPending: false }),
  useSearchFleetDriversByRegistration: () => ({ mutate: registrationMock, isPending: false }),
  useDeleteFleetDriver: () => ({ mutateAsync: vi.fn() }),
  useCreateFleetDriver: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateFleetDriver: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@/lib/api/fleet', async importOriginal => {
  const original = await importOriginal<typeof import('@/lib/api/fleet')>()
  return { ...original, fleetService: { ...original.fleetService, exportDrivers: (f: unknown) => exportDriversMock(f) } }
})
vi.mock('@/lib/official-documents', () => ({ savePdfBlob: vi.fn() }))
vi.mock('@/hooks/useMe', () => ({ useMe: () => ({ data: { user: { roles: [{ role: { permissions: ['fleet:manage'] } }] } } }) }))
vi.mock('@/components/departments/DepartmentSelect', () => ({ DepartmentSelect: () => null }))
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }))

const DRIVER: FleetDriver = {
  id: 'drv-1',
  name: 'João Pereira',
  registrationNumber: '2024-1001',
  cpfMasked: '***.982.***-**',
  cnhMasked: '*******6461',
  cnhCategory: 'B',
  cnhExpiry: '2030-03-15',
  cnhStatus: 'REGULAR',
  employmentKind: 'EFETIVO',
  active: true,
  departmentId: null,
  userId: null,
  user: null,
  department: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  createdBy: null,
  updatedBy: null,
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/frota/motoristas']}>
      <Routes>
        <Route path="/frota/motoristas" element={<DriversPage />} />
        <Route path="/frota/motoristas/:id" element={<p>Página de detalhe</p>} />
      </Routes>
    </MemoryRouter>
  )
}

const anyDigitInList = () => listParamsSeen.some(p => /\d/.test(String((p as { search?: string } | undefined)?.search ?? '')))

describe('DriversPage — busca', () => {
  beforeEach(() => {
    listParamsSeen.length = 0
    listData = []
    lookupMock.mockReset()
    registrationMock.mockReset()
  })

  afterEach(() => vi.useRealTimers())

  test('CPF completo: localiza pelo POST e nunca passa o CPF para a listagem', async () => {
    renderPage()

    await userEvent.type(screen.getByLabelText('Buscar motorista'), '529.982.247-25')

    expect(lookupMock).toHaveBeenCalledWith('52998224725', expect.any(Object))
    // Nenhum prefixo do CPF ('529.982.247' já determina o CPF inteiro) chega à
    // listagem, cuja busca viaja na URL: nenhum parâmetro pode ter dígito.
    expect(anyDigitInList()).toBe(false)
  })

  test('CPF incompleto (com pontuação): orienta e não consulta nada', async () => {
    renderPage()

    await userEvent.type(screen.getByLabelText('Buscar motorista'), '529.982.247')

    expect(lookupMock).not.toHaveBeenCalled()
    expect(registrationMock).not.toHaveBeenCalled()
    expect(screen.getByText(/digite o CPF completo/i)).toBeInTheDocument()
    expect(anyDigitInList()).toBe(false)
  })

  test('matrícula: busca pelo POST (com espera de digitação), nunca pela listagem', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    renderPage()

    await userEvent.type(screen.getByLabelText('Buscar motorista'), '2024-1001')
    expect(registrationMock).not.toHaveBeenCalled()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })

    expect(registrationMock).toHaveBeenCalledTimes(1)
    expect(registrationMock).toHaveBeenCalledWith('2024-1001', expect.any(Object))
    expect(lookupMock).not.toHaveBeenCalled()
    expect(anyDigitInList()).toBe(false)
  })

  test('texto comum: busca por nome na listagem, sem lookup', async () => {
    renderPage()

    await userEvent.type(screen.getByLabelText('Buscar motorista'), 'João')

    expect(lookupMock).not.toHaveBeenCalled()
    expect(registrationMock).not.toHaveBeenCalled()
    expect(listParamsSeen.at(-1)).toMatchObject({ search: 'João' })
  })
})

describe('DriversPage — listagem, detalhe e exportação', () => {
  beforeEach(() => {
    listData = [DRIVER]
    exportDriversMock.mockReset().mockResolvedValue(new Blob(['%PDF']))
  })

  test('mostra a matrícula na listagem', () => {
    renderPage()
    expect(screen.getByText('2024-1001')).toBeInTheDocument()
  })

  test('clique na linha abre o detalhe; o botão de editar não navega', async () => {
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Editar João Pereira' }))
    expect(screen.queryByText('Página de detalhe')).not.toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    await userEvent.click(screen.getByText('João Pereira'))
    expect(screen.getByText('Página de detalhe')).toBeInTheDocument()
  })

  test('exportar envia o filtro da tela (nome) no corpo', async () => {
    renderPage()

    await userEvent.type(screen.getByLabelText('Buscar motorista'), 'João')
    await userEvent.click(screen.getByRole('button', { name: /Exportar PDF/ }))

    expect(exportDriversMock).toHaveBeenCalledWith({ search: 'João', registration: undefined })
  })

  test('com busca por CPF, a exportação fica desabilitada e explica o motivo', async () => {
    renderPage()

    await userEvent.type(screen.getByLabelText('Buscar motorista'), '529.982.247')
    const button = screen.getByRole('button', { name: /Exportar PDF/ })
    expect(button).toBeDisabled()
    expect(button).toHaveAccessibleName(/Limpe a busca por CPF/)
  })
})
