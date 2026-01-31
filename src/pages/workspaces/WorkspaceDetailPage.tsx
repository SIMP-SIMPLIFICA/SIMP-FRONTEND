import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { workspaceService } from "@/lib/api/workspaces";
import { useWorkspaceTasks, useCreateTask } from "@/hooks/useTasks";
import { TaskCard } from "@/components/workspaces/TaskCard";
import { TaskModal } from "@/components/workspaces/TaskModal"; // <--- Importando o Modal
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Layout } from "lucide-react";
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

  // Modal de Detalhes da Tarefa (NOVO)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    await createTask({ title: newTaskTitle, status: 'TODO', priority: 'MEDIUM' });
    setNewTaskTitle("");
    setIsNewTaskOpen(false);
  };

  if (!workspace || isLoading) return <div className="p-8">Carregando quadro...</div>;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <header className="px-6 py-4 border-b bg-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
            <Layout className="h-5 w-5 text-gray-500" />
            <h1 className="text-xl font-bold">{workspace.name}</h1>
        </div>
        
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
                        onClick={(t) => setSelectedTaskId(t.id)} // Abrindo o modal aqui
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
      </div>

      {/* MODAL DE DETALHES DA TAREFA */}
      <TaskModal 
        isOpen={!!selectedTaskId}
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
      />
    </div>
  );
}