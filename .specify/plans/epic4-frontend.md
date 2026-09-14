# Plano de Implementação — Épico 4 Frontend

- **Spec:** `.specify/specs/epic4-frontend.md`
- **Repositórios tocados:** `SIMP-BACKEND` (Fase 0), `SIMP-FRONTEND` (Fases 1–5)

---

## Estratégia

A ordem é ditada por uma restrição dura: **quatro das cinco fases consomem
endpoints inexistentes** (achado §1.2 da spec). Por isso a Fase 0 é backend e é
bloqueante. Depois dela, cada fase entrega uma tela utilizável por inteiro, para
que a validação do usuário aconteça por incremento e não só no fim.

A Fase 1 constrói a `DepartmentDetailPage`, que é a casa das Fases 1 e 2. A
Fase 3 depende da Fase 2, porque o Bloco 3 do formulário precisa de fichas
cadastradas para ter o que oferecer.

```
Fase 0 (backend)  ──►  Fase 1 (detalhe)  ──►  Fase 2 (QDD)  ──►  Fase 3 (form)
                                                                      │
                                        Fase 4 (dashboard)  ◄─────────┘
                                                  │
                                        Fase 5 (filtros/exportação)
```

---

## Fase 0 — Pré-requisitos de API (BACKEND, bloqueante)

Sete lacunas. Nenhuma é grande; juntas são o caminho crítico do épico.

| # | Entrega | Observação |
|---|---|---|
| B-1 | `GET /departments/:id` | Com `cnpj`, `chiefName` e contagens dos vínculos. |
| B-2 | `cnpj` e `chiefName` nos schemas Zod de criar/editar setor | Validar CNPJ por dígito verificador, não só por formato. |
| B-3 | CRUD de `QddItem` | Serviço + controller + rotas, escopado por organização. Tratar P2002 de `[departmentId, year, ficha]` como 409. |
| B-4 | Vínculos do setor | `GET /departments/:id/{councils,covenants,virtual-processes}`. |
| B-5 | `departmentId` em convênio e processo virtual | Conferir que o setor é da mesma organização. |
| B-6 | `GET /departments/:id/dossier` | **Pelo motor universal** (`createOfficialPdf` ou `createTabularReportPdf`). **Seis** seções por query param (Q-4): servidores, CNPJ, conselhos, QDD, convênios e processos. Registrar em `ExportedDocument`. |
| B-7 | `cpf` em criar/buscar beneficiário | Guardar só dígitos; `normalizeCpf` já existe em `src/utils/cpf.util.ts`. |

**Proibido:** gerador de PDF isolado. O dossiê passa pelo motor universal, com
QR Code e rodapé de validação, como todo documento do sistema.

---

## Fase 1 — Detalhe do Departamento

**Entrega:** rota `/departamentos/:id`, cabeçalho, três abas de vínculo, modal de
dossiê, e o `<Select>` de setor nos modais de convênio e processo.

**Arquivos:**
- `src/pages/departments/DepartmentDetailPage.tsx` (novo)
- `src/pages/departments/tabs/{CouncilsTab,CovenantsTab,VirtualProcessesTab}.tsx` (novos)
- `src/pages/departments/ExportDossierDialog.tsx` (novo)
- `src/components/departments/DepartmentSelect.tsx` (novo, reaproveitável)
- `src/lib/api/departments.ts` (estender)
- `src/pages/convenios/CovenantFormDialog.tsx`, modal de processo virtual (editar)
- `src/router.tsx` (rota nova)

**Decisões:**
- `DepartmentDetailPage` é **página**, não `Sheet`. O endereço precisa ser
  compartilhável, e o dossiê é consulta demorada — uma gaveta lateral obrigaria
  a manter a listagem montada atrás.
- `DepartmentSelect` nasce como componente próprio porque três telas o usam.
- As abas usam Radix `tabs`, já no kit.

---

## Fase 2 — Motor Orçamentário (QDD)

**Entrega:** aba "Orçamento & QDD" com tabela editável em linha.

**Arquivos:**
- `src/pages/departments/tabs/QddTab.tsx` (novo)
- `src/pages/departments/QddRow.tsx` (novo)
- `src/lib/api/qdd-items.ts` (novo)
- `src/utils/currency.ts` (novo — formatar e interpretar pt-BR)

**Decisões:**
- Edição **em linha**, não modal: a spec exige lançar dezenas de fichas
  (US-02/SC-002), e um modal por linha transformaria isso em suplício.
- Estado de edição por linha, não global: uma linha em erro não pode travar as
  outras.
- `currency.ts` centraliza a conversão `1.234,56 → 1234.56`. Espalhar esse
  `replace` pelas telas é como nascem os erros de centavo.
- Sem salvamento automático: a gravação acontece no `blur` da linha ou no
  `Enter`, com indicação visível. Dinheiro público não se salva sozinho.

---

## Fase 3 — Formulário de Diária

**Entrega:** formulário em três blocos, com CNPJ/ordenador automáticos e fichas
filtradas.

**Arquivos:**
- `src/pages/daily-allowances/DailyAllowanceForm.tsx` (reescrever a estrutura)
- `src/pages/daily-allowances/blocks/{GrantingBodyBlock,BeneficiaryBlock,BudgetBlock}.tsx` (novos)
- `src/pages/daily-allowances/BeneficiaryCombobox.tsx` (estender com CPF)
- `src/utils/cpf.ts` (novo — máscara e normalização, espelho do utilitário do backend)
- `src/lib/api/{daily-allowances,beneficiaries,qdd-items}.ts` (estender)

**Decisões:**
- Quebrar o formulário em três componentes de bloco: o arquivo já tem 368 linhas
  e ganharia mais três seções.
- A dependência Bloco 1 → Bloco 3 é explícita no `watch('departmentId')` do
  react-hook-form, com `resetField('qddItemId')` na troca (FR-021).
- CNPJ e ordenador são **espelho, não campo**: vêm do setor e não entram no
  payload. O backend já rejeita `qddItemId` de outra organização.
- A máscara de CPF é só apresentação. O que trafega são dígitos.

---

## Fase 4 — Dashboard e Prestação de Contas

**Entrega:** situação e alertas na listagem, modal de prestação de contas, dois
botões de download.

**Arquivos:**
- `src/pages/daily-allowances/DailyAllowanceList.tsx` (editar)
- `src/pages/daily-allowances/AccountForDialog.tsx` (novo)
- `src/pages/daily-allowances/StatusBadges.tsx` (novo)

**Decisões:**
- `isLate` e `budgetOverrun` são **lidos**, nunca derivados no cliente. Recalcular
  prazo no navegador colocaria o relógio do usuário decidindo quem está em atraso
  — exatamente o que o cálculo no servidor existe para evitar.
- O modal mostra os dados da diária em somente leitura porque o backend congela o
  registro após a emissão: campos editáveis prometeriam uma alteração que
  voltaria 409.
- "Baixar Anexo II" **some** fora de `ACCOUNTED`, em vez de ficar desabilitado:
  um botão cinza sugere permissão faltando, e o caso é outro.

---

## Fase 5 — Filtros e Exportação

**Entrega:** barra de filtros sincronizada com a URL e dois botões de exportação.

**Arquivos:**
- `src/pages/daily-allowances/DailyAllowanceFilters.tsx` (novo)
- `src/hooks/useSearchParamsState.ts` (novo)
- `src/components/ui/date-range-picker.tsx` (novo — o kit não tem)
- `src/lib/api/daily-allowances.ts` (rotas de relatório)

**Decisões:**
- A URL é a **fonte única** do estado do filtro, não um `useState` espelhado.
  Dois estados divergiriam no botão "voltar" do navegador, e é justamente o
  compartilhamento do link que a US-05 pede.
- O intervalo de datas se apoia em `react-day-picker`, já instalado, sobre o
  `calendar` e o `popover` do kit.
- O ZIP é baixado como `.zip` com nome legível; o toast avisa o que há dentro.

---

---

## Fase 6 — Quitação da dívida do `xlsx` (Q-2)

**Entrega:** `xlsx` desinstalada do frontend e seus dois consumidores migrados
para exportação pelo backend.

**Arquivos:**
- `src/utils/export.ts` (reescrever como download via `apiRequest`)
- `src/components/communication/NewMessageModal.tsx` (editar)
- `package.json` (remover a dependência)
- `SIMP-BACKEND` — rota de exportação para o que hoje é gerado no cliente

**Decisões:**
- Vem **por último de propósito**: exige levantar o que cada consumidor exporta
  hoje e criar a rota equivalente no backend. Antecipá-la travaria as telas do
  épico por uma dívida que não é delas.
- A remoção da dependência é a parte que **fecha** a porta. Migrar os dois
  consumidores e deixar a biblioteca instalada só adia o problema: o próximo
  `import xlsx` recria o caminho paralelo.
- O formato de saída acompanha o padrão já decidido: planilha acompanhada de
  PDF-Manifesto, dentro de ZIP.

---

## Verificação contra a Constitution (v1.1.0)

| Princípio | Situação |
|---|---|
| II — Isolamento multi-tenant | ✅ Nenhum `organizationId` trafega do cliente. |
| III — Padrão Híbrido Estrito | ✅ Código em inglês, tela em pt-BR. |
| VII — Erros em camadas | ✅ 403/404/409 traduzidos; o `requestId` segue no toast de suporte. |
| VIII — Motor único de PDF | ⚠️ **Violação em quitação:** `xlsx` no cliente. Resolvida na Fase 6 (Q-2 = migrar agora). |
| VIII — LGPD antes de exibir | ✅ CPF mascarado em toda superfície (FR-019). |

---

## Riscos

| Risco | Mitigação |
|---|---|
| Fase 0 subestimada — sete endpoints são o caminho crítico | Fechá-la inteira antes de abrir a Fase 1; não paralelizar contra *mocks*. |
| Edição em linha é a peça de UI mais difícil do épico | Fazer o `QddRow` isolado primeiro, com estado próprio, antes de ligá-lo à API. |
| Filtro na URL entrando em laço de renderização | O hook lê da URL e escreve na URL; nenhum `useEffect` sincronizando dois estados. |
| Dossiê grande estourando o tempo da requisição | Limitar as seções; se passar de ~5 s, passar a geração para fila em épico próprio. |
| `xlsx` do cliente mascarar a origem de um arquivo | Decidir Q-2 antes da Fase 5, para não entregar dois caminhos de exportação. |

---

## Complexidade assumida

- **Um componente de intervalo de datas próprio.** Não há no kit, e as
  alternativas prontas trariam mais uma dependência para um controle que o
  `react-day-picker` já sustenta.
- **Três componentes de bloco no formulário de diária.** Mais arquivos, porém o
  acoplamento Bloco 1 → Bloco 3 fica explícito em vez de escondido num
  componente de quase 600 linhas.
