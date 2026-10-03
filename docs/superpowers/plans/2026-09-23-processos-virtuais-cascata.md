# Processos Virtuais — Cascata, Combobox e QDD no "Autuar Novo Processo"

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** No modal "Autuar Novo Processo" (Processos Virtuais), tornar Conta Bancária e Categoria comboboxes com busca e criação inline (reaproveitando o modal real de Conta Bancária do Financeiro), filtrar ambos — e a nova Dotação Orçamentária (QDD) — pelo Departamento escolhido, e expor um botão "Gerenciar" para cada.

**Architecture:** Nenhuma mudança de schema. `BankAccount` e `QddItem` já têm `departmentId` — o filtro em cascata é um `.filter()` client-side sobre listas já carregadas (mesmo padrão leve já usado no projeto, ex. `useOrganizationUsers`). `VirtualProcess.qddItemId` já existe no banco e já é aceito pelo `POST` de criação (`virtual-process.controller.ts:223-267`) — só falta o campo no formulário. Categoria continua apontando para `VirtualProcessCategory` (decisão do usuário, 2026-09-23) — só ganha busca, Title Case e bloqueio de duplicata client-side.

**Tech Stack:** React 19, TypeScript, TanStack Query v5, shadcn/ui (Dialog/Input/Button), Vite. Nenhuma lib nova.

**Spec:** Requisitos passados diretamente pelo usuário em chat (Fase 1 de "melhorias críticas de UX" — Processos Virtuais, Departamentos, Convênios), 2026-09-23. Sem `.specify/` para este épico ainda.

## Global Constraints

- `nvm use 22` antes de qualquer `npm`/`npx` (CLAUDE.md) — indisponível neste ambiente de execução; documentar a ressalva se rodar em Node diferente.
- Validação real é `npx tsc -b` (nunca `tsc --noEmit` sozinho) + `npx eslint .` (zero erros, warnings ok) + `npm run build` — os três, sempre.
- Proibido `any` explícito (`@typescript-eslint/no-explicit-any`).
- Não modificar `src/components/ui/*` (gerados pelo shadcn) — overrides via `className`/props, nunca editar o arquivo.
- Reaproveitar componentes/hooks existentes antes de criar novos (`DepartmentSelect`, `QddItemSelect`, `useFinanceBankAccounts`, etc.).
- Trabalhar em `develop`; nunca commitar direto em `main`.
- Um commit por task (convenção já usada nos épicos anteriores deste projeto).

## Review Focus

- **Departamento vazio ao abrir o modal:** Conta Bancária e QDD devem aparecer desabilitados com uma instrução ("Selecione o departamento primeiro"), nunca uma lista vazia sem explicação — mesmo padrão que `QddItemSelect` já usa. Testado na Task 4.
- **Trocar de departamento depois de já ter escolhido conta/QDD:** a seleção anterior, se não pertencer ao novo departamento, precisa ser limpa — senão o formulário envia uma conta/ficha de outro setor. Testado na Task 2 e na Task 4.
- **Categoria digitada em caixa mista ou já existente com outra capitalização** ("obras" vs "Obras"): o Title Case tem que normalizar ANTES de comparar contra a lista, senão o bloqueio de duplicata deixa passar. Testado na Task 3.
- **Nenhuma conta bancária cadastrada para o departamento escolhido:** o combobox precisa mostrar "Nenhuma conta encontrada" com a opção de criar, não uma lista vazia silenciosa. Testado na Task 2.
- **Criar uma conta/categoria pelo modal inline e cancelar sem terminar:** o formulário de Autuar Processo não pode perder o que o usuário já preencheu (número, secretaria, assunto etc.) — o dialog inline é uma camada por cima, não substitui a tela. Testado na Task 2 e na Task 3 (o dialog interno não desmonta o formulário externo).

---

## File Structure

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/pages/financeiro/AccountFormDialog.tsx` | **Criar** | `AccountFormDialog` extraído de `Contas.tsx`, com `lockedDepartmentId?: string` opcional. |
| `src/pages/financeiro/Contas.tsx` | **Modificar** | Remove a definição local de `AccountFormDialog`, importa do novo arquivo. |
| `src/pages/processos-virtuais/BankAccountCombobox.tsx` | **Criar** | Combobox de conta bancária: busca, filtro por `departmentId`, criação inline via `AccountFormDialog`, link "Gerenciar". |
| `src/pages/processos-virtuais/CategoryCombobox.tsx` | **Criar** | Combobox de categoria de processo: busca, Title Case, bloqueio de duplicata, criação inline. |
| `src/pages/processos-virtuais/ProcessosVirtuais.tsx` | **Modificar** | `CreateProcessDialog`: troca os dois `<Select>` pelos comboboxes novos; adiciona campo QDD com `QddItemSelect` (reuso puro, sem alteração); inclui `qddItemId` no payload de criação. |

---

### Task 1: Extrair `AccountFormDialog` para um arquivo próprio, com departamento travável

**Files:**
- Create: `src/pages/financeiro/AccountFormDialog.tsx`
- Modify: `src/pages/financeiro/Contas.tsx:1-186` (remove a definição local, ajusta imports)

**Interfaces:**
- Produces: `export function AccountFormDialog({ open, onOpenChange, account, lockedDepartmentId }: AccountFormDialogProps)` — mesma assinatura que já existe hoje (`open`, `onOpenChange`, `account: BankAccount | null`), **menos** `workspaceId` (nunca foi usado — sempre chamado com `undefined`; removido nesta extração) **mais** `lockedDepartmentId?: string` novo.
- Consumes (Task 2): `AccountFormDialog` importado de `@/pages/financeiro/AccountFormDialog`.

- [ ] **Step 1: Criar o arquivo extraído com o campo de departamento travável**

Copie o `AccountFormDialog` de `Contas.tsx` (linhas 1-186, incluindo os imports que ele usa: `useState`, `Info`/`Loader2` de `lucide-react`, `Button`, `Input`, `Label`, `Dialog*`, `toast`, `DepartmentSelect`, `type BankAccount`, `useCreateBankAccount`/`useUpdateBankAccount`, `formatCurrency`) para o novo arquivo, com estas mudanças:

```tsx
// src/pages/financeiro/AccountFormDialog.tsx
import { useState } from "react";
import { Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { DepartmentSelect } from "@/components/departments/DepartmentSelect";
import type { BankAccount } from "@/lib/api/finance";
import { useCreateBankAccount, useUpdateBankAccount } from "@/hooks/useFinance";

/**
 * Formulário de Conta Bancária — extraído de `financeiro/Contas.tsx` (era
 * privado ali) para ser reaproveitado também no modal "Autuar Novo Processo"
 * (Processos Virtuais). Mesmo componente, mesmas regras — nada duplicado.
 */

interface AccountFormData {
  name: string;
  agency: string;
  accountNumber: string;
  departmentId: string;
}

const emptyForm: AccountFormData = { name: "", agency: "", accountNumber: "", departmentId: "" };

function accountToForm(a: BankAccount): AccountFormData {
  return {
    name: a.name,
    agency: a.agency ?? "",
    accountNumber: a.accountNumber ?? "",
    departmentId: a.departmentId,
  };
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export interface AccountFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  account: BankAccount | null;
  /**
   * Quando presente, o campo Departamento vem preenchido com este id e
   * BLOQUEADO (`disabled`) — uso do modal "Autuar Novo Processo": a conta
   * criada dali é sempre do departamento já escolhido no formulário pai,
   * nunca de outro.
   */
  lockedDepartmentId?: string;
}

export function AccountFormDialog({ open, onOpenChange, account, lockedDepartmentId }: AccountFormDialogProps) {
  const [form, setForm] = useState<AccountFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const { mutateAsync: create } = useCreateBankAccount();
  const { mutateAsync: update } = useUpdateBankAccount();

  const handleOpenChange = (v: boolean) => {
    if (v) {
      setForm(
        account
          ? accountToForm(account)
          : { ...emptyForm, departmentId: lockedDepartmentId ?? "" }
      );
    }
    onOpenChange(v);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (!form.departmentId) {
      toast({ title: "Selecione o departamento responsável pela conta.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        agency: form.agency.trim() || undefined,
        accountNumber: form.accountNumber.trim() || undefined,
        departmentId: form.departmentId,
      };
      if (account) {
        await update({ id: account.id, data: payload });
        toast({ title: "Conta atualizada com sucesso" });
      } else {
        await create(payload);
        toast({ title: "Conta criada com sucesso" });
      }
      onOpenChange(false);
    } catch {
      toast({ title: "Erro ao salvar conta", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{account ? "Editar Conta Bancária" : "Nova Conta Bancária"}</DialogTitle>
          <DialogDescription>
            {account ? "Altere os dados da conta abaixo." : "Preencha os dados da nova conta bancária."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Conta <span className="text-red-500">*</span></Label>
            <Input
              id="name"
              required
              placeholder="Ex: Conta Corrente Bradesco"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agency">Agência</Label>
              <Input
                id="agency"
                placeholder="Ex: 1234-5"
                value={form.agency}
                onChange={e => setForm(f => ({ ...f, agency: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountNumber">Número da Conta</Label>
              <Input
                id="accountNumber"
                placeholder="Ex: 00012345-6"
                value={form.accountNumber}
                onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="departmentId">
              Secretaria / Departamento <span className="text-red-500">*</span>
            </Label>
            <DepartmentSelect
              id="departmentId"
              value={form.departmentId || null}
              onChange={next => setForm(f => ({ ...f, departmentId: next ?? "" }))}
              disabled={Boolean(lockedDepartmentId)}
            />
            {lockedDepartmentId && (
              <p className="text-xs text-slate-400">
                Departamento herdado do processo que você está autuando.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="initialBalance" className="flex items-center gap-1.5">
              Saldo Inicial (R$)
              <span
                title="Este valor será populado automaticamente por uma futura integração bancária via API. Não é possível editá-lo manualmente."
                className="inline-flex cursor-help text-slate-400"
              >
                <Info className="h-3.5 w-3.5" />
              </span>
            </Label>
            <Input
              id="initialBalance"
              disabled
              readOnly
              value={formatCurrency(account?.initialBalanceCents ?? 0)}
              title="Este valor será populado automaticamente por uma futura integração bancária via API. Não é possível editá-lo manualmente."
            />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-[#0A5BC4] hover:bg-[#094FA8] text-white" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {account ? "Salvar" : "Criar Conta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Apontar `Contas.tsx` para o arquivo extraído**

Em `src/pages/financeiro/Contas.tsx`: apague as linhas da definição local de `AccountFormDialog`, `accountToForm`, `emptyForm`, `type AccountFormData` e `FormDialogProps` (todo o bloco hoje ocupado por elas), e troque as chamadas `<AccountFormDialog ... workspaceId={...} />` para não passar mais `workspaceId`. Adicione o import:

```tsx
import { AccountFormDialog } from "./AccountFormDialog";
```

Remova também os imports que só existiam para o dialog local, se `ContasBancarias` (o componente principal do arquivo) não os usar mais (confira `Info`, `useCreateBankAccount`, `useUpdateBankAccount`, `DepartmentSelect`, `formatCurrency` — `ContasBancarias` provavelmente ainda usa `DepartmentSelect` num filtro da listagem; **não remova o que ainda estiver em uso**, `eslint` acusa import não usado como erro).

- [ ] **Step 3: Verificar**

```bash
npx tsc -b
npx eslint src/pages/financeiro/AccountFormDialog.tsx src/pages/financeiro/Contas.tsx
```
Esperado: os dois limpos, zero erros. A tela `/financeiro/contas` continua funcionando exatamente igual (mesmo componente, arquivo diferente).

- [ ] **Step 4: Commit**

```bash
git add src/pages/financeiro/AccountFormDialog.tsx src/pages/financeiro/Contas.tsx
git commit -m "refactor(financeiro): extrai AccountFormDialog para reuso em Processos Virtuais"
```

---

### Task 2: Combobox de Conta Bancária — busca, cascata por departamento, criação inline, Gerenciar

**Files:**
- Create: `src/pages/processos-virtuais/BankAccountCombobox.tsx`
- Modify: `src/pages/processos-virtuais/ProcessosVirtuais.tsx:110-135` (hooks/estado de `CreateProcessDialog`) e o bloco "Row 7: Conta Bancária" (linhas ~333-367 na versão atual)

**Interfaces:**
- Consumes: `AccountFormDialog` (Task 1, `@/pages/financeiro/AccountFormDialog`); `BankAccount` (`@/lib/api/finance`); `useFinanceBankAccounts` (`@/hooks/useFinance`).
- Produces: `export function BankAccountCombobox({ departmentId, value, onSelect }: Props)` onde `value: { id: string; name: string; agency: string | null; accountNumber: string | null } | null` e `onSelect: (account: BankAccount | null) => void`.

- [ ] **Step 1: Criar o combobox**

Mesmo padrão de `src/pages/auditoria/AuditUserFilter.tsx` (Input + dropdown próprio, sem Radix Popover) já usado neste projeto — busca client-side, sem lib nova.

```tsx
// src/pages/processos-virtuais/BankAccountCombobox.tsx
import { useEffect, useRef, useState } from "react";
import { Landmark, Plus, Search, Settings2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useFinanceBankAccounts } from "@/hooks/useFinance";
import { AccountFormDialog } from "@/pages/financeiro/AccountFormDialog";
import type { BankAccount } from "@/lib/api/finance";

interface Props {
  departmentId: string | null | undefined;
  value: string | null | undefined; // bankAccountId selecionado
  onSelect: (account: BankAccount | null) => void;
}

/**
 * Combobox de conta bancária para o modal "Autuar Novo Processo".
 *
 * Filtra client-side por `departmentId` — `useFinanceBankAccounts` não tem
 * (nem precisa de) parâmetro de filtro: a lista de contas de uma prefeitura
 * é pequena, e filtrar aqui evita inventar um endpoint novo pra isso.
 *
 * Sem `departmentId`, fica desabilitado com uma instrução — mesmo padrão de
 * `QddItemSelect`: nunca mostra a lista inteira do município antes do
 * departamento ser escolhido.
 */
export function BankAccountCombobox({ departmentId, value, onSelect }: Props) {
  const { data: allAccounts = [], isLoading } = useFinanceBankAccounts();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const accounts = departmentId ? allAccounts.filter(a => a.departmentId === departmentId) : [];
  const selected = accounts.find(a => a.id === value) ?? null;

  // Departamento mudou e a conta selecionada não é mais dele — limpa, senão
  // o formulário submeteria a conta de outro setor (Review Focus).
  useEffect(() => {
    if (value && !accounts.some(a => a.id === value)) onSelect(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentId]);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const term = query.trim().toLowerCase();
  const suggestions = term ? accounts.filter(a => a.name.toLowerCase().includes(term)) : accounts;

  function label(a: BankAccount): string {
    return [a.name, a.agency && `Ag. ${a.agency}`, a.accountNumber && `Cc ${a.accountNumber}`]
      .filter(Boolean)
      .join(" · ");
  }

  if (!departmentId) {
    return (
      <Input disabled placeholder="Selecione a secretaria primeiro" className="text-slate-400" />
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-8"
            placeholder={isLoading ? "Carregando..." : "Buscar conta bancária..."}
            value={isOpen ? query : selected ? label(selected) : ""}
            onFocus={() => { setQuery(""); setIsOpen(true); }}
            onChange={e => setQuery(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <a
          href="/financeiro/contas"
          target="_blank"
          rel="noreferrer"
          className="flex shrink-0 items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
          title="Abre Contas Bancárias em outra aba — o que você já preencheu aqui não se perde"
        >
          <Settings2 className="h-3.5 w-3.5" /> Gerenciar
        </a>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); setIsOpen(false); setCreateOpen(true); }}
            className="flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50"
          >
            <Plus className="h-4 w-4" /> Criar nova conta bancária
          </button>

          {suggestions.length === 0 && (
            <div className="px-3 py-2.5 text-sm text-slate-500">
              Nenhuma conta encontrada para esta secretaria.
            </div>
          )}

          {suggestions.map(a => (
            <button
              key={a.id}
              type="button"
              onMouseDown={e => { e.preventDefault(); onSelect(a); setIsOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
            >
              <Landmark className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="truncate text-slate-700">{label(a)}</span>
            </button>
          ))}
        </div>
      )}

      <AccountFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        account={null}
        lockedDepartmentId={departmentId}
      />
    </div>
  );
}
```

Nota: a conta recém-criada não é selecionada automaticamente (o `AccountFormDialog` hoje não devolve o registro criado para quem o abriu — só invalida a query). Isso é aceitável para esta task: o usuário cria a conta, o dropdown reabre com a lista atualizada (`useFinanceBankAccounts` já invalida via `onSuccess`), e ele seleciona normalmente. Documentado aqui para não ser lido como bug esquecido.

- [ ] **Step 2: Trocar o `<Select>` de Conta Bancária pelo combobox em `CreateProcessDialog`**

Em `ProcessosVirtuais.tsx`, substitua o bloco "Row 7: Conta Bancária" (o `<Select value={form.bankAccountId} ...>` inteiro) por:

```tsx
{/* Row 7: Conta Bancária */}
<div className="space-y-1.5">
  <Label>Conta Bancária</Label>
  <BankAccountCombobox
    departmentId={form.departmentId || null}
    value={form.bankAccountId || null}
    onSelect={acc => setForm(f => ({
      ...f,
      bankAccountId: acc?.id ?? '',
      bankName: acc?.name ?? '',
      agency: acc?.agency ?? '',
      bankAccount: acc?.accountNumber ?? '',
    }))}
  />
  {form.bankName && (
    <p className="text-xs text-slate-400">
      {[form.bankName, form.agency && `Ag. ${form.agency}`, form.bankAccount && `Cc ${form.bankAccount}`].filter(Boolean).join(' · ')}
    </p>
  )}
</div>
```

Adicione o import: `import { BankAccountCombobox } from './BankAccountCombobox'`.

- [ ] **Step 3: Verificar**

```bash
npx tsc -b
npx eslint src/pages/processos-virtuais/BankAccountCombobox.tsx src/pages/processos-virtuais/ProcessosVirtuais.tsx
npm run build
```
Esperado: limpo. Manualmente: abrir "Autuar Novo Processo" sem escolher secretaria → campo de conta desabilitado com instrução; escolher secretaria → lista só as contas daquele departamento; trocar de secretaria com uma conta já escolhida → seleção limpa; "Criar nova conta bancária" → abre o dialog com departamento preenchido e travado.

- [ ] **Step 4: Commit**

```bash
git add src/pages/processos-virtuais/BankAccountCombobox.tsx src/pages/processos-virtuais/ProcessosVirtuais.tsx
git commit -m "feat(processos-virtuais): combobox de conta bancária com busca, cascata e criação inline"
```

---

### Task 3: Combobox de Categoria — busca, Title Case, bloqueio de duplicata, criação inline

**Files:**
- Create: `src/pages/processos-virtuais/CategoryCombobox.tsx`
- Modify: `src/pages/processos-virtuais/ProcessosVirtuais.tsx` (bloco "Row 2: Categoria")

**Interfaces:**
- Consumes: `useVirtualProcessCategories`, `useCreateVirtualProcessCategory` (`@/hooks/useVirtualProcesses`).
- Produces: `export function CategoryCombobox({ value, onSelect, onManage }: Props)` onde `value: string` (o NOME da categoria — é assim que `VirtualProcess.category` é gravado hoje, texto livre, não id) e `onSelect: (name: string) => void`.

- [ ] **Step 1: Criar o combobox**

```tsx
// src/pages/processos-virtuais/CategoryCombobox.tsx
import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Search, Settings2, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  useVirtualProcessCategories,
  useCreateVirtualProcessCategory,
} from "@/hooks/useVirtualProcesses";

interface Props {
  value: string;
  onSelect: (name: string) => void;
  onManage: () => void;
}

/** "obras públicas" → "Obras Públicas". Mesma normalização usada pro bloqueio de duplicata. */
function toTitleCase(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\b\p{L}/gu, c => c.toUpperCase());
}

/**
 * Combobox de categoria de processo virtual (`VirtualProcessCategory`) —
 * NÃO é a mesma tabela de categorias do Financeiro (decisão do usuário,
 * 2026-09-23): continua servindo só Processos Virtuais.
 *
 * Title Case + bloqueio de duplicata são impostos AQUI, client-side, antes
 * de chamar a API — o banco só garante unicidade exata
 * (`@@unique([organizationId, name])`), sem normalizar capitalização
 * sozinho.
 */
export function CategoryCombobox({ value, onSelect, onManage }: Props) {
  const { data: categories = [], isLoading } = useVirtualProcessCategories(undefined);
  const { mutateAsync: createCategory, isPending: creating } = useCreateVirtualProcessCategory(undefined);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const term = query.trim().toLowerCase();
  const suggestions = term
    ? categories.filter(c => c.name.toLowerCase().includes(term))
    : categories;

  const normalizedQuery = toTitleCase(query);
  const alreadyExists =
    normalizedQuery.length > 0 &&
    categories.some(c => c.name.toLowerCase() === normalizedQuery.toLowerCase());
  const canCreate = normalizedQuery.length > 0 && !alreadyExists;

  async function handleCreate() {
    if (!canCreate) return;
    try {
      const created = await createCategory({ name: normalizedQuery });
      onSelect(created.name);
      setQuery("");
      setIsOpen(false);
      toast({ title: "Categoria criada com sucesso" });
    } catch {
      toast({ title: "Erro ao criar categoria", variant: "destructive" });
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-8"
            placeholder={isLoading ? "Carregando..." : "Buscar ou criar categoria..."}
            value={isOpen ? query : value}
            onFocus={() => { setQuery(""); setIsOpen(true); }}
            onChange={e => setQuery(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <button
          type="button"
          onClick={onManage}
          tabIndex={-1}
          className="flex shrink-0 items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
        >
          <Settings2 className="h-3.5 w-3.5" /> Gerenciar
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {query.trim() && (
            <button
              type="button"
              disabled={!canCreate || creating}
              onMouseDown={e => { e.preventDefault(); void handleCreate(); }}
              className="flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {alreadyExists
                ? `"${normalizedQuery}" já existe — selecione na lista abaixo`
                : `Criar categoria "${normalizedQuery}"`}
            </button>
          )}

          {suggestions.length === 0 && !query.trim() && (
            <div className="px-3 py-2.5 text-sm text-slate-500">Nenhuma categoria cadastrada.</div>
          )}

          {suggestions.map(c => (
            <button
              key={c.id}
              type="button"
              onMouseDown={e => { e.preventDefault(); onSelect(c.name); setIsOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
            >
              <Tag className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="truncate text-slate-700">{c.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Trocar o `<Select>` de Categoria pelo combobox em `CreateProcessDialog`**

Substitua o bloco "Row 2: Categoria" por:

```tsx
{/* Row 2: Categoria */}
<div className="space-y-1.5">
  <Label>Categoria <span className="text-red-500">*</span></Label>
  <CategoryCombobox
    value={form.category}
    onSelect={name => setForm(f => ({ ...f, category: name }))}
    onManage={() => openProcessModal('categorias')}
  />
</div>
```

Remova o import de `categories` que ficar não utilizado em `CreateProcessDialog` SE nada mais nesse componente o usar (confira antes de apagar — `eslint` acusa import não usado). Adicione: `import { CategoryCombobox } from './CategoryCombobox'`.

- [ ] **Step 3: Verificar**

```bash
npx tsc -b
npx eslint src/pages/processos-virtuais/CategoryCombobox.tsx src/pages/processos-virtuais/ProcessosVirtuais.tsx
npm run build
```
Manualmente: digitar "obras" quando já existe "Obras" cadastrada → botão de criar mostra "já existe", desabilitado; digitar "Licitações Públicas" novo → cria com Title Case exato.

- [ ] **Step 4: Commit**

```bash
git add src/pages/processos-virtuais/CategoryCombobox.tsx src/pages/processos-virtuais/ProcessosVirtuais.tsx
git commit -m "feat(processos-virtuais): combobox de categoria com busca, Title Case e bloqueio de duplicata"
```

---

### Task 4: Campo de Dotação Orçamentária (QDD), com cascata pelo departamento

**Files:**
- Modify: `src/pages/processos-virtuais/ProcessosVirtuais.tsx` (estado de `CreateProcessDialog`, novo bloco no formulário, payload de `create`)

**Interfaces:**
- Consumes: `QddItemSelect` (`@/pages/daily-allowances/QddItemSelect`, **já existe, já aceita `departmentId`, zero mudança nele**).
- Consumes: `CreateVirtualProcessPayload.qddItemId?: string | null` (`@/types/virtual-process`, já existe) — backend já aceita (`virtual-process.controller.ts:223-267`).

- [ ] **Step 1: Adicionar `qddItemId` ao estado do formulário**

Em `CreateProcessDialog`, no `useState` inicial do form e no `reset()`, adicione `qddItemId: ''` junto dos demais campos (mesma forma que os outros — string vazia = nenhum vínculo).

- [ ] **Step 2: Renderizar o campo, logo após a Row 7 (Conta Bancária)**

```tsx
{/* Row 8: Dotação Orçamentária (QDD) */}
<div className="space-y-1.5">
  <div className="flex items-center justify-between">
    <Label>Dotação Orçamentária (QDD) <span className="text-slate-400 font-normal">(opcional)</span></Label>
    {form.departmentId && (
      <a
        href={`/departamentos/${form.departmentId}`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
        title="Abre o departamento em outra aba, na aba Orçamento (QDD)"
      >
        <Settings2 className="h-3 w-3" /> Gerenciar
      </a>
    )}
  </div>
  <QddItemSelect
    departmentId={form.departmentId || null}
    value={form.qddItemId || null}
    onChange={next => setForm(f => ({ ...f, qddItemId: next ?? '' }))}
  />
</div>
```

`Settings2` já está importado no arquivo (usado pelos outros botões "Gerenciar"). Se o link para `/departamentos/${id}` não abrir diretamente na aba de Orçamento, está OK para esta task — abrir a página do departamento já resolve; sincronizar a query string da aba ativa é fora de escopo aqui (ver `DepartmentDetailPage.tsx` se quiser estender depois).

- [ ] **Step 3: Limpar a ficha ao trocar de departamento**

No mesmo `useEffect` de cascata que `BankAccountCombobox` já tem internamente para conta bancária, o QDD não precisa de lógica própria aqui: `QddItemSelect` já fica vazio/desabilitado sozinho quando `departmentId` muda (ele resolve `useQddItems({ departmentId })` de novo e a lista antiga simplesmente não inclui mais o item escolhido). Mas o VALOR `form.qddItemId` no formulário pai não se limpa sozinho — adicione, perto do outro `useEffect` de limpeza (ou junto dele, se preferir consolidar), um efeito equivalente:

```tsx
const { data: qddItemsForDept } = useQddItems({ departmentId: form.departmentId || undefined })
useEffect(() => {
  if (form.qddItemId && !(qddItemsForDept ?? []).some(i => i.id === form.qddItemId)) {
    setForm(f => ({ ...f, qddItemId: '' }))
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [form.departmentId])
```

Importe `useQddItems` de `@/hooks/useQddItems`.

- [ ] **Step 4: Incluir no payload de criação**

No `await create({...})` de `handleSubmit`, adicione `qddItemId: form.qddItemId || undefined,` junto dos demais campos.

- [ ] **Step 5: Verificar**

```bash
npx tsc -b
npx eslint src/pages/processos-virtuais/ProcessosVirtuais.tsx
npm run build
```
Manualmente: sem secretaria escolhida, campo QDD desabilitado ("Selecione o órgão concedente primeiro" — mensagem herdada de `QddItemSelect`, aceitável pois já é o texto usado em Diárias para o mesmo cenário); escolher uma ficha, trocar de secretaria → ficha se desfaz; autuar o processo com uma ficha vinculada e conferir, no detalhe do processo já existente (`ProcessDetailPanel`), que a dotação aparece corretamente.

- [ ] **Step 6: Commit**

```bash
git add src/pages/processos-virtuais/ProcessosVirtuais.tsx
git commit -m "feat(processos-virtuais): vincula Dotação Orçamentária (QDD) já na autuação do processo"
```

---

### Task 5: Validação final da Fase 1

- [ ] **Step 1: Rodar os três checks no repositório inteiro**

```bash
npx tsc -b
npx eslint .
npm run build
```
Esperado: os três limpos (warnings pré-existentes fora dos arquivos tocados são aceitáveis; zero erros).

- [ ] **Step 2: Roteiro manual completo**

1. Abrir "Autuar Novo Processo" sem escolher secretaria → Conta Bancária e QDD desabilitados com instrução, Categoria funciona normalmente (não depende de departamento).
2. Escolher uma secretaria com pelo menos uma conta e uma ficha QDD cadastradas → os dois campos passam a listar só os registros daquela secretaria.
3. Buscar por texto no combobox de Conta Bancária e no de Categoria → filtra em tempo real.
4. Clicar "Criar nova conta bancária" → dialog abre com o departamento já preenchido e bloqueado; salvar → toast de sucesso, dropdown com a lista atualizada.
5. Digitar uma categoria já existente (variando maiúsculas/minúsculas) → botão de criar aparece desabilitado avisando que já existe.
6. Digitar uma categoria nova → cria em Title Case e seleciona automaticamente.
7. Trocar de secretaria depois de já ter escolhido conta e ficha QDD → as duas seleções se desfazem.
8. Autuar um processo completo (com conta e QDD vinculados) → abrir o processo criado e conferir que os dados batem.
9. Clicar "Gerenciar" ao lado de Conta Bancária → abre `/financeiro/contas` em nova aba, sem perder o formulário em andamento.

- [ ] **Step 3: Commit final (se houver ajustes do roteiro manual)**

```bash
git add -A
git commit -m "fix(processos-virtuais): ajustes pós-roteiro manual da Fase 1"
```
(Só se necessário — se tudo passou nas tasks anteriores, este commit pode não existir.)
