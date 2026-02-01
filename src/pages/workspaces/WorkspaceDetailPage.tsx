import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { workspaceService } from "@/lib/api/workspaces";
import { useWorkspaceTasks, useCreateTask } from "@/hooks/useTasks";
import { TaskCard } from "@/components/workspaces/TaskCard";
import { TaskModal } from "@/components/workspaces/TaskModal";
import { InviteMemberModal } from "@/components/workspaces/InviteMemberModal"; // <--- NOVO IMPORT
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Layout, Trash2 } from "lucide-react";
import { type TaskStatus, type Task } from "@/types/task";
import { useState } from "react";
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
  const navigate = useNavigate(); // Hook para redirecionar após deletar
  
  // Queries
  const { data: workspace } = useQuery({
    queryKey: ["workspace", id],
    queryFn: () => workspaceService.getById(id!),
    enabled: !!id,
  });

  const { data: tasks, isLoading } = useWorkspaceTasks(id);
  const { mutateAsync: createTask } = useCreateTask(id!);

  // Modal de Criação de Tarefa
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  // Modal de Detalhes da Tarefa
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    await createTask({ title: newTaskTitle, status: 'TODO', priority: 'MEDIUM' });
    setNewTaskTitle("");
    setIsNewTaskOpen(false);
  };

  // Função para deletar o workspace
  const handleDeleteWorkspace = async () => {
    if (!id) return;
    
    const confirmDelete = window.confirm(
      "Are you sure? This will delete the workspace and ALL tasks inside it. This action cannot be undone."
    );

    if (confirmDelete) {
      try {
        await workspaceService.deleteWorkspace(id);
        navigate("/workspaces"); // Volta para a lista
      } catch (error) {
        alert("Error deleting workspace. You might not have permission.");
        console.error(error);
      }
    }
  };

  if (!workspace || isLoading) return <div className="p-8">Loading board...</div>;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <header className="px-6 py-4 border-b bg-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
            <Layout className="h-5 w-5 text-gray-500" />
            <h1 className="text-xl font-bold">{workspace.name}</h1>
            {/* Opcional: Mostrar contagem de membros */}
            <Badge variant="outline" className="ml-2 font-normal">
                {workspace._count?.members || 1} members
            </Badge>
        </div>
        
        <div className="flex items-center gap-3">
            {/* BOTÃO EXCLUIR */}
            <Button 
                variant="ghost" 
                size="icon" 
                className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                onClick={handleDeleteWorkspace}
                title="Delete Workspace"
            >
                <Trash2 size={18} />
            </Button>

            {/* BOTÃO CONVIDAR (MODAL) */}
            <InviteMemberModal workspaceId={id!} />

            {/* BOTÃO NOVA TAREFA */}
            <Dialog open={isNewTaskOpen} onOpenChange={setIsNewTaskOpen}>
                <DialogTrigger asChild>
                    <Button size="sm"><Plus className="w-4 h-4 mr-2"/> New Task</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Task</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateTask} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Task Title</Label>
                            <Input 
                                value={newTaskTitle} 
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                placeholder="Ex: Update documentation"
                                autoFocus
                            />
                        </div>
                        <DialogFooter>
                            <Button type="submit">Create</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
      </header>

      {/* Kanban Board Area */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden bg-gray-50/50 p-6">
        <div className="flex h-full gap-6 min-w-max">
          {COLUMNS.map((col) => {
            const colTasks = tasks?.filter((t) => t.status === col.id) || [];
            
            return (
              <div key={col.id} className="w-80 flex flex-col h-full bg-gray-100/50 rounded-lg border border-gray-200">
                {/* Col Header */}
                <div className="p-3 font-semibold text-sm flex justify-between items-center border-b bg-gray-50 rounded-t-lg">
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.id === 'DONE' ? 'bg-green-500' : 'bg-blue-500'}`} />
                    {col.label}
                  </span>
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{colTasks.length}</Badge>
                </div>

                {/* Col Tasks (Scrollable) */}
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
                        No tasks
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL DE DETALHES DA TAREFA */}
      <TaskModal 
        isOpen={!!selectedTaskId}
        taskId={selectedTaskId}
        workspaceId={id!} // Passando o ID do workspace para atualizar o cache
        onClose={() => setSelectedTaskId(null)}
      />
    </div>
  );
}