# Tarefas — Painel de Auditoria (Tela de Logs)

- **Plano:** `.specify/plans/audit-log-admin-panel.md`
- **Convenção:** um commit por tarefa. Tudo em `SIMP-FRONTEND` — não há
  tarefa de backend neste épico. `[P]` = paralelizável com a tarefa
  anterior.

---

## Fase 0 — Decisão de placement (bloqueante)

- [ ] **T001** Confirmar com quem pediu a tela: rota própria
  (`PermissionGate anyOf={["audit:read", "audit:export"]}`, disponível
  para admin comum e Super Admin — recomendação da spec §1.2) OU
  restrita a `/admin/*` (só Super Admin). Registrar a resposta aqui antes
  de iniciar a Fase 1.

---

## Fase 1 — Listagem, filtros e paginação

- [ ] **T002** `src/lib/api/audit.ts` (novo): tipo `AuditLogRecord`
  (espelho exato do §4 da spec — todos os campos, incluindo os que podem
  vir `null`), tipo `AuditLogFilter`, `auditService.list(filter)` via
  `GET /api/v1/audit` com query string. **Nunca** aceitar/enviar `limit`
  acima de 100.
- [ ] **T003** `src/hooks/useAudit.ts` (novo): `useAuditLogs(filter)`
  com `useQuery`.
- [ ] **T004** `src/pages/auditoria/AuditLogPage.tsx` (novo): casca da
  página, tabela com as colunas do FR-002 (data/hora, autor, ação,
  recurso + id, sucesso/falha, organização condicional), estados de
  carregando/erro/vazio.
- [ ] **T005** `[P]` Paginação real (página atual, total de páginas,
  navegação) — nunca um "carregar tudo" com limit alto.
- [ ] **T006** `[P]` Filtros de texto: usuário (resolvendo por
  nome/e-mail para `userId`, reaproveitando endpoint de usuários já
  existente), ação, recurso — nenhum como `<Select>` de opções fixas
  (ação/recurso são texto livre no banco).
- [ ] **T007** `[P]` Filtro de período (`startDate`/`endDate`).
- [ ] **T008** Filtro de organização — `Select` alimentado por `GET
  /api/v1/admin/organizations` (já existe, já usado em
  `AdminPanel.tsx`), visível SOMENTE quando `me.isSuperAdmin`.
- [ ] **T009** Badge/destaque visual para `success === false`, com
  `errorMessage` visível na linha ou no hover.
- [ ] **T010** Registrar a rota em `router.tsx` (caminho e guarda
  definidos pela T001) e o item correspondente em `Sidebar.tsx`,
  condicionado à permissão.
- [ ] **T011** Validação da Fase 1: `npx tsc --noEmit`, `npm run lint`,
  **`npm run build`** (os três — `tsc --noEmit` sozinho não é suficiente
  neste projeto, ver nota do Épico 8).

---

## Fase 2 — Detalhe do registro

- [ ] **T012** `AuditLogDetailDialog.tsx` (novo): abre ao clicar numa
  linha; exibe `ipAddress`, `userAgent`, `method`/`endpoint` quando
  presentes.
- [ ] **T013** Bloco de dados alterados: `oldData`+`newData` como
  "antes → depois" quando os dois existirem; `metadata` como JSON
  formatado somente leitura quando só ele existir; nada quando nenhum
  existir (sem "null" visível).
- [ ] **T014** Destaque para `errorMessage` quando `success === false`.
- [ ] **T015** Validação da Fase 2: `tsc`, `lint`, `build`; testar
  manualmente com um registro do formato canônico (`metadata`) e, se
  houver algum no ambiente de dev, um do formato legado
  (`oldData`/`newData`).

---

## Fase 3 — Exportação CSV

- [ ] **T016** `src/utils/csv-export.ts` (novo, genérico): função que
  recebe linhas + cabeçalhos e devolve um Blob CSV para download.
- [ ] **T017** Botão "Exportar", visível só com
  `hasPermission(me, "audit:export")`, buscando sequencialmente os
  mesmos filtros da tela (até um teto de ~1000 linhas, avisando o
  usuário se o filtro atual ultrapassar isso).
- [ ] **T018** CSV inclui linha/cabeçalho com os filtros ativos no
  momento da exportação (FR-011).
- [ ] **T019** Validação da Fase 3: `tsc`, `lint`, `build`; exportar um
  recorte pequeno e conferir o CSV manualmente.

---

## Gate final

- [ ] **T020** `npx tsc --noEmit`, `npm run lint`, `npm run build` — os
  três limpos.
- [ ] **T021** Roteiro manual contra os Critérios de Sucesso da spec
  (SC-001 a SC-006): testar com um usuário admin comum E com um Super
  Admin, se possível em duas organizações diferentes para confirmar o
  isolamento (SC-002).
