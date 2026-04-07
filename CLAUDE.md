# CLAUDE.md — SIMP Frontend

Instruções para o Claude Code trabalhar neste repositório. Leia antes de qualquer tarefa.

## Visão geral

Frontend do SIMP — Sistema Integrado de Gestão Municipal. SaaS B2B para prefeituras.

**Stack:** React 19 + Vite 7 + TypeScript + TanStack Query v5 + shadcn/ui + Tailwind CSS + React Router v7

**Colaboradores:**
- **Marllon** — auth, financeiro, sidebar, RBAC UI
- **Carlos** — workspaces avançados, comunicação, processos virtuais, uploads

---

## Regras obrigatórias

### Node
```bash
nvm use 22   # SEMPRE antes de qualquer comando npm/npx
```

### Branch
- Trabalhar **sempre** em `develop`
- **Nunca** commitar diretamente em `main`
- `develop` tem auto-deploy na Vercel — cada push vai para produção dev
- Verificar `git branch` antes do primeiro commit da sessão

### Antes de commitar
```bash
npx tsc -b          # type check real — NÃO usar tsc --noEmit
npx eslint .        # zero erros obrigatório (warnings são ok)
npm run build       # confirmar que o build passa
```

**Atenção:** `tsc --noEmit` **não verifica nada** neste projeto. O `tsconfig.json` raiz tem `"files": []`. O check real é `npx tsc -b` (build mode, segue referências para `tsconfig.app.json`).

---

## TypeScript

- **Proibido** usar `any` explícito — ESLint quebra o CI (`@typescript-eslint/no-explicit-any`)
- Se o backend retorna um campo que o tipo não declara, adicionar o campo ao tipo (ex: `signedUrl?: string`)
- Nunca usar `as any` como atalho — definir o tipo correto

---

## Data fetching — TanStack Query v5

Todo dado do backend deve passar por TanStack Query. Nunca usar `fetch`/`axios` diretamente em componentes.

```typescript
// Hook padrão
const { data, isLoading } = useMinhaQuery()

// Mutação
const { mutateAsync } = useMinhaMutation()
```

Invalidar queries após mutations:
```typescript
queryClient.invalidateQueries({ queryKey: ['minhaQuery'] })
```

---

## Uploads — Cloudflare R2

**Nunca** construir URLs de arquivo com `${API_URL}/uploads/...`. O backend usa R2 e retorna signed URLs.

```typescript
// CORRETO
href={file.signedUrl}

// ERRADO
href={`${API_URL}/uploads/${file.fileName}`}
```

---

## Estrutura de contextos e providers

Providers globais ficam em `src/components/layout/AppLayout.tsx`. Antes de criar um novo provider, verificar se já existe um adequado.

Providers existentes:
- `QueryClientProvider` — TanStack Query
- `AuthProvider` — autenticação
- `UniversalFinanceModalContext` — modal inline de categorias/contas financeiras

---

## shadcn/ui

Usar componentes existentes em `src/components/ui/` antes de criar novos. Os componentes são gerados pelo shadcn — não modificar os arquivos em `src/components/ui/` diretamente (risco de conflito ao atualizar).

Para adicionar um novo componente shadcn:
```bash
npx shadcn@latest add <componente>
```

---

## Navegação e UX

- Preferir modais/sheets a navegação para fora do contexto atual
- Usar `useUniversalFinanceModal()` para abrir o modal de categorias/contas dentro do formulário de lançamento
- Deep linking de notificações deve manter o contexto do usuário

---

## CI/CD

### Pipelines ativos
- `ci.yml` — Validator (lint + tsc) → Test (vitest, passWithNoTests) → Build
- `security.yml` — npm audit + CodeQL + TruffleHog + Claude Security Review (PRs)
- `failure-analyst.yml` — CI falha → Claude Haiku analisa → Issue + Discord

### Secrets necessários (GitHub)
`ANTHROPIC_API_KEY`, `DISCORD_WEBHOOK_URL`

### Deploy (Vercel — branch `develop`)
- Auto-deploy a cada push em `develop`
- `vercel.json` na raiz configura SPA routing (rewrites para `/index.html`)
- Variáveis de ambiente Vercel: `VITE_API_URL`, `VITE_SENTRY_DSN`

---

## Módulos e responsabilidades

| Módulo | Responsável | Status |
|--------|-------------|--------|
| Auth / Login | Marllon | ✅ |
| Dashboard | Marllon | ✅ |
| Users/Roles RBAC | Marllon | ✅ |
| Sidebar / Layout | Marllon | ✅ |
| Financeiro (lançamentos, relatórios, contas, categorias) | Marllon | ✅ |
| Workspaces + Kanban + Tasks | Carlos | ✅ |
| Comunicação (ofícios, memorandos) | Carlos | ✅ |
| Processos Virtuais | Carlos | ✅ |
| Biblioteca | Carlos | 🔴 pendente |
| Notificações (SSE) | Carlos | ✅ |
| Calendar / Notes | Carlos | ✅ |
| Profile | Marllon | ✅ |
