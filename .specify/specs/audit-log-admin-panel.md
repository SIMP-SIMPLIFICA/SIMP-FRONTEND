# Especificação — Painel de Auditoria (Tela de Logs)

- **Repositório:** `SIMP-FRONTEND`
- **Depende de:** `SIMP-BACKEND` — `GET /api/v1/audit` já existe e não precisa de nenhuma mudança (ver §1.2). Este é, portanto, um épico **frontend-only**, especificado aqui por regra da Constituição do backend (Princípio V): features cross-cutting vão em `SIMP-BACKEND/.specify/`; features frontend-only que não mexem em contrato de API vão aqui.
- **Constitution aplicável:** `SIMP-BACKEND/.specify/memory/constitution.md` v1.1.0
- **Status:** Rascunho para validação arquitetural

---

## 1. Contexto

O sistema audita 44+ pontos diferentes (emissão de documento, suspensão de
organização, alteração de vigência, upload de ata, exclusão de processo,
suplementação de dotação, etc.) numa trilha imutável (`audit_logs`, com
trigger de banco que bloqueia `UPDATE`/`DELETE` — ver
`prisma/sql/002-immutable-audit.sql`). O backend expõe essa trilha por uma
rota paginada e filtrável há tempo. **Não existe nenhuma tela que a
consuma.** Hoje, conferir "quem fez o quê" só é possível abrindo o registro
do Postgres diretamente ou lendo o array `auditLog` que algumas telas de
detalhe (Processo Virtual, por exemplo) embutem para o PRÓPRIO recurso —
não existe uma visão consolidada, pesquisável, da organização inteira.

Isto é dívida técnica conhecida e deliberadamente não construída até agora
sem pedido explícito — este documento é a resposta a esse pedido.

### 1.1 Levantamento do estado atual (verificado no código)

| Artefato | Situação |
|---|---|
| `GET /api/v1/audit` (`audit.controller.ts` + `audit.routes.ts`) | **Já existe e funciona.** Paginado (`page`, `limit`, máx. 100), filtros `userId`, `organizationId` (só Super Admin), `action` (substring, case-insensitive), `resource` (exato), `startDate`/`endDate`. Devolve `{ data: AuditLogRecord[], meta: { total, page, limit, totalPages } }`. |
| Isolamento multi-tenant | **Já correto e testado** (`audit-organization-scope.e2e.spec.ts`) — reproduz e fecha um bug real já registrado (dois escritores gravando `audit_logs`, um deles sem `organizationId`; ver `audit-log-organization-id-bug.md` no histórico do projeto). Admin comum só vê a própria organização; Super Admin vê todas e pode filtrar por uma. |
| Permissões | `audit:read` ("Acessar logs de auditoria") e `audit:export` ("Baixar logs de auditoria") já existem no catálogo (`constants/permissions.ts`) e já gateiam a rota (`requireAnyPermission(['audit:read', 'audit:export'])`). **Nenhuma delas tem endpoint de exportação implementado** — ver achado §1.5. |
| Escritor canônico | `audit-ledger.service.ts` grava `metadata` (JSON livre). |
| Escritor legado | `audit.service.ts`, "hoje sem nenhum chamador" (comentário do próprio arquivo), mas os REGISTROS ANTIGOS que ele já gravou continuam na tabela com `oldData`/`newData` preenchidos em vez de `metadata` — ver achado §1.3. |
| `src/lib/api/audit.ts`, `useAudit.ts` | **Não existem.** Nenhum cliente de API para esta rota. |
| Tela dedicada | **Não existe.** Nenhuma rota, nenhum componente. |
| `router.tsx` | `/admin/*` é protegido por `<SuperAdminRoute />` — só Super Admin entra. Demais áreas usam `<PermissionGate anyOf={[...]}>` — ver achado §1.2. |
| `GET /api/v1/admin/organizations` | Já existe e já é consumido por `AdminPanel.tsx` (`{ data: Org[] }`, com `id`/`name`). Reaproveitável para o seletor de organização do Super Admin, sem endpoint novo. |

### 1.2 Achado — `/admin/*` é Super-Admin-only, mas `audit:read` NÃO é

O bug já corrigido (`audit-organization-scope.e2e.spec.ts`) prova que a
intenção do backend é que um **admin comum** (`audit:read` na própria
organização) enxergue a trilha do seu município. Se esta tela nascer dentro
de `/admin/*`, herda o `<SuperAdminRoute />` e fica invisível para o público
que o backend foi corrigido para atender.

**Recomendação:** rota própria fora de `/admin` — por exemplo `/auditoria` —
protegida por `<PermissionGate anyOf={["audit:read", "audit:export"]}>`
(mesmo padrão já usado em `/configuracoes` e `/protocolos`). O filtro de
organização (Select) só aparece na tela quando `me.isSuperAdmin` for
verdadeiro — o resto da tela é idêntico para os dois perfis, porque é o
PRÓPRIO backend quem já decide o que cada um pode ver.

Se a intenção de quem pediu "painel admin" for deliberadamente restringir
esta tela ao Super Admin (por exemplo, por decisão de produto e não por
limitação técnica), a alternativa é registrá-la em `/admin/auditoria` — mas
isso significa que administradores comuns, mesmo com `audit:read`, nunca
teriam onde exercer essa permissão pela interface. **Esta decisão de
produto deve ser confirmada antes da Fase 1** (ver Plano).

### 1.3 Achado — dois formatos de payload no mesmo campo "detalhes"

Registros gravados pelo escritor canônico (a imensa maioria, e todo
registro novo) trazem `metadata` preenchido e `oldData`/`newData` nulos.
Registros antigos, gravados pelo escritor legado antes de sua
desativação, podem trazer o inverso. A tela de detalhe do registro (US-05)
**não pode presumir qual dos dois formatos vai chegar** — precisa exibir o
que existir (`oldData`/`newData` como um diff lado a lado quando presentes;
senão `metadata` como um bloco JSON só de leitura) e omitir o que estiver
vazio, sem quebrar nem mostrar "null" cru na tela.

### 1.4 Achado — teto de paginação do backend é 100

`filterSchema` do backend recusa (`400`) qualquer `limit` acima de 100.
Este projeto já teve, registrado como padrão recorrente, o bug de telas que
pedem `limit` acima do teto do backend e abrem vazias **sem erro nenhum**
visível ao usuário (Select/dashboard do financeiro, três ocorrências ainda
não corrigidas em outras telas). A tela de auditoria **não pode reproduzir
esse padrão**: paginação real (página a página, ou "carregar mais"), nunca
uma tentativa de "trazer tudo de uma vez" com um `limit` arbitrariamente
alto.

### 1.5 Achado — `audit:export` existe, mas não há rota de exportação

A permissão já existe e já é aceita pela rota de listagem, mas não há
`GET /api/v1/audit/export` nem equivalente. Duas saídas possíveis:

- **(a) Exportação client-side (recomendada):** o filtro já aplicado gera um
  CSV no navegador a partir dos registros já carregados na página atual (ou
  de uma busca com os mesmos filtros e paginação sequencial até um teto
  razoável, ex.: 1000 linhas). Nenhuma rota nova no backend.
- **(b) Endpoint de exportação novo no backend** (CSV/XLSX/PDF, com o
  motor universal se for PDF) — fora do escopo deste documento, que é
  frontend-only; exigiria uma spec própria em `SIMP-BACKEND/.specify/`.

Este documento assume **(a)** — ver FR-010 e o Plano.

---

## 2. Histórias de usuário

**US-01 — Admin comum confere a própria trilha.**
Como secretário de administração, quero abrir uma tela e ver as últimas
ações registradas na minha organização, para responder a uma diligência do
controle interno sem pedir para alguém consultar o banco.

**US-02 — Super Admin investiga uma organização específica.**
Como Super Admin da plataforma, quero filtrar a trilha por uma organização
específica, para investigar um incidente relatado por um município sem
misturar com o histórico de todas as outras prefeituras.

**US-03 — Investigar uma ação específica.**
Como administrador, quero combinar filtros (usuário, ação, recurso,
período) para encontrar rapidamente um evento específico — "quem excluiu
este processo, e quando" — sem rolar centenas de linhas.

**US-04 — Levar um recorte para fora do sistema.**
Como controlador interno, quero exportar o resultado filtrado como CSV,
para anexar a um processo de prestação de contas ou enviar ao Tribunal de
Contas.

**US-05 — Entender o que mudou.**
Como administrador, quero abrir um registro específico e ver claramente o
que ele alterou (dados antes/depois, ou o contexto livre da ação), sem
precisar interpretar JSON cru.

---

## 3. Requisitos Funcionais

### Listagem (US-01, US-02, US-03)

- **FR-001**: A tela DEVE listar a trilha de auditoria via `GET
  /api/v1/audit`, paginada de verdade (nunca solicitando `limit` acima de
  100 — achado §1.4).
- **FR-002**: A tela DEVE exibir, por registro: data/hora, autor (nome
  completo ou "Sistema" quando `userId` for nulo), ação, recurso (+ id do
  recurso, quando houver), sucesso/falha, e organização (só relevante e só
  exibida quando `me.isSuperAdmin`).
- **FR-003**: A tela DEVE aceitar filtros combinados: usuário (busca por
  nome/e-mail, resolvendo para `userId`), ação (texto livre — o backend já
  casa por substring), recurso (texto livre), período (data inicial e
  final). Filtros SEMPRE aplicados no servidor, nunca escondendo linhas só
  na página carregada.
- **FR-004**: Quando `me.isSuperAdmin`, a tela DEVE oferecer um filtro de
  organização (Select alimentado por `GET /api/v1/admin/organizations`,
  endpoint já existente). Para administrador comum, este filtro NÃO
  aparece — o próprio backend já restringe à organização do token.
- **FR-005**: Registros com `success: false` DEVEM se distinguir
  visualmente dos bem-sucedidos (ex.: cor de alerta), e exibir
  `errorMessage` quando presente.
- **FR-006**: A ausência de resultados (filtro sem correspondência) DEVE
  mostrar um estado vazio explicativo, nunca uma tabela em branco sem
  contexto.

### Detalhe do registro (US-05)

- **FR-007**: Cada linha DEVE abrir um painel/diálogo de detalhe com o
  registro completo: `ipAddress`, `userAgent`, `method`/`endpoint` quando
  presentes, e o conteúdo de `oldData`/`newData` OU `metadata` — o que
  existir (achado §1.3), nunca os dois tratados como obrigatórios.
- **FR-008**: Quando `oldData` E `newData` estiverem presentes, a tela
  DEVE apresentá-los de forma comparável (lado a lado ou "antes → depois"),
  não como dois blocos JSON soltos sem relação visual entre si.
- **FR-009**: Campos ausentes ou vazios (`null`) NÃO DEVEM aparecer como
  "null" cru — omitidos ou com um rótulo como "Não informado".

### Exportação (US-04)

- **FR-010**: A tela DEVE oferecer exportação em CSV do recorte filtrado
  atual, gerada no CLIENTE (achado §1.5), disponível apenas para quem tem
  `audit:export`.
- **FR-011**: O CSV exportado DEVE declarar, no próprio arquivo (cabeçalho
  ou primeira linha), quais filtros estavam ativos — mesmo princípio já
  aplicado aos relatórios de Diárias e Processos deste sistema: um recorte
  parcial sem essa declaração parece a lista completa.

### Permissão e acesso

- **FR-012**: A rota DEVE ser protegida por `PermissionGate anyOf={["audit:read", "audit:export"]}` — nunca aninhada sob `/admin` (achado §1.2), a menos que a decisão de produto pendente ali seja resolvida em sentido contrário.
- **FR-013**: O botão de exportar (FR-010) só aparece para quem tem
  `audit:export`; a listagem em si só exige `audit:read`.

---

## 4. Entidades e formato de dados

### `AuditLogRecord` (o que `GET /api/v1/audit` devolve por item)

```ts
interface AuditLogRecord {
  id: string
  userId: string | null
  action: string          // ex: 'DAILY_ALLOWANCE_ISSUED', 'AUTUOU', 'ORGANIZATION_SUSPENDED'
  resource: string        // ex: 'DAILY_ALLOWANCE', 'VIRTUAL_PROCESS', 'ORGANIZATION'
  resourceId: string | null
  method: string | null
  endpoint: string | null
  ipAddress: string
  userAgent: string | null
  oldData: unknown | null   // legado — ver achado §1.3
  newData: unknown | null   // legado — ver achado §1.3
  metadata: unknown | null  // canônico — ver achado §1.3
  success: boolean
  errorMessage: string | null
  createdAt: string
  organizationId: string | null
  user: { id: string; firstName: string | null; lastName: string | null; email: string } | null
  organization: { id: string; name: string } | null
}
```

`action` e `resource` são texto livre no banco (não um enum) — a UI NÃO
deve tratá-los como uma lista fechada de opções (nada de `<Select>` com
valores fixos); um filtro de texto é o design correto, porque novos valores
de `action` nascem toda vez que um módulo novo audita algo.

---

## 5. Critérios de Sucesso

- **SC-001**: Um administrador comum abre a tela e vê, sem configurar nada,
  as ações mais recentes da PRÓPRIA organização.
- **SC-002**: Um Super Admin filtra por uma organização específica e o
  resultado corresponde exatamente ao filtro — nenhuma linha de outra
  organização aparece.
- **SC-003**: Combinar usuário + ação + período devolve exatamente a
  interseção dos três, aplicada no servidor.
- **SC-004**: Nenhuma requisição desta tela pede `limit` maior que 100.
- **SC-005**: O CSV exportado abre corretamente numa planilha e contém
  exatamente os registros que a tela mostrava no momento da exportação,
  com os filtros declarados no arquivo.
- **SC-006**: Um registro com `oldData`/`newData` (legado) e um registro
  com `metadata` (atual) abrem os dois sem erro no console e sem "null"
  visível na tela.

---

## 6. Assumptions

- **A decisão de placement (achado §1.2) será resolvida antes da Fase 1** —
  este documento assume a recomendação (rota própria, fora de `/admin`),
  mas o plano trata isso como o primeiro passo, não como já decidido.
- **Exportação é CSV client-side**, não XLSX nem PDF — é o suficiente para
  "anexar a um processo" (US-04) sem inventar uma dependência nova; se o
  time preferir consistência com os relatórios de Diárias (que já exportam
  XLSX+PDF-manifesto), isso é extensão futura, não bloqueio.
- **Sem exportação de todo o histórico da organização de uma vez** — o
  recorte exportado é sempre o que os filtros ativos definem, paginado
  internamente até um teto (sugestão: 1000 linhas) para não travar o
  navegador nem violar o teto de 100 por requisição.
- **Sem tela de configuração de retenção/expurgo** — a trilha é imutável por
  desenho (Princípio VIII); nenhuma interface deste épico cria caminho de
  exclusão.

## 7. Fora de Escopo

- Endpoint de exportação no backend (achado §1.5, opção b).
- Alertas ativos sobre eventos de auditoria (ex.: notificar em tempo real
  uma ação sensível) — é outro épico, se vier a existir.
- Migração ou backfill dos registros legados (`oldData`/`newData` →
  `metadata`) — a tela lida com os dois formatos como estão, sem tocar no
  dado histórico.
- Qualquer mudança no schema Prisma, no `audit-ledger.service.ts` ou na
  rota `/api/v1/audit` — este documento não pede nenhuma.
