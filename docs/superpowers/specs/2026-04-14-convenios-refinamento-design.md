# Spec: Refinamento Avançado do Módulo de Convênios

**Data:** 2026-04-14  
**Autor:** Carlos (via Claude)  
**Status:** Aprovado

---

## Contexto

O módulo básico de Convênios foi entregue com CRUD funcional, sidebar, RBAC injetado e associação com a Biblioteca. Carlos identificou 6 problemas críticos que precisam ser resolvidos:

1. Tipo de Convênio hardcoded como enum — não expansível
2. Proponente como campo de texto livre — sem vínculo com cadastro de empresas
3. Faltam campos de Convenente e Concedente
4. Feature Flag (`covenants`) ausente no painel Super Admin
5. Permissões `covenants:*` ausentes no editor de Roles
6. UX do formulário: cálculo manual de prazo, sem máscaras financeiras

---

## Escopo

Cobre 3 fases: Schema/Backend, RBAC/Feature Flags, Frontend UX.  
**Fora do escopo:** relatórios, exportação PDF, histórico de alterações de convênio.

---

## Fase 1: Schema Prisma e Backend

### 1.1 Mudanças no schema.prisma (SIMP-BACKEND)

#### Remover enum `CovenantType`, criar model dinâmico

```prisma
model CovenantType {
  id             String   @id @default(uuid())
  organizationId String   @map("organization_id")
  name           String
  createdAt      DateTime @default(now()) @map("created_at")

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  covenants    Covenant[]

  @@unique([organizationId, name])
  @@map("covenant_types")
}
```

Os tipos padrão (Convênio, Emenda Individual, Emenda de Bancada, Transferência Especial, Fundo a Fundo) serão semeados via script de seed por organização quando o módulo for habilitado.

#### Novos models: Convenente e Concedente

Ambos são entidades específicas do módulo de convênios — não compartilhadas com outros módulos.

```prisma
model Convenente {
  id             String   @id @default(uuid())
  organizationId String   @map("organization_id")
  name           String
  cnpj           String?
  createdAt      DateTime @default(now()) @map("created_at")

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  covenants    Covenant[]

  @@unique([organizationId, name])
  @@map("convenentes")
}

model Concedente {
  id             String   @id @default(uuid())
  organizationId String   @map("organization_id")
  name           String
  cnpj           String?
  createdAt      DateTime @default(now()) @map("created_at")

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  covenants    Covenant[]

  @@unique([organizationId, name])
  @@map("concedentes")
}
```

#### Atualizar model `Covenant`

Mudanças nas colunas:

| Campo antigo | Campo novo | Tipo |
|---|---|---|
| `type CovenantType (enum)` | `typeId String?` | FK → `CovenantType` |
| `proponent String` | `proponentId String?` | FK → `VirtualProcessCompany` |
| — | `convenenteId String?` | FK → `Convenente` |
| — | `concedenteId String?` | FK → `Concedente` |
| `validityDate DateTime?` | `validityStartDate DateTime?` | renomeado |
| — | `validityEndDate DateTime?` | novo campo |

`termDays` permanece no schema como campo salvo (calculado no frontend via `differenceInDays` e enviado no payload).

Adicionar ao `Organization`:
```prisma
covenantTypes  CovenantType[]
convenentes    Convenente[]
concedentes    Concedente[]
```

Executar: `npx prisma db push && npx prisma generate` (ambiente dev — push limpo aceito pelo Carlos).

### 1.2 Novos endpoints no covenant.controller.ts (ou sub-controllers)

**CovenantType** — rota base `/api/v1/covenants/types`:
- `GET /` — listar tipos da org (requer `covenants:read`)
- `POST /` — criar tipo (`covenants:write`)
- `DELETE /:id` — remover tipo (`covenants:delete`)

**Convenente** — rota base `/api/v1/covenants/convenentes`:
- `GET /` — listar convenentes da org (`covenants:read`)
- `POST /` — criar convenente (`covenants:write`)
- `DELETE /:id` — remover (`covenants:delete`)

**Concedente** — rota base `/api/v1/covenants/concedentes`:
- `GET /` — listar concedentes da org (`covenants:read`)
- `POST /` — criar concedente (`covenants:write`)
- `DELETE /:id` — remover (`covenants:delete`)

O covenant controller principal é atualizado para aceitar `typeId`, `proponentId`, `convenenteId`, `concedenteId` no body de create/update, com select nested nos GETs para incluir os objetos relacionados.

### 1.3 Permissões no AVAILABLE_PERMISSIONS (role.controller.ts)

Adicionar categoria:
```ts
covenants: {
  displayName: 'Convênios, Emendas e Transferências',
  permissions: [
    { key: 'covenants:read',   description: 'Visualizar convênios', level: 'read' },
    { key: 'covenants:write',  description: 'Criar e editar convênios', level: 'write' },
    { key: 'covenants:delete', description: 'Excluir convênios', level: 'delete' },
  ]
}
```

---

## Fase 2: Feature Flags e RBAC (Frontend)

### 2.1 AdminOrganizationDetailPage.tsx

Adicionar `covenants: "Convênios"` ao `MODULE_LABELS`. O sistema de toggle já funciona — basta o módulo estar listado para o card aparecer no Super Admin.

### 2.2 Roles.tsx — FALLBACK_CATALOG e CATEGORY_MODULE_MAP

```ts
// Em FALLBACK_CATALOG.categories:
{ name: "covenants", displayName: "Convênios, Emendas e Transferências",
  permissions: ["covenants:read", "covenants:write", "covenants:delete"] }

// Em FALLBACK_CATALOG.permissions:
{ key: "covenants:read",   description: "Visualizar convênios",         category: "covenants" },
{ key: "covenants:write",  description: "Criar e editar convênios",     category: "covenants" },
{ key: "covenants:delete", description: "Excluir convênios",            category: "covenants" },

// Em CATEGORY_MODULE_MAP:
covenants: "covenants"
```

---

## Fase 3: Frontend — UX do Formulário

### 3.1 Novos hooks e API services

Criar (seguindo padrão existente em `src/hooks/` e `src/lib/api/`):
- `src/lib/api/covenants.ts` — adicionar funções: `fetchCovenantTypes`, `createCovenantType`, `deleteCovenantType`, `fetchConvenentes`, `createConvenente`, `fetchConcedentes`, `createConcedente`
- `src/hooks/useCovenants.ts` — adicionar queries/mutations correspondentes

### 3.2 Componente reutilizável: EntitySelectField

Um componente genérico `<EntitySelectField>` para os três campos relacionais (Tipo, Proponente, Convenente, Concedente). Recebe:
- `items[]` — lista carregada via query
- `value` — id selecionado
- `onChange` — callback
- `onCreateNew` — abre mini modal de criação
- `placeholder`

### 3.3 CovenantFormDialog.tsx — mudanças detalhadas

**Campos de relacionamento:**

| Campo | Implementação |
|---|---|
| **Tipo** | `EntitySelectField` com tipos dinâmicos + botão `+` → dialog inline (apenas campo `name`) |
| **Proponente** | `EntitySelectField` com `VirtualProcessCompany` + botão `+` → mini dialog inline (campos: `name` + `cnpj`) usando `useCreateVirtualProcessCompany` hook existente. Dados vão para a mesma tabela compartilhada. |
| **Convenente** | `EntitySelectField` + botão `+` → mini dialog (campos: `name` + `cnpj`) |
| **Concedente** | `EntitySelectField` + botão `+` → mini dialog (campos: `name` + `cnpj`) |

**Datas e prazo:**

Substituir `validityDate` (campo único) por `validityStartDate` + `validityEndDate`:
```tsx
useEffect(() => {
  if (form.validityStartDate && form.validityEndDate) {
    const days = differenceInDays(form.validityEndDate, form.validityStartDate)
    setForm(prev => ({ ...prev, termDays: String(days) }))
  }
}, [form.validityStartDate, form.validityEndDate])
```

Campo `termDays` fica `readOnly` quando calculado automaticamente.

**Máscaras financeiras:**

Campos `transferValue` e `counterpartValue` usarão `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` para formatação visual. O valor interno (state) permanece numérico para facilitar o envio ao backend.

**Fix do scroll:**

`DialogContent` recebe `className="max-w-2xl overflow-hidden p-0 gap-0"` para que o `ScrollArea` interno funcione corretamente.

### 3.4 Atualização dos tipos TypeScript (src/lib/api/covenants.ts)

```ts
export interface CovenantType { id: string; name: string }
export interface Convenente   { id: string; name: string; cnpj?: string }
export interface Concedente   { id: string; name: string; cnpj?: string }

export interface Covenant {
  // ... campos existentes
  typeId?: string;        type?: CovenantType
  proponentId?: string;   proponent?: VirtualProcessCompany
  convenenteId?: string;  convenente?: Convenente
  concedenteId?: string;  concedente?: Concedente
  validityStartDate?: string
  validityEndDate?: string
}
```

---

## Verificação pré-commit

Em ambos os projetos antes de commitar:
```bash
# Backend
cd SIMP-BACKEND && npx tsc -b

# Frontend  
cd SIMP-FRONTEND && npx tsc -b && npx eslint . && npm run build
```

---

## Dependências externas

- `date-fns` — já instalado (usado em `CovenantFormDialog`)
- `differenceInDays` — exportado de `date-fns`, nenhuma instalação necessária
- Nenhuma nova lib necessária para máscaras (usa `Intl.NumberFormat` nativo)

---

## Ordem de implementação recomendada

1. Schema Prisma + `db push`
2. Backend: novos endpoints (types, convenentes, concedentes) + atualizar covenant controller + AVAILABLE_PERMISSIONS
3. Frontend: novos API services + hooks
4. Frontend: `CovenantFormDialog` refatorado
5. Frontend: Feature Flag (`MODULE_LABELS`) + RBAC (`FALLBACK_CATALOG`, `CATEGORY_MODULE_MAP`)
6. Verificação TypeScript em ambos os projetos
