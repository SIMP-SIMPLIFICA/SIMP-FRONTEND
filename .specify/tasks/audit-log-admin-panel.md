# Tarefas — Painel de Auditoria (Tela de Logs)

- **Plano:** `.specify/plans/audit-log-admin-panel.md`
- **Convenção:** um commit por tarefa. Tudo em `SIMP-FRONTEND` — não há
  tarefa de backend neste épico. `[P]` = paralelizável com a tarefa
  anterior.

---

## Fase 0 — Decisão de placement (bloqueante)

- [x] **T001** Confirmar com quem pediu a tela: rota própria
  (`PermissionGate anyOf={["audit:read", "audit:export"]}`, disponível
  para admin comum e Super Admin — recomendação da spec §1.2) OU
  restrita a `/admin/*` (só Super Admin). Registrar a resposta aqui antes
  de iniciar a Fase 1.

  **Decisão (2026-09-22):** rota própria — `PermissionGate
  anyOf={["audit:read", "audit:export"]}` em `/auditoria`, fora de
  `/admin/*`. Confirmado por quem pediu a tela junto com o próprio
  pedido de implementação, seguindo a recomendação da spec.

  **Revisão (2026-09-22, mesmo dia):** movida para `/admin/auditoria`
  sob `SuperAdminRoute` — só Dono do Sistema. Não foi correção de bug
  confirmado: investigação extensa (DB, resposta HTTP real de
  `/auth/me`, código-fonte de `PermissionGate`/`hasAnyPermission`,
  aba anônima) não encontrou nenhuma causa no que foi entregue — tudo
  verificado correto, ponta a ponta. A mudança foi decisão de produto
  para alinhar com o Épico 5 (painel do Dono do Sistema). **Se este
  épico precisar do admin comum na própria organização de novo, a
  recomendação original da spec §1.2 continua válida** — reabrir
  `/auditoria` com o `PermissionGate` acima, não a causa raiz do
  bloqueio relatado, que segue sem explicação.

---

## Fase 1 — Listagem, filtros e paginação

- [x] **T002** `src/lib/api/audit.ts` (novo): tipo `AuditLogRecord`
  (espelho exato do §4 da spec — todos os campos, incluindo os que podem
  vir `null`), tipo `AuditLogFilter`, `auditService.list(filter)` via
  `GET /api/v1/audit` com query string. **Nunca** aceitar/enviar `limit`
  acima de 100.
- [x] **T003** `src/hooks/useAudit.ts` (novo): `useAuditLogs(filter)`
  com `useQuery`.
- [x] **T004** `src/pages/auditoria/AuditLogPage.tsx` (novo): casca da
  página, tabela com as colunas do FR-002 (data/hora, autor, ação,
  recurso + id, sucesso/falha, organização condicional), estados de
  carregando/erro/vazio.
- [x] **T005** `[P]` Paginação real (página atual, total de páginas,
  navegação) — nunca um "carregar tudo" com limit alto.
- [x] **T006** `[P]` Filtros de texto: usuário (resolvendo por
  nome/e-mail para `userId`, reaproveitando endpoint de usuários já
  existente), ação, recurso — nenhum como `<Select>` de opções fixas
  (ação/recurso são texto livre no banco).
- [x] **T007** `[P]` Filtro de período (`startDate`/`endDate`).
- [x] **T008** Filtro de organização — `Select` alimentado por `GET
  /api/v1/admin/organizations` (já existe, já usado em
  `AdminPanel.tsx`), visível SOMENTE quando `me.isSuperAdmin`.
- [x] **T009** Badge/destaque visual para `success === false`, com
  `errorMessage` visível na linha ou no hover.
- [x] **T010** Registrar a rota em `router.tsx` (caminho e guarda
  definidos pela T001) e o item correspondente em `Sidebar.tsx`,
  condicionado à permissão.
- [x] **T011** Validação da Fase 1: `npx tsc --noEmit`, `npm run lint`,
  **`npm run build`** (os três — `tsc --noEmit` sozinho não é suficiente
  neste projeto, ver nota do Épico 8). — ver Gate final.

---

## Fase 2 — Detalhe do registro

- [x] **T012** `AuditLogDetailDialog.tsx` (novo): abre ao clicar numa
  linha; exibe `ipAddress`, `userAgent`, `method`/`endpoint` quando
  presentes.
- [x] **T013** Bloco de dados alterados: `oldData`+`newData` como
  "antes → depois" quando os dois existirem; `metadata` como JSON
  formatado somente leitura quando só ele existir; nada quando nenhum
  existir (sem "null" visível).
- [x] **T014** Destaque para `errorMessage` quando `success === false`.
- [ ] **T015** Validação da Fase 2: `tsc`, `lint`, `build`; testar
  manualmente com um registro do formato canônico (`metadata`) e, se
  houver algum no ambiente de dev, um do formato legado
  (`oldData`/`newData`). — checks estáticos ok (ver Gate final); teste
  manual com dado real do ambiente de dev **ainda pendente**, requer
  login.

---

## Fase 3 — Exportação CSV

- [x] **T016** `src/utils/csv-export.ts` (novo, genérico): função que
  recebe linhas + cabeçalhos e devolve um Blob CSV para download.
- [x] **T017** Botão "Exportar", visível só com
  `hasPermission(me, "audit:export")`, buscando sequencialmente os
  mesmos filtros da tela (até um teto de ~1000 linhas, avisando o
  usuário se o filtro atual ultrapassar isso).
- [x] **T018** CSV inclui linha/cabeçalho com os filtros ativos no
  momento da exportação (FR-011).
- [ ] **T019** Validação da Fase 3: `tsc`, `lint`, `build`; exportar um
  recorte pequeno e conferir o CSV manualmente. — checks estáticos ok
  (ver Gate final); exportação real **ainda pendente**, requer login.

---

## Gate final

- [ ] **T020** `npx tsc --noEmit`, `npm run lint`, `npm run build` — os
  três limpos.
- [ ] **T021** Roteiro manual contra os Critérios de Sucesso da spec
  (SC-001 a SC-006): testar com um usuário admin comum E com um Super
  Admin, se possível em duas organizações diferentes para confirmar o
  isolamento (SC-002).
