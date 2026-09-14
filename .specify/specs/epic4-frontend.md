# Especificação — Épico 4 Frontend: Departamentos, QDD e Diárias

- **Repositório:** `SIMP-FRONTEND`
- **Depende de:** `SIMP-BACKEND` — Épico 4 Fases 1–5 (`a70855f`)
- **Constitution aplicável:** `SIMP-BACKEND/.specify/memory/constitution.md` v1.1.0
- **Status:** Rascunho para validação arquitetural

---

## 1. Contexto

O backend do Épico 4 entregou o modelo de dados completo (`Department.cnpj`,
`Department.chiefName`, `BudgetLaw`, `QddItem`, `CouncilDepartment`,
`Beneficiary.cpf`) e o fluxo de Diárias de ponta a ponta: emissão com snapshot
da dotação e alerta de estouro, prestação de contas com Anexo II próprio, e
relatórios em PDF e ZIP (planilha + PDF-Manifesto).

A interface não acompanhou. Hoje o frontend tem uma listagem de departamentos
sem página de detalhe, um formulário de diária que desconhece setor e dotação, e
uma listagem sem filtros nem noção de situação.

### 1.1 Levantamento do estado atual (verificado no código)

| Artefato | Situação |
|---|---|
| `src/pages/Departments.tsx` | Listagem + `DepartmentFormDialog` + `DepartmentMembersSheet`. **Não existe página de detalhe nem rota `/departamentos/:id`.** |
| `src/pages/daily-allowances/DailyAllowanceList.tsx` | 258 linhas. Sem filtros, sem coluna de situação; distingue apenas emitida/rascunho por `isIssued()`. |
| `src/pages/daily-allowances/DailyAllowanceForm.tsx` | 368 linhas, formulário plano. Desconhece `departmentId` e `qddItemId`. |
| `src/pages/daily-allowances/BeneficiaryCombobox.tsx` | Existe e já tem a "memória" de beneficiários. Sem CPF. |
| `src/lib/api/daily-allowances.ts` | Desatualizado: não conhece `status`, `isLate`, `budgetOverrun`, `departmentId`, `qddItemId` nem os campos de prestação de contas. |
| `src/lib/api/departments.ts` | Não conhece `cnpj` nem `chiefName`. |
| Kit de UI | `tabs`, `select`, `checkbox`, `dialog`, `sheet`, `table`, `badge`, `command`, `calendar`, `popover` disponíveis. **Não há componente de intervalo de datas.** |
| Download binário | `apiRequest(path, { responseType: 'blob' })` é o caminho estabelecido, com renovação de token. |

### 1.2 Achado crítico — a API assumida não existe

Quatro das cinco fases deste escopo consomem endpoints que **ainda não foram
escritos**. Verificado por inspeção de `src/routes`, `src/controllers` e
`src/services` do backend:

| # | Endpoint que a UI precisa | Existe? |
|---|---|---|
| B-1 | `GET /departments/:id` (um setor) | ❌ só há listagem |
| B-2 | `cnpj` e `chiefName` aceitos em criar/editar setor | ❌ fora do schema Zod |
| B-3 | CRUD de `QddItem` | ❌ **não há serviço, controller nem rota** |
| B-4 | Vínculos do setor (conselhos, convênios, processos) | ❌ |
| B-5 | `departmentId` em convênio e processo virtual | ❌ fora do schema Zod |
| B-6 | Exportar Dossiê do Setor (PDF) | ❌ |
| B-7 | `cpf` em criar/buscar beneficiário | ❌ fora do schema Zod |

Leitura de `cnpj`/`chiefName` já funciona (o controller usa `include`, não
`select`, então os escalares retornam). **Escrita, não.**

**Consequência:** este documento especifica a interface, mas a Fase 0 do plano é
backend. Iniciar pela UI produziria telas contra endpoints imaginários.

---

## 2. Histórias de usuário

**US-01 — Dossiê do setor.**
Como secretário de administração, quero abrir um departamento e ver, num só
lugar, seus conselhos, convênios e processos, para responder a uma diligência do
controle interno sem varrer quatro telas.

**US-02 — Dotação na mão de quem executa.**
Como contador, quero lançar e corrigir as fichas do QDD numa tabela ágil, sem
formulário modal por linha, porque lanço dezenas de fichas na abertura do
exercício.

**US-03 — Diária que nasce lastreada.**
Como servidor do setor de pessoal, quero que ao escolher o departamento o
sistema já me mostre o ordenador de despesa e só me ofereça as fichas daquele
setor, para não imputar a despesa na dotação errada.

**US-04 — Cobrança de prestação de contas.**
Como controlador interno, quero enxergar na listagem quem está em atraso, para
cobrar antes que o prazo vire apontamento.

**US-05 — Recorte compartilhável.**
Como chefe de gabinete, quero filtrar as diárias e mandar o link para o
procurador, e quero que ele veja exatamente o mesmo recorte.

---

## 3. Requisitos funcionais

### Fase 1 — Detalhe do Departamento

- **FR-001** Criar rota `/departamentos/:id` e a página `DepartmentDetailPage`,
  com cabeçalho (nome, código, CNPJ, ordenador de despesa) e abas.
- **FR-002** Abas de vínculo: **Conselhos**, **Convênios**, **Processos
  Virtuais**, cada linha navegando para o registro de origem.
- **FR-003** Aba vazia exibe estado vazio explicativo, nunca tabela em branco.
- **FR-004** Os modais de Convênio e de Processo Virtual passam a ter
  "Secretaria/Departamento" como `<Select>` populado por
  `departmentService.list()`.
- **FR-005** O campo de departamento nesses modais é **obrigatório na criação** e
  pré-selecionado quando o modal é aberto de dentro do detalhe de um setor.
- **FR-006** Modal "Exportar Dossiê do Setor" com caixas de seleção das **seis**
  seções: Servidores, CNPJ, Conselhos, QDD, Convênios e Processos Virtuais
  (Q-4). Pelo menos uma seção precisa estar marcada.
- **FR-007** O dossiê é gerado **pelo backend**, pelo motor universal de PDF, com
  QR Code e rodapé de validação. O frontend apenas baixa o arquivo.

### Fase 2 — Motor Orçamentário (QDD)

- **FR-008** Aba "Orçamento & QDD" no detalhe do departamento.
- **FR-009** Tabela editável em linha para `QddItem`: Ficha, Fonte,
  Projeto/Atividade, Natureza da Despesa, Valor Orçado. Edição salva por linha.
- **FR-010** Linha nova é acrescentada no topo em modo de edição; `Esc` descarta.
- **FR-011** Valores monetários formatados com
  `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
- **FR-012** A entrada aceita `1.234,56` e `1234.56`; o que trafega para a API é
  número, nunca string formatada.
- **FR-013** Ficha duplicada no mesmo setor e exercício (HTTP 409) exibe o erro
  na própria linha, sem perder o que foi digitado.
- **FR-014** Excluir ficha já usada por diária emitida é recusado pelo backend
  (`onDelete: Restrict`); a UI traduz o erro para pt-BR.

### Fase 3 — Formulário de Diária

- **FR-015** `DailyAllowanceForm` reorganizado em três blocos visuais.
- **FR-016 · Bloco 1 — Órgão Concedente:** `<Select>` de departamento.
  Ao selecionar, exibe **em somente leitura** o CNPJ e o ordenador de despesa
  (`chiefName`) do setor.
- **FR-017** Setor sem CNPJ ou sem ordenador cadastrado mostra aviso discreto com
  link para o cadastro, e **não** bloqueia o preenchimento.
- **FR-018 · Bloco 2 — Beneficiário:** `BeneficiaryCombobox` com a memória atual,
  acrescido de CPF.
- **FR-019** O CPF é exibido **sempre mascarado** (`***.123.456-**`), inclusive
  no combobox e em telas de detalhe.
- **FR-020 · Bloco 3 — Controle Orçamentário:** `<Select>` de ficha do QDD
  filtrado pelo departamento do Bloco 1.
- **FR-021** Trocar o departamento **limpa** a ficha selecionada. Manter uma
  ficha de outro setor produziria despesa imputada na dotação errada.
- **FR-022** Enquanto não houver departamento escolhido, o Bloco 3 fica
  desabilitado com a instrução "Selecione o órgão concedente".
- **FR-023** Setor sem nenhuma ficha cadastrada exibe estado vazio com link para
  a aba de QDD.

### Fase 4 — Dashboard e Prestação de Contas

- **FR-024** A listagem exibe a situação vinda da API (`PENDING` / `ISSUED` /
  `ACCOUNTED`) em `Badge`, substituindo o par emitida/rascunho.
- **FR-025** Badge "Atrasado" quando `isLate === true`. O valor vem **pronto do
  servidor**; o frontend nunca recalcula prazo a partir do relógio local.
- **FR-026** Badge "Estouro de dotação" quando `budgetOverrun === true`.
- **FR-027** Ação "Prestar Contas" abre modal com os dados da diária **em somente
  leitura**; só "Data da Prestação" e "Relatório de Atividades" são editáveis.
- **FR-028** A ação só aparece para `status === 'ISSUED'`.
- **FR-029** Botão "Baixar Anexo I" habilitado quando há `sha256Hash`.
- **FR-030** Botão "Baixar Anexo II" **visível apenas** para
  `status === 'ACCOUNTED'`.
- **FR-031** HTTP 409 (`ALREADY_ACCOUNTED`, `ALREADY_ISSUED`) vira toast em pt-BR
  com a mensagem do backend, seguido de recarga da linha.

### Fase 5 — Filtros e Exportação

- **FR-032** Barra de filtros: Nome, CPF, Período (intervalo), Destino, Situação
  e Departamento.
- **FR-033** O estado dos filtros vive nos **search params da URL**; recarregar
  ou compartilhar o endereço reproduz o mesmo recorte.
- **FR-034** O campo de CPF aceita digitação mascarada e envia **só dígitos**.
- **FR-035** Busca por nome com *debounce* de 400 ms, para não disparar uma
  requisição por tecla.
- **FR-036** Botões "Exportar PDF" e "Exportar Excel" enviam **os mesmos filtros
  ativos na URL**.
- **FR-037** O Excel baixa um **.zip** (planilha + PDF-Manifesto). O rótulo do
  botão e o *toast* de sucesso precisam dizer isso, senão o usuário estranha a
  extensão.
- **FR-038** Exportação com zero resultados avisa antes de baixar, em vez de
  entregar um arquivo vazio.

### Transversais

- **FR-039** Permissões: botões e ações escondidos (não apenas desabilitados)
  quando falta a permissão — `dailyAllowances:issue` para emitir e prestar
  contas, `departments:write` para o QDD.
- **FR-040** Idioma: código, arquivos, tipos e rotas em inglês; texto de tela em
  pt-BR (Padrão Híbrido Estrito).
- **FR-041** Nenhum PDF ou planilha é gerado no cliente. Toda exportação vem do
  motor universal do backend.
- **FR-042** A dependência `xlsx` é removida do frontend, e os dois consumidores
  atuais (`src/utils/export.ts`, `NewMessageModal.tsx`) passam a consumir o
  backend (Q-2). Enquanto ela existir, FR-041 é letra morta: basta um `import`
  para nascer um caminho de exportação sem hash nem rastro.

---

## 4. Critérios de sucesso

- **SC-001** Abrir um departamento mostra conselhos, convênios e processos em
  até 3 cliques a partir do menu, sem trocar de tela.
- **SC-002** Lançar 20 fichas de QDD não exige abrir 20 modais.
- **SC-003** Escolhido o departamento, o formulário de diária só oferece fichas
  daquele setor — impossível imputar na dotação de outro.
- **SC-004** Uma diária vencida aparece marcada como atrasada sem que o usuário
  precise conferir data nenhuma.
- **SC-005** Um link de listagem filtrada, colado em outro navegador autenticado,
  reproduz o mesmo recorte.
- **SC-006** O ZIP exportado abre com a planilha e o manifesto, e o hash impresso
  no manifesto confere com o da planilha.
- **SC-007** Nenhum CPF completo aparece em tela ou em documento exportado.

---

## 5. Questões — DECIDIDAS

**Q-1 — `fetch()` cru para o dossiê (pedido no escopo) contraria decisão vigente.**
O escopo pede `fetch()` + `Authorization: Bearer` + `.blob()`, "não usar o
cliente `api`". Ocorre que o projeto já tem `apiRequest(path, { responseType:
'blob' })`, que **é** o caminho binário e ainda trata a renovação do token. Uma
duplicata exatamente assim existiu em `protocols.ts` e foi removida no commit de
Fase 0 justamente por não renovar o token: com a sessão expirada, o download
falhava em silêncio.
**Recomendação:** usar `apiRequest` com `responseType: 'blob'`.
**✅ DECIDIDO — usar `apiRequest(..., { responseType: 'blob' })`.** Todo download
binário do épico passa por ele. Nenhum `fetch` cru com token montado à mão.

**Q-2 — `xlsx@0.18.5` no cliente.**
`src/utils/export.ts` e `NewMessageModal.tsx` geram planilha no navegador. Isso
concorre com o caminho do manifesto assinado e contraria FR-041. A versão também
é antiga.
**Recomendação:** migrar esses dois consumidores para exportação pelo backend e
remover a dependência, em épico próprio.
**✅ DECIDIDO — migrar agora.** `src/utils/export.ts` e `NewMessageModal.tsx`
passam a consumir o motor de exportação do backend, e `xlsx` é desinstalada.
Fonte única de verdade. Isso acrescenta uma fase ao plano (ver Fase 6).

**Q-3 — Onde mora o CPF do beneficiário.**
O cadastro de beneficiário é hoje um combobox que cria por nome. Para receber
CPF, ou o combobox ganha um segundo campo ao criar, ou passa a existir uma tela
de cadastro de beneficiários.
**Recomendação:** campo adicional no próprio combobox ao criar um novo nome;
tela dedicada só se surgir demanda de manutenção em massa.
**✅ DECIDIDO — campo no combobox**, na criação rápida. Sem tela dedicada.

**Q-4 — Seções do dossiê.**
Servidores, CNPJ, Conselhos e QDD estão no escopo. Faltam convênios e processos
virtuais, que são justamente as abas novas do detalhe.
**Recomendação:** incluir as duas seções.
**✅ DECIDIDO — incluir.** O dossiê tem **seis** seções: Servidores, CNPJ,
Conselhos, QDD, Convênios e Processos Virtuais. Retrato fiel de tudo o que está
vinculado ao setor.

---

## 6. Fora de escopo

- Interface de `BudgetLaw` (LOA/PPA/LDO) — o modelo existe, a tela fica para o
  Épico 5.
- Empenho, liquidação e pagamento.
- Aplicativo móvel e visualização offline.
- Assinatura digital ICP-Brasil nos anexos.
- Importação de QDD por planilha.
