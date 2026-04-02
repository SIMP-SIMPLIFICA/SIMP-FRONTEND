import { useState } from "react";
import { Plus, Pencil, Trash2, Tag, Loader2, AlertTriangle } from "lucide-react";
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
  useFinanceCategories,
  useCreateFinanceCategory,
  useUpdateFinanceCategory,
  useDeleteFinanceCategory,
} from "@/hooks/useFinance";
import type { FinanceCategory } from "@/lib/api/finance";

type CategoryFormData = { name: string; description: string };

type FormDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  category: FinanceCategory | null;
  workspaceId: string | undefined;
};

function CategoryFormDialog({ open, onOpenChange, category, workspaceId }: FormDialogProps) {
  const [form, setForm] = useState<CategoryFormData>({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

  const { mutateAsync: create } = useCreateFinanceCategory(workspaceId);
  const { mutateAsync: update } = useUpdateFinanceCategory(workspaceId);

  const handleOpenChange = (v: boolean) => {
    if (v) {
      setForm({ name: category?.name ?? "", description: category?.description ?? "" });
    }
    onOpenChange(v);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
      };
      if (category) {
        await update({ id: category.id, data: payload });
        toast({ title: "Categoria atualizada com sucesso" });
      } else {
        await create(payload);
        toast({ title: "Categoria criada com sucesso" });
      }
      onOpenChange(false);
    } catch {
      toast({ title: "Erro ao salvar categoria", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
          <DialogDescription>
            {category ? "Altere os dados da categoria abaixo." : "Preencha os dados da nova categoria financeira."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="cat-name">Nome <span className="text-red-500">*</span></Label>
            <Input
              id="cat-name"
              required
              placeholder="Ex: Manutenção, Serviços, TI..."
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cat-desc">Descrição</Label>
            <Input
              id="cat-desc"
              placeholder="Descrição opcional da categoria"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-[#0A5BC4] hover:bg-[#094FA8] text-white" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {category ? "Salvar" : "Criar Categoria"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Categorias() {
  const { data: categories = [], isLoading } = useFinanceCategories(undefined);
  const { mutate: deleteCategory, isPending: deleting } = useDeleteFinanceCategory(undefined);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceCategory | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleEdit(cat: FinanceCategory) {
    setEditing(cat);
    setFormOpen(true);
  }

  function handleNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function confirmDelete() {
    if (!deletingId) return;
    deleteCategory(deletingId, {
      onSuccess: () => {
        toast({ title: "Categoria removida com sucesso" });
        setDeletingId(null);
      },
      onError: () => {
        toast({ title: "Erro ao remover categoria", description: "Verifique se há lançamentos vinculados a esta categoria.", variant: "destructive" });
        setDeletingId(null);
      },
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-3xl font-semibold text-slate-900">Categorias</div>
          <div className="mt-1 text-slate-500">Gerencie as categorias de lançamentos financeiros.</div>
        </div>
        <Button onClick={handleNew} className="bg-[#0A5BC4] hover:bg-[#094FA8] text-white gap-2">
          <Plus className="h-4 w-4" />
          Nova Categoria
        </Button>
      </div>

      {/* Lista */}
      <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-4">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-52" />
                </div>
                <div className="flex gap-1">
                  <Skeleton className="h-7 w-7 rounded" />
                  <Skeleton className="h-7 w-7 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Tag className="h-10 w-10 text-slate-300 mb-3" />
            <div className="text-sm font-medium text-slate-600">Nenhuma categoria cadastrada</div>
            <div className="text-xs text-slate-400 mt-1">Clique em "Nova Categoria" para começar.</div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-50">
                    <Tag className="h-3.5 w-3.5 text-amber-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">{cat.name}</div>
                    {cat.description && (
                      <div className="text-xs text-slate-400 truncate">{cat.description}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-4">
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-slate-700" onClick={() => handleEdit(cat)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-500" onClick={() => setDeletingId(cat.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Form Dialog */}
      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editing}
        workspaceId={undefined}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deletingId} onOpenChange={(v) => !v && setDeletingId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-center">Remover Categoria?</DialogTitle>
            <DialogDescription className="text-center">
              Esta ação não pode ser desfeita. Categorias com lançamentos vinculados não podem ser removidas.
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
