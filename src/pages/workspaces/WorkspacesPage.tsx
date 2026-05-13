// src/pages/workspaces/WorkspacesPage.tsx
import { useState } from "react";
import { useWorkspaces, useCreateWorkspace } from "@/hooks/useWorkspaces";
import { useMe } from "@/hooks/useMe";
import { WorkspaceCard } from "@/components/workspaces/WorkspaceCard";
import { Button } from "@/components/ui/button";
import { Plus, LayoutDashboard, Building2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function WorkspacesPage() {
  const { data: meData } = useMe();
  const userDepts = meData?.user?.departments ?? [];
  const userId    = meData?.user?.id ?? "";
  const isSuperAdmin = !!meData?.user?.isSuperAdmin;

  const allPermissions = meData?.user?.roles?.flatMap(r => r.role?.permissions ?? []) ?? [];
  const isSystemAdmin  = isSuperAdmin || allPermissions.includes("system:admin");

  const { data: workspaces = [], isLoading } = useWorkspaces();
  const { mutateAsync: createWorkspace, isPending } = useCreateWorkspace();

  const [isOpen, setIsOpen]           = useState(false);
  const [name, setName]               = useState("");
  const [desc, setDesc]               = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState<string>("");

  // Strict split: personal vs sectoral
  const myWorkspaces     = workspaces.filter(w => !w.departmentId);
  const sectorWorkspaces = workspaces.filter(w => !!w.departmentId);

  const handleClose = () => {
    setIsOpen(false);
    setName("");
    setDesc("");
    setSelectedDeptId("");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createWorkspace({
        name,
        description: desc,
        departmentId: selectedDeptId || null,
      });
      handleClose();
    } catch {
      // handled by mutation
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-full text-slate-400">Carregando workspaces...</div>
  );

  return (
    <div className="p-8 space-y-6">
      <Tabs defaultValue="meus">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Workspaces</h1>
            <p className="text-muted-foreground">Gerencie suas equipes e projetos.</p>
          </div>

          <div className="flex items-center gap-3">
            <TabsList>
              <TabsTrigger value="meus" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Meus Workspaces
              </TabsTrigger>
              <TabsTrigger value="setor" className="gap-2">
                <Building2 className="h-4 w-4" />
                Workspaces do Setor
              </TabsTrigger>
            </TabsList>

            <Dialog open={isOpen} onOpenChange={open => open ? setIsOpen(true) : handleClose()}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Novo Workspace</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Workspace</DialogTitle>
                  <DialogDescription>Crie um novo espaço para gerenciar tarefas e sua equipe.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Workspace</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Ex: Departamento Financeiro"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="desc">Descrição</Label>
                    <Textarea
                      id="desc"
                      value={desc}
                      onChange={e => setDesc(e.target.value)}
                      placeholder="Opcional: Descreva o propósito deste espaço."
                    />
                  </div>

                  {userDepts.length > 0 && (
                    <div className="space-y-2">
                      <Label>Vincular a um Setor <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                      <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Workspace pessoal (sem setor)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Workspace pessoal (sem setor)</SelectItem>
                          {userDepts.map(dept => {
                            const canCreate = isSystemAdmin || dept.managerId === userId;
                            return (
                              <SelectItem
                                key={dept.id}
                                value={dept.id}
                                disabled={!canCreate}
                              >
                                {dept.name}
                                {!canCreate && " (apenas o Chefe pode criar)"}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Workspaces setoriais ficam visíveis para todos os membros do setor automaticamente.
                      </p>
                    </div>
                  )}

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
                    <Button type="submit" disabled={isPending}>
                      {isPending ? "Criando..." : "Criar Workspace"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Meus Workspaces */}
        <TabsContent value="meus" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myWorkspaces.map(ws => <WorkspaceCard key={ws.id} workspace={ws} />)}
            {myWorkspaces.length === 0 && (
              <div className="col-span-full text-center py-12 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Você ainda não tem workspaces pessoais.</p>
                <Button variant="link" onClick={() => setIsOpen(true)}>Crie o primeiro agora</Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Workspaces do Setor */}
        <TabsContent value="setor" className="mt-6">
          {userDepts.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed rounded-xl text-slate-400">
              <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Você não está vinculado a nenhum departamento.</p>
              <p className="text-sm mt-1">Solicite ao administrador que te vincule a um setor.</p>
            </div>
          ) : sectorWorkspaces.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed rounded-xl text-slate-400">
              <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum workspace vinculado ao(s) seu(s) setor(es) ainda.</p>
              <p className="text-sm mt-1">O Chefe do setor pode criar um workspace setorial.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sectorWorkspaces.map(ws => <WorkspaceCard key={ws.id} workspace={ws} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
