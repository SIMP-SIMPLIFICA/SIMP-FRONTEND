import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { workspaceService } from "@/lib/api/workspaces";
import { useWorkspaceTasks, useCreateTask, useUpdateTask } from "@/hooks/useTasks";
import { TaskCard } from "@/components/workspaces/TaskCard";
import { TaskModal } from "@/components/workspaces/TaskModal";
import { InviteMemberModal } from "@/components/workspaces/InviteMemberModal";
import { MembersListModal } from "@/components/workspaces/MembersListModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Layout, Trash2, Loader2, LogOut, Calendar as CalendarIcon } from "lucide-react";
import { type TaskStatus, type TaskPriority, type Task } from "@/types/task";
import { type Workspace } from "@/types/workspace";
import { useState } from "react";
import { useMe } from "@/hooks/useMe";
import {
  DndContext,
  type DragEndEvent,
  useDroppable,
  useDraggable,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'TODO', label: 'A Fazer', color: 'bg-slate-400' },
  { id: 'IN_PROGRESS', label: 'Em Progresso', color: 'bg-blue-500' },
  { id: 'IN_REVIEW', label: 'Revisão', color: 'bg-amber-500' },
  { id: 'DONE', label: 'Concluído', color: 'bg-green-500' },
  { id: 'CANCELED', label: 'Cancelado', color: 'bg-red-400' },
];

function DatePickerField({ date, onChange }: {
  date: Date | undefined
  onChange: (d: Date | undefined) => void
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={`w-full justify-start text-left font-normal h-10 ${!date ? 'text-muted-foreground' : ''}`}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {date ? format(date, 'dd/MM/yyyy') : 'Selecionar data'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={onChange} locale={ptBR} initialFocus />
      </PopoverContent>
    </Popover>
  )
}

export default function WorkspaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: userData } = useMe();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentUserId = (userData as any)?.id || (userData as any)?.data?.id || (userData as any)?.user?.id;

  const { data: workspace, isLoading: isLoadingWorkspace } = useQuery<Workspace>({
    queryKey: ["workspace", id],
    queryFn: () => workspaceService.getById(id!),
    enabled: !!id,
  });

  const { data: tasks, isLoading: isLoadingTasks } = useWorkspaceTasks(id);
  const { mutateAsync: createTask } = useCreateTask(id!);
  const { mutateAsync: updateTask } = useUpdateTask(id!);

  // Nova tarefa
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>("MEDIUM");
  const [newTaskDueDate, setNewTaskDueDate] = useState<Date | undefined>(undefined);
  const [newTaskAssignees, setNewTaskAssignees] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // Confirm dialog
  const [confirm, setConfirm] = useState<{
    open: boolean; title: string; description: string; onConfirm: () => void
  }>({ open: false, title: '', description: '', onConfirm: () => {} });

  const askConfirm = (title: string, description: string, action: () => Promise<void>) => {
    setConfirm({
      open: true, title, description,
      onConfirm: () => { setConfirm(c => ({ ...c, open: false })); void action(); },
    });
  };

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;
    const task = tasks?.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;
    await updateTask({ id: taskId, status: newStatus });
  };

  const toggleAssignee = (userId: string) => {
    setNewTaskAssignees(prev =>
      prev.includes(userId) ? prev.filter(i => i !== userId) : [...prev, userId]
    );
  };

  const resetForm = () => {
    setNewTaskTitle(""); setNewTaskDescription(""); setNewTaskPriority("MEDIUM");
    setNewTaskDueDate(undefined); setNewTaskAssignees([]);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setCreating(true);
    try {
      await createTask({
        title: newTaskTitle.trim(),
        status: 'TODO',
        priority: newTaskPriority,
        description: newTaskDescription.trim() || undefined,
        dueDate: newTaskDueDate ? newTaskDueDate.toISOString() : undefined,
        assigneeIds: newTaskAssignees.length > 0 ? newTaskAssignees : undefined,
      });
      resetForm();
      setIsNewTaskOpen(false);
      toast({ title: 'Tarefa criada com sucesso' });
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message;
      toast({ title: 'Erro ao criar tarefa', description: msg, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!id) return;
    await workspaceService.deleteWorkspace(id);
    navigate("/workspaces");
  };

  const handleLeaveWorkspace = async () => {
    if (!id || !currentUserId) {
      toast({ title: 'Erro', description: 'Usuário não identificado. Tente recarregar a página.', variant: 'destructive' });
      return;
    }
    await workspaceService.removeMember(id, currentUserId);
    navigate("/workspaces");
  };

  if (isLoadingWorkspace || !workspace) return (
    <div className="p-8 flex items-center gap-2"><Loader2 className="animate-spin" /> Carregando board...</div>
  );

  const members = workspace.members || [];
  const currentMember = currentUserId ? members.find(m => m.userId === currentUserId) : null;
  const isOwner = currentMember?.role === 'OWNER';

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <header className="px-6 py-4 border-b bg-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <Layout className="h-5 w-5 text-gray-500" />
          <h1 className="text-xl font-bold">{workspace.name}</h1>
          <MembersListModal workspaceId={id!} members={members} currentUserId={currentUserId} />
        </div>

        <div className="flex items-center gap-3">
          {isOwner && (
            <Button
              variant="ghost" size="icon"
              className="text-gray-400 hover:text-red-600 hover:bg-red-50"
              title="Excluir Workspace"
              onClick={() => askConfirm(
                'Excluir workspace?',
                'Isso apagará o workspace e TODAS as tarefas. Não há como desfazer.',
                handleDeleteWorkspace,
              )}
            >
              <Trash2 size={18} />
            </Button>
          )}

          {!isOwner && currentMember && (
            <Button
              variant="ghost" size="icon"
              className="text-gray-400 hover:text-red-600 hover:bg-red-50"
              title="Sair do Workspace"
              onClick={() => askConfirm(
                'Sair do workspace?',
                'Você perderá acesso a este workspace.',
                handleLeaveWorkspace,
              )}
            >
              <LogOut size={18} />
            </Button>
          )}

          <InviteMemberModal workspaceId={id!} existingMemberIds={members.map((m: any) => m.userId)} />

          <Dialog open={isNewTaskOpen} onOpenChange={(v) => { if (!v) resetForm(); setIsNewTaskOpen(v); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Nova Tarefa</Button>
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
                    <DatePickerField date={newTaskDueDate} onChange={setNewTaskDueDate} />
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
                  <Button variant="ghost" type="button" onClick={() => { resetForm(); setIsNewTaskOpen(false); }}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Criar Tarefa
                  </Button>
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
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="flex h-full gap-6 min-w-max">
              {COLUMNS.map((col) => {
                const colTasks = tasks?.filter((t) => t.status === col.id) || [];
                return (
                  <KanbanColumn key={col.id} id={col.id} label={col.label} color={col.color} count={colTasks.length}>
                    {colTasks.map((task: Task) => (
                      <DraggableTaskCard key={task.id} task={task} onClick={(t) => setSelectedTaskId(t.id)} />
                    ))}
                  </KanbanColumn>
                );
              })}
            </div>
          </DndContext>
        )}
      </div>

      <TaskModal
        isOpen={!!selectedTaskId}
        taskId={selectedTaskId}
        workspaceId={id!}
        workspaceMembers={members}
        onClose={() => setSelectedTaskId(null)}
      />

      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        description={confirm.description}
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm(c => ({ ...c, open: false }))}
      />
    </div>
  );
}

function KanbanColumn({
  id, label, color, count, children,
}: {
  id: string; label: string; color: string; count: number; children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div className="w-80 flex flex-col h-full bg-gray-100/50 rounded-lg border border-gray-200">
      <div className="p-3 font-semibold text-sm flex justify-between items-center border-b bg-gray-50 rounded-t-lg">
        <span className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${color}`} />
          {label}
        </span>
        <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{count}</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar transition-colors ${isOver ? "bg-blue-50/60" : ""}`}
      >
        {children}
        {count === 0 && (
          <div className="text-center py-8 text-xs text-muted-foreground border-2 border-dashed border-gray-200 rounded-md">
            Sem tarefas
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableTaskCard({ task, onClick }: { task: Task; onClick: (task: Task) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      className="touch-none"
    >
      <TaskCard task={task} onClick={onClick} />
    </div>
  );
}
