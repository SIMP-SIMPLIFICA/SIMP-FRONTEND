import { useState } from "react";
import { Plus, Pencil, Trash2, Landmark, Tag, Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import {
  useFinanceBankAccounts,
  useCreateBankAccount,
  useUpdateBankAccount,
  useDeleteBankAccount,
  useFinanceCategories,
  useCreateFinanceCategory,
  useUpdateFinanceCategory,
  useDeleteFinanceCategory,
} from "@/hooks/useFinance";
import type { BankAccount, FinanceCategory } from "@/lib/api/finance";
import { useUniversalFinanceModal } from "@/context/UniversalFinanceModalContext";

// ─── Formatação ───────────────────────────────────────────────────────────────

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function parseCurrencyInput(val: string): number {
  const digits = val.replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

function formatCurrencyInput(val: string): string {
  const digits = val.replace(/\D/g, "");
  if (!digits) return "";
  return (parseInt(digits, 10) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

// ─── Aba Contas Bancárias ──────────────────────────────────────────────────────

type AccountForm = { name: string; agency: string; accountNumber: string; initialBalanceCents: string };
const emptyAccountForm: AccountForm = { name: "", agency: "", accountNumber: "", initialBalanceCents: "" };

function ContasTab() {
  const { data: accounts = [], isLoading } = useFinanceBankAccounts(undefined);
  const { mutateAsync: create } = useCreateBankAccount(undefined);
  const { mutateAsync: update } = useUpdateBankAccount(undefined);
  const { mutate: remove, isPending: removing } = useDeleteBankAccount(undefined);

  const [mode, setMode] = useState<"list" | "form">("list");
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [form, setForm] = useState<AccountForm>(emptyAccountForm);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(emptyAccountForm);
    setMode("form");
  }

  function openEdit(a: BankAccount) {
    setEditing(a);
    setForm({
      name: a.name,
      agency: a.agency ?? "",
      accountNumber: a.accountNumber ?? "",
      initialBalanceCents: a.initialBalanceCents
        ? (a.initialBalanceCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })
        : "",
    });
    setMode("form");
  }

  function backToList() {
    setMode("list");
    setEditing(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        agency: form.agency.trim() || undefined,
        accountNumber: form.accountNumber.trim() || undefined,
        initialBalanceCents: parseCurrencyInput(form.initialBalanceCents),
      };
      if (editing) {
        await update({ id: editing.id, data: payload });
        toast({ title: "Conta atualizada" });
      } else {
        await create(payload);
        toast({ title: "Conta criada" });
      }
      backToList();
    } catch {
      toast({ title: "Erro ao salvar conta", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!confirmId) return;
    remove(confirmId, {
      onSuccess: () => { toast({ title: "Conta removida" }); setConfirmId(null); },
      onError: () => { toast({ title: "Erro ao remover conta", description: "Verifique se há lançamentos vinculados.", variant: "destructive" }); setConfirmId(null); },
    });
  }

  if (mode === "form") {
    return (
      <div className="space-y-4">
        <button type="button" onClick={backToList} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar
        </button>
        <p className="text-base font-semibold text-slate-800">{editing ? "Editar Conta Bancária" : "Nova Conta Bancária"}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome da Conta <span className="text-red-500">*</span></Label>
            <Input required placeholder="Ex: Conta Corrente Bradesco" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Agência</Label>
              <Input placeholder="Ex: 1234-5" value={form.agency}
                onChange={e => setForm(f => ({ ...f, agency: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Número da Conta</Label>
              <Input placeholder="Ex: 00012345-6" value={form.accountNumber}
                onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Saldo Inicial (R$)</Label>
            <Input placeholder="0,00" value={form.initialBalanceCents}
              onChange={e => setForm(f => ({ ...f, initialBalanceCents: formatCurrencyInput(e.target.value) }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={backToList} disabled={saving}>Cancelar</Button>
            <Button type="submit" className="bg-[#0A5BC4] hover:bg-[#094FA8] text-white" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editing ? "Salvar" : "Criar Conta"}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{accounts.length} conta{accounts.length !== 1 ? "s" : ""} cadastrada{accounts.length !== 1 ? "s" : ""}</p>
        <Button size="sm" onClick={openCreate} className="bg-[#0A5BC4] hover:bg-[#094FA8] text-white gap-1.5">
          <Plus className="h-3.5 w-3.5" />Nova Conta
        </Button>
      </div>

      {confirmId && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <p className="text-sm font-medium">Remover esta conta? Contas com lançamentos não podem ser removidas.</p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => setConfirmId(null)}>Cancelar</Button>
            <Button size="sm" variant="destructive" onClick={confirmDelete} disabled={removing}>
              {removing && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Remover
            </Button>
          </div>
        </div>
      )}

      <ScrollArea className="h-[280px]">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 rounded-lg bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400">
            <Landmark className="h-8 w-8 mb-2 text-slate-200" />
            <p className="text-sm">Nenhuma conta cadastrada</p>
          </div>
        ) : (
          <div className="space-y-2 pr-1">
            {accounts.map(a => (
              <div key={a.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#0A5BC4]/10">
                  <Landmark className="h-4 w-4 text-[#0A5BC4]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{a.name}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {[a.agency && `Ag: ${a.agency}`, a.accountNumber && `C/C: ${a.accountNumber}`, formatCurrency(a.initialBalanceCents)]
                      .filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-slate-700" onClick={() => openEdit(a)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-500" onClick={() => setConfirmId(a.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ─── Aba Categorias ────────────────────────────────────────────────────────────

type CategoryForm = { name: string; description: string };
const emptyCategoryForm: CategoryForm = { name: "", description: "" };

function CategoriasTab() {
  const { data: categories = [], isLoading } = useFinanceCategories(undefined);
  const { mutateAsync: create } = useCreateFinanceCategory(undefined);
  const { mutateAsync: update } = useUpdateFinanceCategory(undefined);
  const { mutate: remove, isPending: removing } = useDeleteFinanceCategory(undefined);

  const [mode, setMode] = useState<"list" | "form">("list");
  const [editing, setEditing] = useState<FinanceCategory | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyCategoryForm);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(emptyCategoryForm);
    setMode("form");
  }

  function openEdit(c: FinanceCategory) {
    setEditing(c);
    setForm({ name: c.name, description: c.description ?? "" });
    setMode("form");
  }

  function backToList() {
    setMode("list");
    setEditing(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), description: form.description.trim() || undefined };
      if (editing) {
        await update({ id: editing.id, data: payload });
        toast({ title: "Categoria atualizada" });
      } else {
        await create(payload);
        toast({ title: "Categoria criada" });
      }
      backToList();
    } catch {
      toast({ title: "Erro ao salvar categoria", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!confirmId) return;
    remove(confirmId, {
      onSuccess: () => { toast({ title: "Categoria removida" }); setConfirmId(null); },
      onError: () => { toast({ title: "Erro ao remover categoria", description: "Verifique se há lançamentos vinculados.", variant: "destructive" }); setConfirmId(null); },
    });
  }

  if (mode === "form") {
    return (
      <div className="space-y-4">
        <button type="button" onClick={backToList} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar
        </button>
        <p className="text-base font-semibold text-slate-800">{editing ? "Editar Categoria" : "Nova Categoria"}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome <span className="text-red-500">*</span></Label>
            <Input required placeholder="Ex: Manutenção, Serviços, TI..." value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input placeholder="Descrição opcional" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={backToList} disabled={saving}>Cancelar</Button>
            <Button type="submit" className="bg-[#0A5BC4] hover:bg-[#094FA8] text-white" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editing ? "Salvar" : "Criar Categoria"}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{categories.length} categoria{categories.length !== 1 ? "s" : ""}</p>
        <Button size="sm" onClick={openCreate} className="bg-[#0A5BC4] hover:bg-[#094FA8] text-white gap-1.5">
          <Plus className="h-3.5 w-3.5" />Nova Categoria
        </Button>
      </div>

      {confirmId && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <p className="text-sm font-medium">Remover esta categoria? Categorias com lançamentos não podem ser removidas.</p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => setConfirmId(null)}>Cancelar</Button>
            <Button size="sm" variant="destructive" onClick={confirmDelete} disabled={removing}>
              {removing && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Remover
            </Button>
          </div>
        </div>
      )}

      <ScrollArea className="h-[280px]">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 rounded-lg bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400">
            <Tag className="h-8 w-8 mb-2 text-slate-200" />
            <p className="text-sm">Nenhuma categoria cadastrada</p>
          </div>
        ) : (
          <div className="space-y-1.5 pr-1">
            {categories.map(c => (
              <div key={c.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-amber-50">
                  <Tag className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{c.name}</p>
                  {c.description && <p className="text-xs text-slate-400 truncate">{c.description}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-slate-700" onClick={() => openEdit(c)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-500" onClick={() => setConfirmId(c.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ─── Modal Universal ───────────────────────────────────────────────────────────

export function UniversalFinanceModal() {
  const { isOpen, close, activeTab, setActiveTab } = useUniversalFinanceModal();

  return (
    <Dialog open={isOpen} onOpenChange={v => !v && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Configurações Financeiras</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as "contas" | "categorias")}>
          <TabsList className="w-full">
            <TabsTrigger value="contas" className="flex-1 gap-1.5">
              <Landmark className="h-3.5 w-3.5" />
              Contas Bancárias
            </TabsTrigger>
            <TabsTrigger value="categorias" className="flex-1 gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              Categorias
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contas" className="mt-4">
            <ContasTab />
          </TabsContent>
          <TabsContent value="categorias" className="mt-4">
            <CategoriasTab />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
