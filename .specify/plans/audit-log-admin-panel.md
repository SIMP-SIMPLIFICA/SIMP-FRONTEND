# Plano de Implementação — Painel de Auditoria (Tela de Logs)

- **Spec:** `.specify/specs/audit-log-admin-panel.md`
- **Repositórios tocados:** `SIMP-FRONTEND` apenas — o backend já está pronto (spec §1.1).

---

## Estratégia

Ao contrário do Épico 4 Frontend (que tinha uma Fase 0 bloqueante no
backend), aqui **não há nenhuma lacuna de API** — `GET /api/v1/audit` já
existe, já é multi-tenant e já é testado. O trabalho é inteiramente
frontend, em três fases pequenas:

```
Fase 0 (decisao)  ──►  Fase 1 (listagem + filtros + paginacao)  ──►  Fase 2 (detalhe do registro)  ──►  Fase 3 (exportacao CSV)
```

A Fase 0 não é código — é a confirmação da decisão de placement (spec
§1.2) antes de escrever a rota, porque ela muda ONDE o arquivo de rota
entra em `router.tsx` e se `SuperAdminRoute` é usado ou não.

---

## Fase 0 — Decisão de placement (bloqueante, não é código)

- Confirmar com quem pediu a tela: rota própria protegida por
  `PermissionGate anyOf={["audit:read", "audit:export"]}` (recomendação da
  spec, disponível para admin comum E Super Admin), ou deliberadamente
  restrita a `/admin/*` (só Super Admin, contrariando o que o backend já
  suporta).
- **Esta decisão determina o texto exato da Fase 1** — os passos abaixo
  assumem a recomendação (rota própria). Se a decisão for a outra, troque
  `PermissionGate` por `SuperAdminRoute` e o caminho da rota de
  `/auditoria` para `/admin/auditoria` — o resto do plano não muda.

---

## Fase 1 — Listagem, filtros e paginação

**Entrega:** rota `/auditoria` navegável, com tabela paginada e filtros
funcionais contra o backend real.

1. `src/lib/api/audit.ts` (novo): tipo `AuditLogRecord` (espelho exato do
   §4 da spec), tipo `AuditLogFilter` (`page`, `limit`, `userId?`,
   `organizationId?`, `action?`, `resource?`, `startDate?`, `endDate?`), e
   `auditService.list(filter)` chamando `GET /api/v1/audit` com
   `URLSearchParams` — mesmo padrão de `daily-allowances.ts`/
   `virtual-processes.ts` (`buildQuery`/query string manual, sem lib
   nova).
2. `src/hooks/useAudit.ts` (novo): `useAuditLogs(filter)` via
   `useQuery`, `queryKey: ['audit', filter]`.
3. `src/pages/auditoria/AuditLogPage.tsx` (novo): cabeçalho, barra de
   filtros (texto para usuário/ação/recurso, `Input type="date"` para
   período, `Select` de organização SÓ quando `me.isSuperAdmin` —
   reaproveitar `GET /api/v1/admin/organizations` que `AdminPanel.tsx`
   já consome), tabela com as colunas do FR-002, paginação real (página
   atual + total, nunca um `limit` acima de 100 — spec §1.4).
   Estados de carregando/erro/vazio no mesmo padrão de
   `DailyAllowanceList.tsx` (blocos dedicados, não um "carregando..."
   solto).
4. Resolver filtro de usuário: campo de texto que busca por nome/e-mail
   e resolve para `userId` — reaproveitar o endpoint de listagem de
   usuários já existente (`/api/v1/users` ou equivalente já usado em
   outra tela do admin) em vez de inventar um novo.
5. Badge de sucesso/falha (FR-005) e linha destacada quando
   `success === false`.
6. Registrar a rota em `router.tsx`, sob `PermissionGate
   anyOf={["audit:read", "audit:export"]}` (ou `SuperAdminRoute`,
   conforme a Fase 0), e um item correspondente em `Sidebar.tsx` — só
   visível para quem tem a permissão (mesmo padrão condicional já usado
   nos outros itens do menu).
7. Validação da Fase 1: `npx tsc --noEmit`, `npm run lint`, `npm run
   build` (não só `tsc --noEmit` — ver a lição registrada no commit do
   Épico 8: `tsc -b` em modo de projeto pega inconsistência que `tsc
   --noEmit` sozinho não pega).

---

## Fase 2 — Detalhe do registro

**Entrega:** clicar numa linha abre o registro completo, com
`oldData`/`newData`/`metadata` tratados sem presumir qual formato vai
chegar (spec §1.3, FR-007 a FR-009).

1. `AuditLogDetailDialog.tsx` (ou `Sheet`, a critério de quem implementa):
   `ipAddress`, `userAgent`, `method`/`endpoint` quando presentes.
2. Bloco de dados alterados: se `oldData` E `newData` existirem, renderizar
   como "antes → depois" (duas colunas, ou uma lista de chaves com os dois
   valores lado a lado). Se só `metadata` existir, um bloco JSON
   formatado (`<pre>` ou um visualizador simples), somente leitura. Nenhum
   dos dois é obrigatório — cobrir o caso de nenhum estar presente também
   (ação sem contexto adicional).
3. `errorMessage` exibido com destaque quando `success === false`.
4. Validação da Fase 2: `tsc`, `lint`, `build`; conferir manualmente um
   registro de cada formato (gerar um evento novo para o formato
   canônico; qualquer ação antiga do seed/ambiente de dev deve servir
   para o formato legado, se existir).

---

## Fase 3 — Exportação CSV

**Entrega:** botão "Exportar" (só para `audit:export`) que gera um CSV do
recorte filtrado atual, no navegador.

1. Função utilitária de export (novo arquivo, ex.:
   `src/utils/csv-export.ts`, genérico — não acoplado a auditoria, para
   ficar reaproveitável) que recebe linhas + cabeçalhos e devolve um
   Blob CSV.
2. Ao clicar em exportar: busca sequencial com os MESMOS filtros da tela
   (múltiplas páginas de até 100 registros, spec §1.4) até um teto
   (sugestão: 1000 linhas — acima disso, avisar o usuário para refinar o
   filtro em vez de tentar trazer tudo).
3. CSV inclui uma linha/cabeçalho declarando os filtros ativos (FR-011),
   mesmo princípio dos relatórios de Diárias.
4. Botão visível só com `hasPermission(me, "audit:export")`.
5. Validação da Fase 3: `tsc`, `lint`, `build`; exportar um recorte
   pequeno e conferir que o CSV abre corretamente e bate com o que a
   tela mostrava.

---

## Fora do plano (ver spec §7)

Nenhuma tarefa de backend. Se a Fase 3 evoluir para exportação
server-side (XLSX/PDF pelo motor universal) no futuro, isso é uma spec
nova em `SIMP-BACKEND/.specify/`, não uma extensão deste plano.
