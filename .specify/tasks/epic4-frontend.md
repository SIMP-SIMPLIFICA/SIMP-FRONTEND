# Tarefas — Épico 4 Frontend

- **Plano:** `.specify/plans/epic4-frontend.md`
- **Convenção:** um commit por tarefa. `[BE]` = `SIMP-BACKEND`; as demais são
  `SIMP-FRONTEND`. `[P]` = paralelizável com a tarefa anterior.

---

## Fase 0 — Pré-requisitos de API (bloqueante)

- [ ] **T001** `[BE]` `GET /departments/:id` com `cnpj`, `chiefName` e contagem de vínculos. 404 fora da organização.
- [ ] **T002** `[BE]` `cnpj` e `chiefName` nos schemas Zod de criar/editar setor, com validação de dígito verificador do CNPJ.
- [ ] **T003** `[BE]` `qdd-item.service.ts` — CRUD escopado por organização; P2002 de `[departmentId, year, ficha]` vira erro de domínio.
- [ ] **T004** `[BE]` `qdd-item.controller.ts` + `qdd-item.routes.ts` sob `departments:read` / `departments:write`.
- [ ] **T005** `[BE]` Testes de `QddItem`: unicidade da ficha, isolamento entre organizações, recusa de exclusão de ficha já usada.
- [ ] **T006** `[BE]` `GET /departments/:id/councils`, `/covenants`, `/virtual-processes`.
- [ ] **T007** `[BE]` `departmentId` nos schemas de convênio e processo virtual, conferindo a organização do setor.
- [ ] **T008** `[BE]` `GET /departments/:id/dossier` **pelo motor universal**, com as **seis** seções por query param (servidores, CNPJ, conselhos, QDD, convênios, processos — Q-4), registrado em `ExportedDocument`.
- [ ] **T009** `[BE]` Teste E2E do dossiê: rodapé de validação presente e seções não pedidas ausentes do PDF.
- [ ] **T010** `[BE]` `cpf` em criar/buscar beneficiário, normalizado para dígitos; busca exata.
- [ ] **T011** `[BE]` Rodar `type-check`, `lint`, unitários e E2E. **Portão da Fase 0.**

---

## Fase 1 — Detalhe do Departamento

- [ ] **T012** Estender `src/lib/api/departments.ts`: `cnpj`, `chiefName`, `getById`, vínculos e dossiê.
- [ ] **T013** `DepartmentDetailPage` com cabeçalho e casca das abas; rota `/departamentos/:id` no `router.tsx`, sob `PermissionGate` de `departments:read`.
- [ ] **T014** Navegação da listagem para o detalhe.
- [ ] **T015** `[P]` `CouncilsTab` com estado vazio e link para o conselho.
- [ ] **T016** `[P]` `CovenantsTab`, idem.
- [ ] **T017** `[P]` `VirtualProcessesTab`, idem.
- [ ] **T018** `DepartmentSelect` reaproveitável, alimentado por `departmentService.list()`.
- [ ] **T019** Trocar o campo de departamento do `CovenantFormDialog` pelo `DepartmentSelect`; obrigatório na criação.
- [ ] **T020** Mesma troca no modal de Processo Virtual.
- [ ] **T021** `ExportDossierDialog` com as seis caixas de seleção (Q-4); exige ao menos uma marcada.
- [ ] **T022** Ligar o download do dossiê por `apiRequest(..., { responseType: 'blob' })` (Q-1), com estado de carregamento e erro em pt-BR.
- [ ] **T023** Validação da Fase 1: `tsc`, `lint`, `build`.

---

## Fase 2 — Motor Orçamentário (QDD)

- [ ] **T024** `src/utils/currency.ts` — `formatBRL` e `parseBRL` (aceitar `1.234,56` e `1234.56`).
- [ ] **T025** `[P]` Testes de `currency.ts`, incluindo entrada malformada e valor nulo.
- [ ] **T026** `src/lib/api/qdd-items.ts` com os tipos do backend.
- [ ] **T027** `QddRow` isolado: modos leitura/edição, estado próprio, **sem API ainda**.
- [ ] **T028** `QddTab`: listagem, linha nova no topo, `Esc` descarta.
- [ ] **T029** Ligar o `QddRow` à API; salvar no `blur` ou no `Enter`, com indicação visível.
- [ ] **T030** Tratar 409 de ficha duplicada na própria linha, preservando o digitado.
- [ ] **T031** Tratar a recusa de exclusão de ficha em uso, com mensagem em pt-BR.
- [ ] **T032** Esconder as ações de escrita sem `departments:write`.
- [ ] **T033** Validação da Fase 2: `tsc`, `lint`, `build`.

---

## Fase 3 — Formulário de Diária

- [ ] **T034** `src/utils/cpf.ts` — `maskCpf` (`***.123.456-**`), `normalizeCpf`, máscara de digitação.
- [ ] **T035** `[P]` Testes de `cpf.ts`: CPF curto, com máscara, nulo.
- [ ] **T036** Atualizar `src/lib/api/daily-allowances.ts` com `status`, `isLate`, `budgetOverrun`, `departmentId`, `qddItemId`, snapshots e campos de prestação de contas.
- [ ] **T037** `GrantingBodyBlock`: `DepartmentSelect` e o espelho somente leitura de CNPJ e ordenador.
- [ ] **T038** Aviso discreto para setor sem CNPJ ou sem ordenador, com link para o cadastro; sem bloquear.
- [ ] **T039** `BeneficiaryBlock`: `BeneficiaryCombobox` com CPF mascarado e campo de CPF na criação rápida dentro do próprio combobox (Q-3).
- [ ] **T040** `BudgetBlock`: `<Select>` de fichas filtrado pelo departamento; desabilitado enquanto não houver setor.
- [ ] **T041** `resetField('qddItemId')` ao trocar de departamento.
- [ ] **T042** Estado vazio do Bloco 3 com link para a aba de QDD.
- [ ] **T043** Remontar o `DailyAllowanceForm` sobre os três blocos, preservando o fluxo de edição de rascunho.
- [ ] **T044** Validação da Fase 3: `tsc`, `lint`, `build`.

---

## Fase 4 — Dashboard e Prestação de Contas

- [ ] **T045** `StatusBadges`: situação, "Atrasado" e "Estouro de dotação", todos lidos da API.
- [ ] **T046** Substituir o par emitida/rascunho da listagem pela situação de três estados.
- [ ] **T047** `AccountForDialog` com os dados da diária em somente leitura e só os dois campos editáveis.
- [ ] **T048** Ligar o `POST /:id/account-for`; tratar 409 com toast e recarga da linha.
- [ ] **T049** Exibir a ação "Prestar Contas" só em `ISSUED` e só com `dailyAllowances:issue`.
- [ ] **T050** Botão "Baixar Anexo I" (há `sha256Hash`) e "Baixar Anexo II" (**só** em `ACCOUNTED`).
- [ ] **T051** Validação da Fase 4: `tsc`, `lint`, `build`.

---

## Fase 5 — Filtros e Exportação

- [ ] **T052** `useSearchParamsState`: lê e escreve na URL, sem estado espelhado.
- [ ] **T053** `[P]` `date-range-picker` sobre `react-day-picker`, `calendar` e `popover`.
- [ ] **T054** `DailyAllowanceFilters` com os seis campos, ligados à URL.
- [ ] **T055** *Debounce* de 400 ms em nome e destino; CPF envia só dígitos.
- [ ] **T056** Ligar a listagem aos filtros da URL, com `page` também no endereço.
- [ ] **T057** Botão "Exportar PDF" enviando os filtros ativos.
- [ ] **T058** Botão "Exportar Excel", baixando `.zip` com nome legível e toast explicando o conteúdo.
- [ ] **T059** Avisar antes de exportar quando o recorte não tem nenhum registro.
- [ ] **T060** Validação da Fase 5: `tsc`, `lint`, `build`.

---

## Fase 6 — Quitação da dívida do `xlsx` (Q-2)

- [ ] **T061** Levantar exatamente o que `src/utils/export.ts` e `NewMessageModal.tsx` exportam hoje: colunas, filtros e origem dos dados.
- [ ] **T062** `[BE]` Rota de exportação equivalente, pelo motor universal, no padrão ZIP com PDF-Manifesto.
- [ ] **T063** `[BE]` Teste E2E dessa rota: hash do manifesto confere com o da planilha.
- [ ] **T064** Reescrever `src/utils/export.ts` como download via `apiRequest(..., { responseType: 'blob' })`.
- [ ] **T065** Migrar o `NewMessageModal.tsx` para a nova rota.
- [ ] **T066** **Desinstalar `xlsx`** e conferir que nenhum `import` sobrou. É esta tarefa que fecha a porta — migrar e deixar a biblioteca instalada só adia o problema.
- [ ] **T067** Validação da Fase 6: `tsc`, `lint`, `build`.

---

## Fechamento

- [ ] **T068** Conferência manual dos SC-001 a SC-007 da spec.
- [ ] **T069** Atualizar a Constitution: registrar a quitação da violação de motor único de exportação no cliente.

---

## Contagem

| Fase | Tarefas |
|---|---|
| 0 — API (backend) | 11 |
| 1 — Detalhe do setor | 12 |
| 2 — QDD | 10 |
| 3 — Formulário | 11 |
| 4 — Dashboard | 7 |
| 5 — Filtros | 9 |
| 6 — Dívida do `xlsx` | 7 |
| Fechamento | 2 |
| **Total** | **69** |
