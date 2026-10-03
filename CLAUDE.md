# CLAUDE.md — SIMP Frontend

Guia de contexto absoluto para o Claude Code trabalhar neste repositório. Leia integralmente antes de qualquer tarefa. O passo a passo de tela nova de módulo está na skill `.claude/skills/simp-tela-modulo/`.

---

## Visão geral

Frontend do **SIMP — Sistema Integrado de Modernização e Processos**. SaaS B2B multi-tenant para prefeituras e órgãos públicos municipais.

**Stack:** React 19 + Vite 7 + TypeScript + TanStack Query v5 + shadcn/ui + Tailwind CSS + React Router v7

**Colaboradores:**
- **Marllon** — auth, financeiro, sidebar, RBAC UI
- **Carlos** — workspaces avançados, comunicação, processos virtuais, convênios, protocolos, GED/biblioteca, Frotas

---

## Regras obrigatórias

- **Node 22** (`.nvmrc`): `nvm use 22` antes de qualquer comando npm/npx.
- **Branch:** trabalho em branch própria criada a partir do `develop`, entregue por PR (ver "Fluxo de Git"). Nunca commitar direto em `develop` ou `main`. `develop` tem auto-deploy na Vercel. Verificar `git branch` antes do primeiro commit da sessão.

```bash
npm run dev                  # vite
npm run type-check           # tsc -b — type check REAL
npm run lint                 # eslint . — zero erros (warnings ok)
npm run build                # tsc -b && vite build
npm test                     # vitest (jsdom + Testing Library; src/**/*.{test,spec}.{ts,tsx})
npx vitest run src/components/fleet/PlateInput.test.tsx   # um arquivo
npx vitest run -t "nome do teste"                         # um teste pelo nome
```

> **ATENÇÃO:** `tsc --noEmit` não verifica nada neste projeto — o `tsconfig.json` raiz tem `"files": []` e só referencia `tsconfig.app.json`/`tsconfig.node.json`. O check real é `tsc -b` (é o que `npm run type-check` roda; ambos os tsconfigs têm `noEmit: true`, então nada é escrito em `dist/`).
>
> **Testes:** a infraestrutura (Vitest + jsdom + `@testing-library/react` + `user-event` + `jest-dom`, setup em `src/test/setup.ts`) está pronta, mas ainda **não existe nenhum arquivo de teste**. O Frotas traz os primeiros.

---

## TypeScript

- **Proibido** `any` explícito — o ESLint quebra o CI (`@typescript-eslint/no-explicit-any`). Nada de `as any`.
- Se o backend devolve um campo que o tipo não declara, adicionar ao tipo (ex.: `signedUrl?: string`). Os tipos não são compartilhados com o backend; são mantidos à mão em `src/lib/api/*.ts` e `src/types/`.

---

## Data fetching — TanStack Query v5

Todo dado do backend passa por TanStack Query; nunca `fetch` direto em componente. Par obrigatório por domínio: serviço puro em `src/lib/api/<dominio>.ts` (sobre `api`/`apiRequest` de `src/lib/api.ts`) + hooks em `src/hooks/use<Dominio>.ts` com uma constante `KEY` e `invalidateQueries({ queryKey: [KEY] })` no `onSuccess` das mutations. Exemplo real: `src/lib/api/daily-allowances.ts` + `src/hooks/useDailyAllowances.ts`. PDF/ZIP: `apiRequest<Blob>(url, { responseType: 'blob' })`.

O backend limita `limit` a **100**; pedir mais devolve 400 e a tela abre vazia sem erro visível.

---

## Uploads

Nunca montar URL de arquivo com `${API_URL}/uploads/...`; usar sempre a `signedUrl` devolvida pelo backend.

---

## Providers, shadcn/ui e padrões de UI

- Providers globais em `src/components/layout/AppLayout.tsx` (`QueryClientProvider`, `AuthProvider`, `UniversalFinanceModalContext`, modal universal de Processos). Verificar antes de criar outro.
- Componentes shadcn em `src/components/ui/` — **não editar** à mão; adicionar com `npx shadcn@latest add <componente>`.
- Preferir `Dialog`/`Sheet` a navegar para fora do contexto. Não duplicar o X do `DialogContent`.
- Modal com formulário longo: `DialogContent` com `flex flex-col max-h-[90vh] overflow-hidden p-0`, conteúdo em `<ScrollArea className="flex-1">` e rodapé de botões fora do scroll (sempre visível).
- Toasts: `toast({ title })` / `toast({ title, variant: 'destructive' })` de `@/hooks/use-toast`. Erros de documento oficial passam por `describeDocumentError` (`src/lib/official-documents.ts`), que traduz o `error` (código) do backend em mensagem orientadora.
- Desabilitar botão e mostrar spinner durante mutation (`isPending`).

---

## Estado, auth e guards

- Identidade e permissões vêm do cache `["auth","me"]`: `const { data: me } = useMe()` → `me.user.isSuperAdmin`, `me.user.permissions`. Funções puras em `src/lib/permissions.ts` (`hasAnyPermission(me, [...])`).
- **Guards de rota** em `src/router.tsx`, sempre aninhados como layout: `ProtectedRoute` → `ModuleGate module="x"` → `PermissionGate anyOf={[...]}` → página. Esconder da sidebar não basta; a URL também precisa ser protegida.
- **Sidebar** data-driven: `NAV_SECTIONS` em `src/components/layout/Sidebar.tsx`, cada item com `module` e `anyOf`.
- **Módulos** (chaves exatas, estilos misturados): `tasks, finance, communication, virtual_processes, calendar, notes, departments, library, covenants, protocols, councils, support, dailyAllowances, fleetFuelings`. Padrão ao criar organização: `tasks, finance, communication, calendar, notes, departments, library, covenants, dailyAllowances, fleetFuelings`. Manuais (super admin): `virtual_processes, protocols, councils, support`. Rótulos em `src/lib/moduleLabels.ts`.

---

## Fluxos de negócio

- **Protocolos** (`GenerateProtocolModal.tsx`): `COMUNICACAO` (Sequencial ou Aleatório, por setor) ou `NORMATIVO` (sempre sequencial, setor `CENTRAL`, sem destinatário). Após gerar: copiar número ou anexar PDF — `libraryService.upload` e depois `updateStatus({ status: 'EMITIDO', libraryDocumentId })`. A restrição de quem pode emitir é no backend.
- **Convênios × Processos Virtuais:** N:M com link/unlink nos dois detalhes. Criar Tipo de Convênio cria automaticamente a Origem de Processo Virtual (no backend).
- **Documento oficial** (Diárias, Frota): rascunho editável enquanto `sha256Hash` é nulo; emitido, o backend devolve 409 a qualquer alteração.
- Deep link de notificações via `?msgId=`; modal de categorias/contas financeiras via `useUniversalFinanceModal()`.

---

## Invariantes do SIMP (nunca violar)

Valem para os dois repositórios; o detalhe de backend está no CLAUDE.md do SIMP-BACKEND.

1. `organizationId` nunca é enviado pelo frontend no corpo, na query ou na URL — o backend o tira do token.
2. `Department.id` é `nanoid` (IDs mistos `cuid`/`nanoid`/`uuid`): nunca validar `departmentId` como UUID em schema de formulário.
3. Documento `ISSUED` é imutável no backend; a UI esconde a edição, mas nunca é a única barreira. PDF sempre baixado do original.
4. Saldo QDD é calculado no backend na leitura; estouro **avisa, não bloqueia** (aviso amarelo, nunca botão desabilitado).
5. Conferir o prefixo da rota em `SIMP-BACKEND/src/config/routes.ts` antes de assumir `/api/v1`.
6. Toda escrita do Frotas é auditada no backend na mesma transação; o frontend não grava auditoria.
7. Dinheiro e litros chegam como string decimal (Prisma `Decimal`): nunca fazer conta com `Number`/float em valor que volta ao backend — o total oficial é sempre calculado no servidor.
8. Rotas novas do backend usam Zod `.strict()`: enviar só os campos do contrato. Erros chegam como `{ error: CODIGO, message }` — exibir a `message` orientadora; nunca mostrar stack, "Erro 409" ou "operação inválida".
9. Tarefa só termina com `npm run lint`, `npm run type-check` e `npm test` passando.

---

## Módulo Frotas

Especificações na pasta `docs/frotas/` do workspace (fora deste repositório, em `../docs/frotas/`):

- **`decisoes.md` — decisões que se sobrepõem à spec.** Ler primeiro.
- `Simplifica Frotas — Especificação Técnica de Desenvolvimento.md` — TASKs 1 a 10 (telas na TASK 8, testes na TASK 10).
- `Simplifica Frotas — Especificação Funcional e Arquitetural.md` — domínio e fluxos.

Como trabalhamos:
- **Uma TASK por sessão**, na ordem da spec técnica.
- O `FleetFueling` atual (`src/pages/fleet-fuelings/`, `useFleetFuelings`, `src/lib/api/fleet-fuelings.ts`) **será apagado e recriado do zero** na TASK 1. Telas novas em `src/pages/fleet/`, componentes em `src/components/fleet/`, tela pública do frentista em `src/pages/public/`. URLs atuais mantidas.
- Regras de código do Frotas: `.claude/rules/fleet.md`. Tela nova: skill `simp-tela-modulo`.

---

## Fluxo de Git

- **Claude** cria a branch a partir do `develop` atualizado, faz os commits (mensagens no padrão do repo: `tipo(escopo): descrição` em português), faz o push e abre o PR com `gh`, sempre com **base `develop`**. O PR tem título claro e uma descrição com: o que mudou, por quê, como foi testado e o que o revisor deve olhar.
- **O humano** faz o merge pelo GitHub. O Claude **nunca** faz merge, **nunca** faz push direto em `develop` ou `main` e **nunca** usa force push.
- Uma branch e um PR por assunto. Se um PR depende de outro (inclusive um PR do SIMP-BACKEND), a descrição diz qual.
- Antes do push: `npm run lint`, `npm run type-check` e `npm test` passando.
- **Push:** o `origin` é SSH e a chave pode não estar carregada. Não alterar o `origin`. Rodar `gh auth setup-git` e:
  ```bash
  REPO=https://github.com/SIMP-SIMPLIFICA/SIMP-FRONTEND.git
  git fetch $REPO '+refs/heads/*:refs/remotes/origin/*'   # antes de criar a branch: develop atualizado
  git push $REPO <branch>
  git fetch $REPO '+refs/heads/<branch>:refs/remotes/origin/<branch>'   # push pela URL não atualiza origin/<branch>
  git branch --set-upstream-to=origin/<branch> <branch>
  gh pr create --base develop --head <branch> --title "..." --body "..."
  ```

---

## CI/CD e Deploy

- `ci.yml` — Validator (lint + tsc) → Test (vitest, `passWithNoTests`) → Build · `security.yml` — npm audit + CodeQL + TruffleHog + Claude Security Review · `failure-analyst.yml` — CI falha → Claude Haiku → Issue + Discord.
- Vercel, auto-deploy em `develop`; `vercel.json` faz rewrite de SPA e aplica headers de segurança. Variáveis: `VITE_API_URL`, `VITE_SENTRY_DSN`, `VITE_TURNSTILE_SITE_KEY`. Secrets GitHub: `ANTHROPIC_API_KEY`, `DISCORD_WEBHOOK_URL`.

---

## Módulos e responsabilidades

| Módulo | Responsável | Status |
|--------|-------------|--------|
| Auth / Login · Dashboard · Users / Roles RBAC · Sidebar / Layout · Financeiro · Profile | Marllon | ✅ |
| Workspaces + Kanban + Tasks · Comunicação · Processos Virtuais · Convênios · Protocolos | Carlos | ✅ |
| Notificações (SSE) · Calendar / Notes | Carlos | ✅ |
| GED / Biblioteca | Carlos | 🔴 pendente refinamento |
| Frotas (substitui `fleet-fuelings`) | Carlos | 🚧 em especificação |

Também existem: Diárias, Conselhos, Suporte, Departamentos (com dossiê), Auditoria (super admin) e o Portal Público de validação.
