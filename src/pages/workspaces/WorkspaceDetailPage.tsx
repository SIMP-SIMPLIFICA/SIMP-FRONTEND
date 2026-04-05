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
import { type TaskStatus, type TaskPriority, type Task } from "@/types/task";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'TODO', label: 'A Fazer', color: 'bg-slate-400' },
  { id: 'IN_PROGRESS', label: 'Em Progresso', color: 'bg-blue-500' },
  { id: 'IN_REVIEW', label: 'Revisão', color: 'bg-amber-500' },
  { id: 'DONE', label: 'Concluído', color: 'bg-green-500' },
  { id: 'CANCELED', label: 'Cancelado', color: 'bg-red-400' },
];

export default function WorkspaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // 1. Busca dados do usuário logado
  const { data: userData } = useMe(); 
  
  // CORREÇÃO CRÍTICA: Tentativa robusta de pegar o ID
  // Às vezes a API retorna { id: ... } direto, às vezes { data: { id: ... } }
  const currentUserId = (userData as any)?.id || (userData as any)?.data?.id || (userData as any)?.user?.id;

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
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>("MEDIUM");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskAssignees, setNewTaskAssignees] = useState<string[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const toggleAssignee = (userId: string) => {
    setNewTaskAssignees(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    await createTask({
      title: newTaskTitle,
      status: 'TODO',
      priority: newTaskPriority,
      description: newTaskDescription.trim() || undefined,
      dueDate: newTaskDueDate || undefined,
      assigneeIds: newTaskAssignees.length > 0 ? newTaskAssignees : undefined,
    });
    setNewTaskTitle(""); setNewTaskDescription(""); setNewTaskPriority("MEDIUM");
    setNewTaskDueDate(""); setNewTaskAssignees([]);
    setIsNewTaskOpen(false);
  };

  const handleDeleteWorkspace = async () => {
    if (!id) return;
    if (confirm("ATENÇÃO: Isso apagará o workspace e TODAS as tarefas. Não há como desfazer.")) {
      try {
        await workspaceService.deleteWorkspace(id);
        navigate("/workspaces");
      } catch (error) {
        alert("Erro ao excluir workspace.");
        console.error(error);
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
        } catch (error) {
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
                    <form onSubmit={handleCreateTask} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label>Título <span className="text-red-500">*</span></Label>
                            <Input
                                required
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                placeholder="Ex: Atualizar documentação"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Descrição</Label>
                            <Textarea
                                value={newTaskDescription}
                                onChange={(e) => setNewTaskDescription(e.target.value)}
                                placeholder="Detalhes da tarefa..."
                                rows={2}
                                className="resize-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4 items-end">
                            <div className="space-y-1.5">
                                <Label>Prioridade</Label>
                                <Select value={newTaskPriority} onValueChange={(v) => setNewTaskPriority(v as TaskPriority)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="LOW">Baixa</SelectItem>
                                        <SelectItem value="MEDIUM">Média</SelectItem>
                                        <SelectItem value="HIGH">Alta</SelectItem>
                                        <SelectItem value="URGENT">Urgente</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Data de Entrega</Label>
                                <Input
                                    type="date"
                                    value={newTaskDueDate}
                                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                                />
                            </div>
                        </div>
                        {members.length > 0 && (
                            <div className="space-y-1.5">
                                <Label>Responsáveis</Label>
                                <div className="flex flex-wrap gap-2">
                                    {members.map(m => (
                                        <button
                                            key={m.userId}
                                            type="button"
                                            onClick={() => toggleAssignee(m.userId)}
                                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors ${
                                                newTaskAssignees.includes(m.userId)
                                                    ? 'bg-blue-600 text-white border-blue-600'
                                                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                                            }`}
                                        >
                                            {m.user.firstName} {m.user.lastName}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button variant="ghost" type="button" onClick={() => setIsNewTaskOpen(false)}>Cancelar</Button>
                            <Button type="submit">Criar Tarefa</Button>
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
                      <span className={`w-2 h-2 rounded-full ${col.color}`} />
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