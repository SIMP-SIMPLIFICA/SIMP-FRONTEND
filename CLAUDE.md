# CLAUDE.md — SIMP Frontend

Guia de contexto absoluto para o Claude Code trabalhar neste repositório. Leia integralmente antes de qualquer tarefa.

---

## Visão geral

Frontend do **SIMP — Sistema Integrado de Modernização e Processos**. SaaS B2B multi-tenant para prefeituras e órgãos públicos municipais.

**Stack:** React 19 + Vite 7 + TypeScript + TanStack Query v5 + shadcn/ui + Tailwind CSS + React Router v7

**Colaboradores:**
- **Marllon** — auth, financeiro, sidebar, RBAC UI
- **Carlos** — workspaces avançados, comunicação, processos virtuais, convênios, protocolos, GED/biblioteca

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
npx tsc -b          # type check REAL — NÃO usar tsc --noEmit
npx eslint .        # zero erros obrigatório (warnings são ok)
npm run build       # confirmar que o build passa
```

> **ATENÇÃO:** `tsc --noEmit` não verifica nada neste projeto. O `tsconfig.json` raiz tem `"files": []`. O check real é `npx tsc -b` (build mode, segue referências para `tsconfig.app.json`).

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

Estrutura padrão de um hook:
```typescript
// src/lib/api/modulo.ts — serviço puro
export const moduloService = {
  list: async (params?) => { const res = await api.get('/modulo'); return res.data },
  create: async (data: CreateDTO) => { const res = await api.post('/modulo', data); return res.data },
}

// src/hooks/useModulo.ts — hook React Query
export function useModulos(params?) {
  return useQuery({ queryKey: ['modulos', params], queryFn: () => moduloService.list(params) })
}
export function useCreateModulo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: moduloService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['modulos'] }),
  })
}
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

Usar componentes existentes em `src/components/ui/` antes de criar novos. Os componentes são gerados pelo shadcn — **não modificar** os arquivos em `src/components/ui/` diretamente (risco de conflito ao atualizar).

```bash
npx shadcn@latest add <componente>
```

---

## Padrões de UI/UX

### Modais e Sheets

- Preferir modais (`Dialog`) ou sheets (`Sheet`) a navegação para fora do contexto
- **Nunca duplicar o botão de fechar (X):** o shadcn `DialogContent` já inclui um X nativo. Não adicionar outro no `DialogHeader`
- Modais com formulários longos: envolver o conteúdo em `<ScrollArea>` para não cortar campos

### ScrollArea em modais grandes

Padrão para modais com formulários que podem ultrapassar a altura da tela:

```tsx
<DialogContent className="max-w-lg overflow-hidden p-0 gap-0 flex flex-col max-h-[90vh]">
  <DialogHeader className="px-6 pt-6 pb-4 border-b">
    <DialogTitle>Título</DialogTitle>
  </DialogHeader>

  {/* Conteúdo scrollável */}
  <form className="flex flex-col min-h-0 flex-1" onSubmit={handleSubmit}>
    <ScrollArea className="flex-1">
      <div className="px-6 py-5 space-y-5">
        {/* campos */}
      </div>
    </ScrollArea>

    {/* Botões sempre visíveis no rodapé */}
    <div className="flex justify-end gap-3 px-6 py-4 border-t">
      <Button variant="outline">Cancelar</Button>
      <Button type="submit">Salvar</Button>
    </div>
  </form>
</DialogContent>
```

Usar `flex flex-col max-h-[90vh]` no `DialogContent` + `flex-1` no `ScrollArea` para que os botões do rodapé fiquem sempre visíveis.

### Toasts de feedback

```typescript
import { toast } from '@/hooks/use-toast'

// Sucesso
toast({ title: 'Documento salvo com sucesso.' })

// Erro
toast({ title: 'Erro ao salvar.', variant: 'destructive' })
```

### Loading states

- Usar `isLoading` / `isPending` dos hooks para desabilitar botões e mostrar spinners
- Nunca deixar botão clicável durante uma mutation em andamento

---

## Gestão de Estado e Auth

### useMe — dados do usuário autenticado

```typescript
const { data: me } = useMe()
// me.user.id, me.user.firstName, me.user.organizationId
// me.user.isSuperAdmin
// me.user.permissions: string[]
```

### Verificação de permissões

```typescript
import { hasAnyPermission } from '@/lib/permissions'

const isAdmin = hasAnyPermission(me, ['protocols:admin']) || !!me?.user?.isSuperAdmin
```

### Feature Flags — Módulos habilitados

Rotas e menus são condicionais baseados nos módulos habilitados para a organização:

```typescript
// Na Sidebar e no Router, verificar se o módulo está habilitado:
const enabledModules = me?.organization?.enabledModules ?? []
const hasProtocols = enabledModules.includes('protocols')
```

Módulos habilitados por padrão: `tasks`, `finance`, `communication`, `calendar`, `notes`, `departments`, `library`, `covenants`.

Módulos que requerem habilitação manual pelo super admin: `virtual_processes`, `protocols`.

---

## Fluxo: Geração de Protocolos (Numeração Oficial)

O fluxo completo de geração e emissão de um protocolo oficial é:

### 1. Formulário de geração (`GenerateProtocolModal.tsx`)

- Usuário escolhe **Categoria**: `COMUNICACAO` ou `NORMATIVO`
- Para `COMUNICACAO`: aparece toggle de **Tipo de Numeração** (`Sequencial` ou `Aleatório`)
- Para `NORMATIVO`: numeração sempre `SEQUENTIAL`, setor forçado como `CENTRAL`
- Campos: tipo de documento, setor de origem, assunto/ementa, destinatário

```typescript
await generateMutation.mutateAsync({
  documentCategory: form.documentCategory,
  documentType: form.documentType,
  numberingType: form.numberingType,   // 'SEQUENTIAL' | 'RANDOM'
  subject: form.subject,
  sector: isNormativo ? 'CENTRAL' : form.sector,
  recipient: isNormativo ? undefined : form.recipient,
})
```

### 2. Tela de sucesso

Após gerar, exibe o número oficial reservado e dois botões:
- **Copiar Número** — copia `formattedNumber` para clipboard
- **Anexar PDF Agora** — abre file picker e executa o fluxo de emissão

### 3. Fluxo de emissão (anexo PDF)

```typescript
// 1. Upload do PDF para o GED (retorna LibraryDocument com .id)
const uploaded = await libraryService.upload(formData)

// 2. Vincular ao protocolo e marcar como EMITIDO
await updateStatus.mutateAsync({
  id: doc.id,
  data: { status: 'EMITIDO', libraryDocumentId: uploaded.id },
})
```

**Permissões para marcar EMITIDO:**
- Usuários com `protocols:admin` podem emitir qualquer documento
- Criador sem permissão admin pode emitir **apenas seus próprios** documentos
- Qualquer usuário pode ver o botão — a restrição é no backend

---

## Fluxo: Convênios e Processos Virtuais

### Relacionamento N:M

Um convênio pode estar vinculado a múltiplos processos virtuais. A interface expõe:
- No detalhe do convênio: lista de processos vinculados + botão de link/unlink
- No detalhe do processo virtual: lista de convênios vinculados

### One-Way Sync — Tipos de Convênio

Ao criar um novo **Tipo de Convênio**, o sistema automaticamente cria uma **Origem de Processo Virtual** com o mesmo nome (sync unidirecional no backend). Não é necessário criar manualmente a origem.

---

## Navegação e Deep Linking

- Preferir modais/sheets a navegação para fora do contexto atual
- Usar `useUniversalFinanceModal()` para abrir o modal de categorias/contas dentro do formulário de lançamento
- Deep linking de notificações mantém o contexto do usuário via `?msgId=` na URL

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
| Users / Roles RBAC | Marllon | ✅ |
| Sidebar / Layout | Marllon | ✅ |
| Financeiro | Marllon | ✅ |
| Workspaces + Kanban + Tasks | Carlos | ✅ |
| Comunicação (ofícios, memorandos) | Carlos | ✅ |
| Processos Virtuais | Carlos | ✅ |
| Convênios | Carlos | ✅ |
| Protocolos (numeração oficial) | Carlos | ✅ |
| GED / Biblioteca | Carlos | 🔴 pendente refinamento |
| Notificações (SSE) | Carlos | ✅ |
| Calendar / Notes | Carlos | ✅ |
| Profile | Marllon | ✅ |
