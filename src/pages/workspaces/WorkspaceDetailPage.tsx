import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { workspaceService } from "@/lib/api/workspaces";
import { useWorkspaceTasks, useCreateTask } from "@/hooks/useTasks";
import { TaskCard } from "@/components/workspaces/TaskCard";
import { TaskModal } from "@/components/workspaces/TaskModal";
import { InviteMemberModal } from "@/components/workspaces/InviteMemberModal";
import { MembersListModal } from "@/components/workspaces/MembersListModal"; 
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Layout, Trash2, Loader2, LogOut } from "lucide-react"; 
import { type TaskStatus, type Task } from "@/types/task";
import { type Workspace } from "@/types/workspace"; 
import { useState } from "react";
import { useMe } from "@/hooks/useMe"; 
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: 'TODO', label: 'A Fazer' },
  { id: 'IN_PROGRESS', label: 'Em Progresso' },
  { id: 'IN_REVIEW', label: 'Revisão' },
  { id: 'DONE', label: 'Concluído' },
];

export default function WorkspaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // 1. Busca dados do usuário logado
  const { data: userData } = useMe(); 
  
  // CORREÇÃO CRÍTICA: Tentativa robusta de pegar o ID
  // Às vezes a API retorna { id: ... } direto, às vezes { data: { id: ... } }
  const currentUserId = (userData as { id?: string; data?: { id?: string }; user?: { id?: string } } | undefined)?.id
    || (userData as { id?: string; data?: { id?: string }; user?: { id?: string } } | undefined)?.data?.id
    || (userData as { id?: string; data?: { id?: string }; user?: { id?: string } } | undefined)?.user?.id;

  // 2. Busca dados do workspace
  const { data: workspace, isLoading: isLoadingWorkspace } = useQuery<Workspace>({
    queryKey: ["workspace", id],
    queryFn: () => workspaceService.getById(id!),
    enabled: !!id,
  });

  const { data: tasks, isLoading: isLoadingTasks } = useWorkspaceTasks(id);
  const { mutateAsync: createTask } = useCreateTask(id!);

  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    await createTask({ title: newTaskTitle, status: 'TODO', priority: 'MEDIUM' });
    setNewTaskTitle("");
    setIsNewTaskOpen(false);
  };

  const handleDeleteWorkspace = async () => {
    if (!id) return;
    if (confirm("ATENÇÃO: Isso apagará o workspace e TODAS as tarefas. Não há como desfazer.")) {
      try {
        await workspaceService.deleteWorkspace(id);
        navigate("/workspaces");
      } catch {
        alert("Erro ao excluir workspace.");
      }
    }
  };

  const handleLeaveWorkspace = async () => {
    if (!id || !currentUserId) {
        alert("Erro: Usuário não identificado. Tente recarregar a página.");
        return;
    }
    
    if (confirm("Tem certeza que deseja SAIR deste workspace?")) {
        try {
            await workspaceService.removeMember(id, currentUserId);
            navigate("/workspaces");
        } catch {
            alert("Erro ao sair do workspace.");
        }
    }
  };

  if (isLoadingWorkspace || !workspace) return <div className="p-8 flex items-center gap-2"><Loader2 className="animate-spin"/> Carregando board...</div>;

  const members = workspace.members || [];
  
  // Identifica o membro atual
  const currentMember = currentUserId ? members.find(m => m.userId === currentUserId) : null;
  const isOwner = currentMember?.role === 'OWNER';

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <header className="px-6 py-4 border-b bg-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
            <Layout className="h-5 w-5 text-gray-500" />
            <h1 className="text-xl font-bold">{workspace.name}</h1>
            
            <MembersListModal 
                workspaceId={id!} 
                members={members} 
                currentUserId={currentUserId} 
            />
        </div>
        
        <div className="flex items-center gap-3">
            {isOwner && (
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                    onClick={handleDeleteWorkspace}
                    title="Excluir Workspace Inteiro"
                >
                    <Trash2 size={18} />
                </Button>
            )}

            {!isOwner && currentMember && (
                 <Button 
                 variant="ghost" 
                 size="icon" 
                 className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                 onClick={handleLeaveWorkspace}
                 title="Sair do Workspace"
             >
                 <LogOut size={18} />
             </Button>
            )}

            <InviteMemberModal workspaceId={id!} />

            <Dialog open={isNewTaskOpen} onOpenChange={setIsNewTaskOpen}>
                <DialogTrigger asChild>
                    <Button size="sm"><Plus className="w-4 h-4 mr-2"/> Nova Tarefa</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Criar Nova Tarefa</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateTask} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Título da Tarefa</Label>
                            <Input 
                                value={newTaskTitle} 
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                placeholder="Ex: Atualizar documentação"
                                autoFocus
                            />
                        </div>
                        <DialogFooter>
                            <Button type="submit">Criar</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
      </header>

      <div className="flex-1 overflow-x-auto overflow-y-hidden bg-gray-50/50 p-6">
        {isLoadingTasks ? (
           <div className="flex h-full justify-center items-center text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mr-2" /> Carregando tarefas...
           </div>
        ) : (
          <div className="flex h-full gap-6 min-w-max">
            {COLUMNS.map((col) => {
              const colTasks = tasks?.filter((t) => t.status === col.id) || [];
              
              return (
                <div key={col.id} className="w-80 flex flex-col h-full bg-gray-100/50 rounded-lg border border-gray-200">
                  <div className="p-3 font-semibold text-sm flex justify-between items-center border-b bg-gray-50 rounded-t-lg">
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${col.id === 'DONE' ? 'bg-green-500' : 'bg-blue-500'}`} />
                      {col.label}
                    </span>
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{colTasks.length}</Badge>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                    {colTasks.map((task: Task) => (
                      <TaskCard 
                          key={task.id} 
                          task={task} 
                          onClick={(t) => setSelectedTaskId(t.id)} 
                      />
                    ))}
                    {colTasks.length === 0 && (
                      <div className="text-center py-8 text-xs text-muted-foreground border-2 border-dashed border-gray-200 rounded-md">
                          Sem tarefas
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <TaskModal 
        isOpen={!!selectedTaskId}
        taskId={selectedTaskId}
        workspaceId={id!}
        workspaceMembers={members}  // <--- CORREÇÃO: Propriedade adicionada
        onClose={() => setSelectedTaskId(null)}
      />
    </div>
  );
}