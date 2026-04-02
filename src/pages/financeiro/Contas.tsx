import { useState } from "react";
import { Plus, Pencil, Trash2, Landmark, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  useFinanceBankAccounts,
  useCreateBankAccount,
  useUpdateBankAccount,
  useDeleteBankAccount,
} from "@/hooks/useFinance";
import type { BankAccount } from "@/lib/api/finance";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function formatCurrencyInput(val: string) {
  const digits = val.replace(/\D/g, "");
  if (!digits) return "";
  const cents = parseInt(digits, 10);
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

type AccountFormData = {
  name: string;
  agency: string;
  accountNumber: string;
  initialBalanceCents: string;
};

const emptyForm: AccountFormData = { name: "", agency: "", accountNumber: "", initialBalanceCents: "" };

function accountToForm(a: BankAccount): AccountFormData {
  return {
    name: a.name,
    agency: a.agency ?? "",
    accountNumber: a.accountNumber ?? "",
    initialBalanceCents: a.initialBalanceCents
      ? (a.initialBalanceCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })
      : "",
  };
}

type FormDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  account: BankAccount | null;
  workspaceId: string | undefined;
};

function AccountFormDialog({ open, onOpenChange, account, workspaceId }: FormDialogProps) {
  const [form, setForm] = useState<AccountFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const { mutateAsync: create } = useCreateBankAccount(workspaceId);
  const { mutateAsync: update } = useUpdateBankAccount(workspaceId);

  // Reset form when dialog opens
  const handleOpenChange = (v: boolean) => {
    if (v) setForm(account ? accountToForm(account) : emptyForm);
    onOpenChange(v);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const digits = form.initialBalanceCents.replace(/\D/g, "");
      const cents = digits ? parseInt(digits, 10) : 0;

      const payload = {
        name: form.name.trim(),
        agency: form.agency.trim() || undefined,
        accountNumber: form.accountNumber.trim() || undefined,
        initialBalanceCents: cents,
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
            <Label htmlFor="initialBalance">Saldo Inicial (R$)</Label>
            <Input
              id="initialBalance"
              placeholder="0,00"
              value={form.initialBalanceCents}
              onChange={(e) =>
                setForm((f) => ({ ...f, initialBalanceCents: formatCurrencyInput(e.target.value) }))
              }
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

export default function ContasBancarias() {
  const { data: accounts = [], isLoading } = useFinanceBankAccounts(undefined);
  const { mutate: deleteAccount, isPending: deleting } = useDeleteBankAccount(undefined);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleEdit(account: BankAccount) {
    setEditing(account);
    setFormOpen(true);
  }

  function handleNewAccount() {
    setEditing(null);
    setFormOpen(true);
  }

  function confirmDelete() {
    if (!deletingId) return;
    deleteAccount(deletingId, {
      onSuccess: () => {
        toast({ title: "Conta removida com sucesso" });
        setDeletingId(null);
      },
      onError: () => {
        toast({ title: "Erro ao remover conta", description: "Verifique se há lançamentos vinculados a esta conta.", variant: "destructive" });
        setDeletingId(null);
      },
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-3xl font-semibold text-slate-900">Contas Bancárias</div>
          <div className="mt-1 text-slate-500">Gerencie as contas bancárias do workspace.</div>
        </div>
        <Button onClick={handleNewAccount} className="bg-[#0A5BC4] hover:bg-[#094FA8] text-white gap-2">
          <Plus className="h-4 w-4" />
          Nova Conta
        </Button>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-5 space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-6 w-24" />
            </Card>
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center border-dashed">
          <Landmark className="h-10 w-10 text-slate-300 mb-3" />
          <div className="text-sm font-medium text-slate-600">Nenhuma conta bancária cadastrada</div>
          <div className="text-xs text-slate-400 mt-1">Clique em "Nova Conta" para começar.</div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Card key={account.id} className="rounded-2xl border-slate-200 p-5 shadow-sm flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#0A5BC4]/10">
                    <Landmark className="h-4 w-4 text-[#0A5BC4]" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800 truncate">{account.name}</div>
                    {(account.agency || account.accountNumber) && (
                      <div className="text-xs text-slate-400 truncate">
                        {[account.agency && `Ag: ${account.agency}`, account.accountNumber && `C/C: ${account.accountNumber}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-slate-700" onClick={() => handleEdit(account)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-500" onClick={() => setDeletingId(account.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="border-t border-slate-100 pt-3">
                <div className="text-xs text-slate-400 uppercase tracking-wide font-medium">Saldo Inicial</div>
                <div className="text-lg font-bold text-slate-800 tabular-nums mt-0.5">
                  {formatCurrency(account.initialBalanceCents)}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <AccountFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        account={editing}
        workspaceId={undefined}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deletingId} onOpenChange={(v) => !v && setDeletingId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-center">Remover Conta Bancária?</DialogTitle>
            <DialogDescription className="text-center">
              Esta ação não pode ser desfeita. Contas com lançamentos vinculados não podem ser removidas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-2">
            <Button variant="outline" onClick={() => setDeletingId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Sim, Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
