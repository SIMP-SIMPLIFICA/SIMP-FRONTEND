# SIMP Frontend

Frontend do **SIMP — Sistema Integrado de Gestão Municipal**. Plataforma SaaS B2B para administração municipal.

**Stack:** React 19 · Vite 7 · TypeScript · TanStack Query v5 · shadcn/ui · Tailwind CSS · React Router v7

**Repositório backend:** [SIMP-BACKEND](https://github.com/SIMP-SIMPLIFICA/SIMP-BACKEND)

---

## Pré-requisitos

- Node 22 (`nvm use 22`)
- Backend SIMP rodando (local ou Render dev)

---

## Setup local

```bash
# 1. Instalar dependências
nvm use 22
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Editar VITE_API_URL com a URL do backend

# 3. Iniciar servidor de desenvolvimento
npm run dev
```

Aplicação disponível em `http://localhost:5173`

---

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `VITE_API_URL` | ✅ | URL do backend (ex: `http://localhost:3000`) |
| `VITE_SENTRY_DSN` | opcional | DSN do Sentry para error tracking |

---

## Comandos

```bash
# Desenvolvimento
npm run dev              # Servidor com hot-reload

# Build
npm run build            # Build de produção

# Qualidade (rodar antes de commitar)
npx eslint .             # Lint — zero erros obrigatório
npx tsc -b               # Type check real (não usar tsc --noEmit)

# Testes
npm run test             # Vitest
npm run test:coverage    # Vitest com cobertura
```

---

## Estrutura do projeto

```
src/
├── components/
│   ├── ui/              # Componentes shadcn/ui (gerados — não editar diretamente)
│   ├── layout/          # AppLayout, Sidebar, Topbar, NotificationBell
│   ├── workspaces/      # TaskModal, TaskCard, InviteMemberModal, Checklist
│   ├── task/            # AssigneeSelector
│   ├── finance/         # UniversalFinanceModal
│   └── roles/           # RolesTable, RoleDetailsDialog
├── context/             # React contexts (UniversalFinanceModalContext, etc.)
├── hooks/               # Hooks TanStack Query por módulo
├── lib/
│   ├── api/             # Serviços de API por módulo
│   ├── api.ts           # Instância axios configurada
│   ├── auth.ts          # Helpers de autenticação
│   └── permissions.ts   # Helpers RBAC
├── pages/               # Páginas por módulo
│   ├── financeiro/      # Lançamentos, Relatórios, Contas, Categorias, Inteligência
│   ├── workspaces/      # WorkspacesPage, WorkspaceDetailPage
│   ├── processos-virtuais/
│   ├── utilidades/      # Calendar, Notes
│   ├── admin/           # AdminPanel
│   └── ...
├── types/               # Interfaces TypeScript por módulo
└── utils/               # Utilitários (export, formatação)
```

---

## Módulos

| Módulo | Rota | Responsável | Status |
|--------|------|-------------|--------|
| Login / Auth | `/login` | Marllon | ✅ |
| Dashboard | `/` | Marllon | ✅ |
| Usuários | `/usuarios` | Marllon | ✅ |
| Papéis/Permissões | `/papeis` | Marllon | ✅ |
| Financeiro | `/financeiro/*` | Marllon | ✅ |
| Workspaces / Kanban | `/workspaces/*` | Carlos | ✅ |
| Comunicação | `/comunicacao` | Carlos | ✅ |
| Processos Virtuais | `/processos-virtuais` | Carlos | ✅ |
| Biblioteca | `/biblioteca` | Carlos | 🔴 pendente |
| Calendário | `/utilidades/calendario` | Carlos | ✅ |
| Notas | `/utilidades/notas` | Carlos | ✅ |
| Perfil | `/perfil` | Marllon | ✅ |
| Admin | `/admin` | Marllon | ✅ |

---

## Deploy (Vercel)

- Auto-deploy ativado na branch `develop`
- `vercel.json` na raiz configura SPA routing (rewrites para `/index.html`)
- Variáveis de ambiente obrigatórias na Vercel: `VITE_API_URL` e `VITE_SENTRY_DSN`

---

## CI/CD

| Pipeline | Trigger | O que faz |
|----------|---------|-----------|
| `ci.yml` | push/PR → develop/main | Lint + type check + testes + build |
| `security.yml` | push/PR + semanal | npm audit + CodeQL + TruffleHog + Claude Review |
| `failure-analyst.yml` | CI falha | Claude Haiku analisa logs → Issue + Discord |
| `pr-review.yml` | Todo PR | Claude AI faz code review |
