import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import DriversPage from './DriversPage'

/**
 * O CPF digitado na busca nunca pode ir para a URL (query string vai para o log
 * de requisição do backend): CPF completo usa o lookup por POST, e a listagem só
 * recebe busca por nome.
 */

const listParamsSeen: unknown[] = []
const lookupMock = vi.fn()

vi.mock('@/hooks/useFleet', () => ({
  useFleetDrivers: (params: unknown) => {
    listParamsSeen.push(params)
    return { data: { data: [], meta: { total: 0, page: 1, limit: 100, totalPages: 0 } }, isLoading: false, isError: false }
  },
  useLookupFleetDriverByCpf: () => ({ mutate: lookupMock, isPending: false }),
  useDeleteFleetDriver: () => ({ mutateAsync: vi.fn() }),
  useCreateFleetDriver: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateFleetDriver: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@/hooks/useMe', () => ({ useMe: () => ({ data: { user: { roles: [{ role: { permissions: ['fleet:read'] } }] } } }) }))
vi.mock('@/components/departments/DepartmentSelect', () => ({ DepartmentSelect: () => null }))
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }))

describe('DriversPage — busca', () => {
  beforeEach(() => {
    listParamsSeen.length = 0
    lookupMock.mockReset()
  })

  test('CPF completo: localiza pelo POST e nunca passa o CPF para a listagem', async () => {
    render(<DriversPage />)

    await userEvent.type(screen.getByLabelText('Buscar motorista'), '529.982.247-25')

    expect(lookupMock).toHaveBeenCalledWith('52998224725', expect.any(Object))
    // Nenhum prefixo do CPF ('529.982.247' já determina o CPF inteiro) chega à
    // listagem, cuja busca viaja na URL: nenhum parâmetro pode ter dígito.
    const leaked = listParamsSeen.some(p => /\d/.test(String((p as { search?: string } | undefined)?.search ?? '')))
    expect(leaked).toBe(false)
  })

  test('CPF incompleto: orienta e não consulta nada', async () => {
    render(<DriversPage />)

    await userEvent.type(screen.getByLabelText('Buscar motorista'), '529.982.247')

    expect(lookupMock).not.toHaveBeenCalled()
    expect(screen.getByText(/digite o CPF completo/i)).toBeInTheDocument()
    expect(listParamsSeen.some(p => /\d/.test(String((p as { search?: string } | undefined)?.search ?? '')))).toBe(false)
  })

  test('texto comum: busca por nome na listagem, sem lookup', async () => {
    render(<DriversPage />)

    await userEvent.type(screen.getByLabelText('Buscar motorista'), 'João')

    expect(lookupMock).not.toHaveBeenCalled()
    expect(listParamsSeen.at(-1)).toMatchObject({ search: 'João' })
  })
})
