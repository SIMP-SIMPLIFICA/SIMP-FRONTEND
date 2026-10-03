---
name: simp-tela-modulo
description: Use ao criar uma tela nova de módulo no frontend do SIMP (ex.: as telas do Frotas em src/pages/fleet/) — rota protegida por ProtectedRoute → ModuleGate → PermissionGate, item em NAV_SECTIONS, par src/lib/api/x.ts + src/hooks/useX.ts, formulário shadcn espelhando a UI de Diárias, mensagens de erro orientadoras e teste de componente com Testing Library.
---

# Tela nova de módulo (frontend)

Referência viva: Diárias — `src/pages/daily-allowances/DailyAllowanceList.tsx` (lista + filtros + abre o formulário) e `DailyAllowanceForm.tsx` (`Dialog` com `react-hook-form` + `zodResolver`), `src/lib/api/daily-allowances.ts`, `src/hooks/useDailyAllowances.ts`.

## Passos

1. **Serviço** em `src/lib/api/<dominio>.ts`: tipos do contrato (mantidos à mão, espelhando o backend) + objeto de serviço fino. Rotas do backend: conferir o prefixo em `SIMP-BACKEND/src/config/routes.ts` (Frotas: `/api/v1/fleet/...`).
   ```ts
   export const dailyAllowanceService = {
     list: (params?: DailyAllowanceListParams) =>
       api.get<PaginatedDailyAllowances>(`${BASE}${buildQuery(params)}`).then(r => r.data),
     create: (data: CreateDailyAllowanceDTO) => api.post<DailyAllowance>(BASE, data).then(r => r.data),
     issue: (id: string) => api.post<DailyAllowance>(`${BASE}/${id}/issue`, {}).then(r => r.data),
     async downloadPdf(id: string): Promise<Blob> {
       return apiRequest<Blob>(`${BASE}/${id}/pdf`, { method: 'GET', responseType: 'blob' })
     },
   }
   ```
   - Valores `Decimal` chegam como `string` — tipar como `string`, nunca `number`.
   - Nunca enviar `organizationId`; enviar só os campos do contrato (rotas novas usam `.strict()` e recusam extras com 400).
   - `limit` ≤ 100 em qualquer listagem.

2. **Hooks** em `src/hooks/use<Dominio>.ts`, com uma `KEY` e invalidação em toda mutation:
   ```ts
   const KEY = 'daily-allowances'
   export function useDailyAllowances(params?: DailyAllowanceListParams) {
     return useQuery({ queryKey: [KEY, params], queryFn: () => dailyAllowanceService.list(params) })
   }
   export function useIssueDailyAllowance() {
     const queryClient = useQueryClient()
     return useMutation({
       mutationFn: dailyAllowanceService.issue,
       onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
     })
   }
   ```

3. **Página** em `src/pages/<dominio>/` (Frotas: `src/pages/fleet/`; componentes reutilizáveis em `src/components/fleet/`). Lista com filtros e estado `formOpen`/`editing`, como `DailyAllowanceList`. Formulário em `Dialog`:
   - `useForm({ resolver: zodResolver(schema) })`; `departmentId` validado com `z.string().min(1)`, nunca `.uuid()`.
   - Layout de modal longo: `DialogContent className="max-w-lg overflow-hidden p-0 gap-0 flex flex-col max-h-[90vh]"`, campos em `<ScrollArea className="flex-1">`, rodapé de botões fora do scroll. Não adicionar outro X.
   - Botões desabilitados com `isPending`; "Salvar rascunho" e "Emitir" separados, emitir só com a permissão `…:issue` (`hasPermission`).
   - Rascunho (`sha256Hash` nulo) editável; emitido aparece só leitura com cadeado.
   - Componentes só de `src/components/ui/` (shadcn); não editar esses arquivos.

4. **Mensagens de erro orientadoras.** O backend devolve `{ error: CODIGO, message }`. Traduzir com uma função ao lado de `describeDocumentError` (`src/lib/official-documents.ts`):
   ```ts
   } catch (error) {
     toast({ title: describeDocumentError(error), variant: "destructive" });
   }
   ```
   Para o Frotas, `describeFleetError` com os códigos `FLEET_*`, preferindo a `message` do backend e com fallback no formato "o que aconteceu + dado + o que fazer" (tabela "Mensagens que orientam" da TASK 8). Nunca "Erro 409" ou "operação inválida". Aviso de estouro de ficha QDD é amarelo e **não** bloqueia o envio.

5. **Rota** em `src/router.tsx`, dentro do bloco de `ProtectedRoute`, sempre aninhada (padrão real de Diárias):
   ```tsx
   {
     element: <ModuleGate module="dailyAllowances" />,
     children: [{
       element: <PermissionGate anyOf={["dailyAllowances:read", "dailyAllowances:write", "dailyAllowances:issue", "dailyAllowances:delete"]} />,
       children: [
         { path: "/daily-allowances", element: <DailyAllowanceList /> },
       ],
     }],
   },
   ```
   Tela pública (frentista): fora do `ProtectedRoute`, sob `PublicLayout`, como a validação de documentos.

6. **Sidebar**: item em `NAV_SECTIONS` (`src/components/layout/Sidebar.tsx`) com o mesmo `module` e `anyOf` da rota:
   ```tsx
   {
     label: "Frota",
     to: "/fleet-fuelings",
     icon: <Fuel className="h-4 w-4" />,
     module: "fleetFuelings",
     anyOf: ["fleetFuelings:read", "fleetFuelings:write", "fleetFuelings:issue", "fleetFuelings:delete"],
   },
   ```
   Módulo novo também precisa de rótulo em `src/lib/moduleLabels.ts`.

7. **Teste de componente** ao lado do componente (`Componente.test.tsx`). Infra pronta em `vitest.config.ts` (jsdom, `src/test/setup.ts` com `jest-dom`); são os primeiros testes do repo. Mockar o módulo de hooks, não o `fetch`:
   ```tsx
   import { render, screen } from '@testing-library/react'
   import userEvent from '@testing-library/user-event'
   import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
   import { vi } from 'vitest'

   vi.mock('@/hooks/useFleet', () => ({ useCreateFleetAuthorization: () => ({ mutateAsync: vi.fn(), isPending: false }) }))

   function renderWithQuery(ui: React.ReactElement) {
     const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
     return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
   }

   test('mostra a mensagem orientadora quando a placa não confere', async () => {
     renderWithQuery(<PlateStep token="t" />)
     await userEvent.type(screen.getByLabelText(/placa/i), 'abc1d23')
     await userEvent.click(screen.getByRole('button', { name: /continuar/i }))
     expect(await screen.findByText(/restam 2 tentativas/i)).toBeInTheDocument()
   })
   ```
   Consultar por papel/rótulo (`getByRole`, `getByLabelText`), nunca por classe CSS. Componentes que usam `useMe`/rotas precisam de `MemoryRouter` e de mock de `@/hooks/useMe`.

## Checklist

- [ ] `src/lib/api/<dominio>.ts` + `src/hooks/use<Dominio>.ts`, sem `any`, `Decimal` como string
- [ ] Rota `ProtectedRoute → ModuleGate → PermissionGate`, mesmos `module`/`anyOf` do item da sidebar
- [ ] Item em `NAV_SECTIONS` e rótulo em `moduleLabels.ts` (se módulo novo)
- [ ] Formulário em `Dialog` com `zodResolver`, rodapé fixo, botões com `isPending`
- [ ] Erros via `describe…Error` com mensagem orientadora; estouro QDD só avisa
- [ ] Teste de componente cobrindo caminho feliz e uma mensagem de erro
- [ ] `npm run lint`, `npm run type-check`, `npm test` passando
