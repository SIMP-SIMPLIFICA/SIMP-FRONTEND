---
paths:
  - "src/pages/fleet/**"
  - "src/components/fleet/**"
  - "src/pages/public/Fleet*"
---

# Regras do módulo Frotas (frontend)

Decisões que se sobrepõem à spec: `../SIMP-BACKEND/docs/frotas/decisoes.md`. Pela D9, nenhuma tela do Frotas oferece "assinar" (gov.br ou ICP-Brasil) no MVP: a prova do documento é PDF + `sha256Hash` + QR de validação. Tela nova: skill `simp-tela-modulo`.

## Tela pública do frentista (`/abastecer/:token`, em `src/pages/public/`)

1. **O token do QR é segredo.** Só existe na URL; nunca em `localStorage`/`sessionStorage`, log, Sentry, `document.title`, analytics nem mensagem de erro. Enviar ao backend só no path das chamadas `/api/v1/public/fleet/redeem/:token/*`.
2. **Uso único e bloqueio são do backend.** A tela não decide se o token ainda vale nem conta tentativas de placa: mostra o que o backend responde (tentativas restantes, bloqueada, já usada). Nunca guardar contador local que "economize" chamadas — o contador está no banco, de propósito, para que trocar de celular não o zere.
3. **Sem dica da placa.** A tela inicial não exibe a placa, nem parte dela, nem o modelo do veículo antes do acerto. Campo de placa com maiúsculas, aceitando com ou sem hífen.
4. Página leve para 3G (< 150 KB, sem fontes externas), botões ≥ 48 px, contador visível da sessão de 30 min. Sem `ProtectedRoute`; sob `PublicLayout`, como `DocumentValidation`.

## Dados sensíveis

5. **CPF e CNH:** nunca exibir completos em lista, PDF de pré-visualização ou tela pública; o motorista aparece só pelo nome. Máscara de entrada no formulário de cadastro; o valor vai ao backend só em dígitos, e o backend cifra.
6. Isolamento (filtro por organização e eventual RLS, decisão da TASK 2) é do backend; o frontend nunca envia `organizationId`.

## Padrões

7. Valores `Decimal` chegam como string: exibir com formatação, mas nunca recalcular total com `Number` para enviar ao backend; o servidor calcula.
8. Proibido `dangerouslySetInnerHTML` em todo o módulo.
9. Erros: exibir a `message` orientadora do backend (`{ error, message }`); mapear códigos `FLEET_*` num `describeFleetError` ao lado de `describeDocumentError` (`src/lib/official-documents.ts`).
10. Formulários críticos (autorização, `PlateInput`, tela do frentista, fila de conferência) entram com teste de componente (Testing Library) na mesma TASK.
