import { useEffect, useState } from "react";
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
 * (Processos Virtuais, Fase 1). Mesmo componente, mesmas regras — nada
 * duplicado.
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

  // Reset form quando o dialog abre — via efeito ligado ao PROP `open`, não
  // dentro de um wrapper de `onOpenChange`. Achado da revisão final da Fase 1
  // (2026-09-24, Crítico #1): `open` aqui é controlado de fora (o dialog é
  // reaberto/prefixado por `setCreateOpen(true)` em `BankAccountCombobox`,
  // uma mudança de PROP, não uma interação do próprio Radix). O
  // `useControllableState` do Radix só chama `onChange` quando é O PRÓPRIO
  // Radix quem pede a mudança (Esc, clique no overlay, botão de fechar) —
  // nunca quando o consumidor muda o prop `open` diretamente. Um
  // `onOpenChange` embrulhado nunca via a abertura vinda de fora, e o
  // formulário abria sempre com `emptyForm` (departamento em branco, mesmo
  // com `lockedDepartmentId` presente) — o mesmo bug, achado aqui, também
  // fazia "Editar"/"Nova Conta" em `/financeiro/contas` abrirem com dados
  // residuais da última vez que o dialog foi usado.
  useEffect(() => {
    if (open) {
      setForm(
        account
          ? accountToForm(account)
          : { ...emptyForm, departmentId: lockedDepartmentId ?? "" }
      );
    }
  }, [open, account, lockedDepartmentId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Achado da revisão final (Crítico #2): este formulário é renderizado
    // dentro do combobox de Conta Bancária, que por sua vez fica dentro do
    // <form> de "Autuar Novo Processo". `DialogContent` é portalado para
    // `document.body`, mas eventos sintéticos do React sobem pela árvore de
    // COMPONENTES, não pela árvore do DOM — um `submit` daqui, sem
    // `stopPropagation`, também dispara o `onSubmit` do formulário externo
    // (React Portals: "an event fired from inside a portal will propagate to
    // ancestors in the containing React tree"). Sem isto, clicar "Criar
    // Conta" (ou apertar Enter em qualquer campo deste dialog) autuava o
    // processo externo prematuramente, com o que já estivesse preenchido.
    e.stopPropagation();
    if (!form.name.trim()) return;
    // Departamento obrigatório também AQUI, não só no servidor (Épico 8,
    // FR-015) — despesa sem setor identificado não tem ordenador responsável.
    if (!form.departmentId) {
      toast({ title: "Selecione o departamento responsável pela conta.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // `initialBalanceCents` NÃO entra no payload de propósito (Épico 8,
      // FR-016) — o campo é só exibição; o servidor ignoraria de qualquer
      // forma, mas a tela nem tenta enviar.
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
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agency">Agência</Label>
              <Input
                id="agency"
                placeholder="Ex: 1234-5"
                value={form.agency}
                onChange={(e) => setForm((f) => ({ ...f, agency: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountNumber">Número da Conta</Label>
              <Input
                id="accountNumber"
                placeholder="Ex: 00012345-6"
                value={form.accountNumber}
                onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
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
              onChange={(next) => setForm((f) => ({ ...f, departmentId: next ?? "" }))}
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
