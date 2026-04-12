import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tag, Plus, Trash2, Loader2 } from "lucide-react";
import { libraryService } from "@/lib/api/library";
import { toast } from "@/hooks/use-toast";

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

export function ManageCategoriesModal({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["library", "categories"],
    queryFn: libraryService.listCategories,
    enabled: open,
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => libraryService.createCategory(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["library", "categories"] });
      setNewName("");
      toast({ title: "Categoria criada." });
    },
    onError: (err: unknown) => {
      const msg = (err as { message?: string })?.message ?? "Erro ao criar categoria.";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => libraryService.deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["library", "categories"] });
      qc.invalidateQueries({ queryKey: ["library", "list"] });
      toast({ title: "Categoria removida." });
    },
    onError: (err: unknown) => {
      const msg = (err as { message?: string })?.message ?? "Erro ao remover.";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    },
  });

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    createMutation.mutate(name);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-indigo-500" />
            Gerenciar Categorias
          </DialogTitle>
        </DialogHeader>

        {/* Add form */}
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Nome da categoria (ex: Decretos)"
            className="flex-1"
          />
          <Button type="submit" disabled={!newName.trim() || createMutation.isPending} size="sm">
            {createMutation.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Plus className="h-4 w-4" />}
          </Button>
        </form>

        {/* List */}
        <ScrollArea className="max-h-72">
          {isLoading ? (
            <div className="flex justify-center py-8 text-slate-400 gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : categories.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Nenhuma categoria cadastrada.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {categories.map(cat => (
                <li key={cat.id} className="flex items-center justify-between px-1 py-2.5 group">
                  <div className="flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                    <span className="text-sm text-slate-700 font-medium">{cat.name}</span>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(cat.id)}
                    disabled={deleteMutation.isPending}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all"
                    title="Remover"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
