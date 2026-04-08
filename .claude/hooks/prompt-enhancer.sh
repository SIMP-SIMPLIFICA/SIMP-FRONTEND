#!/usr/bin/env bash
# =============================================================================
# SIMP Frontend — UserPromptSubmit hook
# Injeta contexto do projeto e regras de comportamento em todo prompt.
# Garante que Claude trate prompts vagos corretamente e siga os padrões do SIMP.
# =============================================================================

set -euo pipefail

INPUT=$(cat)

CONTEXT='[CONTEXTO AUTOMÁTICO DO PROJETO SIMP — FRONTEND]

Você está trabalhando no SIMP Frontend (React 19 + TypeScript + TanStack Query v5 + shadcn/ui + Tailwind).
O CLAUDE.md do repo tem as regras completas — leia-o se ainda não leu.

REGRAS QUE NUNCA PODEM SER IGNORADAS:
• Branch: sempre `develop` — NUNCA commitar na `main`. Verifique com `git branch` antes de qualquer commit.
• TypeScript: proibido `any` explícito — use interfaces tipadas. O ESLint vai rejeitar no CI.
• Componentes: shadcn/ui como base. Tailwind para customização. Nunca CSS puro.
• Dados: TanStack Query v5 para fetch/mutation. Nunca `useEffect` + `fetch` manual.
• Arquivos assinados: URLs de arquivo vêm do R2 como `signedUrl` — nunca montar URL manual.
• Modais: preferir modal/dialog ao invés de navegar para nova página.
• Lint antes de commitar: `npm run lint` + `npx tsc -b`.

COMO TRATAR O PROMPT DO USUÁRIO:
1. Se o pedido for VAGO ou INCOMPLETO (sem mencionar arquivo, módulo ou comportamento exato):
   → Declare sua interpretação: "Entendo que você quer [X] no arquivo [Y], correto?"
   → Não comece a codar sem confirmação se houver ambiguidade real.
2. Se o pedido mencionar um módulo sem especificar arquivo:
   → Encontre o arquivo relevante primeiro. Use Glob ou Grep.
   → Liste os arquivos que vai tocar antes de editar.
3. Se o pedido parecer contradizer uma regra do CLAUDE.md:
   → Aponte o conflito e sugira a abordagem correta antes de prosseguir.
4. Se o pedido for claro e específico: execute diretamente, sem perguntas desnecessárias.

ESCOPO DO CARLOS (desenvolvedor colaborador):
→ Workspaces, Comunicação, Processos Virtuais, Biblioteca
→ Se ele tocar em auth, financeiro ou sidebar sem mencionar — confirme o escopo.'

printf '%s' "$CONTEXT" | jq -Rs '{
  hookSpecificOutput: {
    hookEventName: "UserPromptSubmit",
    additionalContext: .
  }
}'
