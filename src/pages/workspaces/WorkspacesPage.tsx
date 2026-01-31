// src/pages/workspaces/WorkspacesPage.tsx
import { useState } from "react";
import { useWorkspaces, useCreateWorkspace } from "@/hooks/useWorkspaces";
import { WorkspaceCard } from "@/components/workspaces/WorkspaceCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // Se não tiver, use Input normal ou instale

export default function WorkspacesPage() {
  const { data: workspaces, isLoading } = useWorkspaces();
  const { mutateAsync: createWorkspace, isPending } = useCreateWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  
  // Form state
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createWorkspace({ name, description: desc });
      setIsOpen(false);
      setName("");
      setDesc("");
    } catch (error) {
      console.error("Erro ao criar", error);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Carregando workspaces...</div>;
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workspaces</h1>
          <p className="text-muted-foreground">Gerencie suas equipes e projetos.</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Novo Workspace
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Workspace</DialogTitle>
              <DialogDescription>
                Crie um novo espaço para gerenciar tarefas e sua equipe.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Workspace</Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Ex: Departamento Financeiro"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Descrição</Label>
                <Textarea 
                  id="desc" 
                  value={desc} 
                  onChange={(e) => setDesc(e.target.value)} 
                  placeholder="Opcional: Descreva o propósito deste espaço." 
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Criando..." : "Criar Workspace"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workspaces?.map((workspace) => (
          <WorkspaceCard key={workspace.id} workspace={workspace} />
        ))}
        
        {workspaces?.length === 0 && (
            <div className="col-span-full text-center py-12 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Você ainda não tem workspaces.</p>
                <Button variant="link" onClick={() => setIsOpen(true)}>Crie o primeiro agora</Button>
            </div>
        )}
      </div>
    </div>
  );
}