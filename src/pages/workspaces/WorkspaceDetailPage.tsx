import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workspaceService } from "@/lib/services/workspaces";
import { useWorkspaceTasks, useCreateTask } from "@/hooks/useTasks";
import { TaskCard } from "@/components/workspaces/TaskCard";
import { TaskModal } from "@/components/workspaces/TaskModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Layout, Users, LogOut, Trash2 } from "lucide-react";
import { type TaskStatus, type Task } from "@/types/task";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// CORREÇÃO: Import adicionado
import { useAuth } from "@/hooks/useAuth";

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: 'TODO', label: 'A Fazer' },
  { id: 'IN_PROGRESS', label: 'Em Progresso' },
  { id: 'IN_REVIEW', label: 'Revisão' },
  { id: 'DONE', label: 'Concluído' },
];

export default function WorkspaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Hook de autenticação (agora funcionando)
  const { user } = useAuth();

  // Queries
  const { data: workspace, isLoading: isLoadingWorkspace } = useQuery({
    queryKey: ["workspace", id],
    queryFn: () => workspaceService.getById(id!),
    enabled: !!id,
  });

  const { data: tasks, isLoading: isLoadingTasks } = useWorkspaceTasks(id);
  const { mutateAsync: createTask } = useCreateTask(id!);

  // --- CÁLCULO DE PERMISSÕES ---
  const myRole = workspace?.members?.find((m: any) => m.userId === user?.id)?.role;
  const isOwner = myRole === 'OWNER';
  const isAdmin = myRole === 'ADMIN';
  const isViewer = myRole === 'VIEWER';

  const canDeleteWorkspace = isOwner;
  const canManageMembers = isOwner || isAdmin;
  const canCreateTask = !isViewer;

  // Mutations
  const deleteWorkspace = useMutation({
    mutationFn: () => workspaceService.delete(id!),
    onSuccess: () => navigate("/workspaces"),
    onError: (error: any) => alert(error.message || "Erro ao excluir workspace")
  });

  const addMember = useMutation({
    mutationFn: ({ email, role }: { email: string, role: string }) =>
      workspaceService.addMember(id!, email, role as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace", id] });
      setNewMemberEmail("");
    },
    onError: (error: any) => alert("Erro: " + (error.message || "Falha ao adicionar membro"))
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) => workspaceService.removeMember(id!, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workspace", id] }),
    onError: (error: any) => alert("Erro: " + (error.message || "Falha ao remover membro"))
  });

  // Estados dos Modais
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);

  // Forms states
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("MEMBER");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    await createTask({ title: newTaskTitle, status: 'TODO', priority: 'MEDIUM' });
    setNewTaskTitle("");
    setIsNewTaskOpen(false);
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail) return;
    addMember.mutate({ email: newMemberEmail, role: newMemberRole });
  };

  const handleDeleteWorkspace = () => {
    if (confirm("TEM CERTEZA? Isso apagará permanentemente o workspace e TODAS as tarefas. Essa ação não pode ser desfeita.")) {
      deleteWorkspace.mutate();
    }
  };

  if (isLoadingWorkspace || isLoadingTasks || !workspace) {
    return <div className="p-8">Carregando quadro...</div>;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <header className="px-6 py-4 border-b bg-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <Layout className="h-5 w-5 text-gray-500" />
          <h1 className="text-xl font-bold">{workspace.name}</h1>
          <Badge variant="outline" className="ml-2">{workspace.members?.length} Membros</Badge>
          {myRole && <Badge className="ml-2 bg-blue-100 text-blue-800 hover:bg-blue-100">{myRole}</Badge>}
        </div>

        <div className="flex gap-2">
          {/* Botão de Excluir Workspace (SÓ OWNER) */}
          {canDeleteWorkspace && (
            <Button
              variant="destructive"
              size="icon"
              onClick={handleDeleteWorkspace}
              title="Excluir Workspace"
              disabled={deleteWorkspace.isPending}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}

          {/* Botão de Membros (SÓ ADMIN E OWNER) */}
          {canManageMembers && (
            <Dialog open={isMembersOpen} onOpenChange={setIsMembersOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Users className="w-4 h-4 mr-2" /> Membros
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Gerenciar Membros</DialogTitle>
                  <DialogDescription>Adicione ou remova membros deste workspace.</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleAddMember} className="flex gap-2 items-end mb-4 pt-2">
                  <div className="flex-1 space-y-1">
                    <Label>Email do usuário</Label>
                    <Input
                      value={newMemberEmail}
                      onChange={e => setNewMemberEmail(e.target.value)}
                      placeholder="joao@exemplo.com"
                    />
                  </div>
                  <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                    <SelectTrigger className="w-[110px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="MEMBER">Membro</SelectItem>
                      <SelectItem value="VIEWER">Visual.</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="submit" disabled={addMember.isPending}>
                    {addMember.isPending ? "..." : <Plus className="w-4 h-4" />}
                  </Button>
                </form>

                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-3">
                    {workspace.members?.map((member: any) => (
                      <div key={member.id} className="flex items-center justify-between p-2 border rounded hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.user.avatar} />
                            <AvatarFallback>{member.user.firstName?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{member.user.firstName}</p>
                            <p className="text-xs text-muted-foreground">{member.user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px]">{member.role}</Badge>

                          {/* Admin não remove Owner, mas pode remover outros */}
                          {/* Eu não posso remover a mim mesmo aqui (faço isso em Sair) */}
                          {member.role !== 'OWNER' && member.user.id !== user?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                if (confirm("Remover este membro?")) {
                                  removeMember.mutate(member.user.id);
                                }
                              }}
                            >
                              <LogOut className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          )}

          {/* Botão de Nova Tarefa (SÓ QUEM NÃO É VIEWER) */}
          {canCreateTask && (
            <Dialog open={isNewTaskOpen} onOpenChange={setIsNewTaskOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Nova Tarefa</Button>
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
          )}
        </div>
      </header>

      {/* Kanban Board Area */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden bg-gray-50/50 p-6">
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
      </div>

      <TaskModal
        isOpen={!!selectedTaskId}
        taskId={selectedTaskId}
        workspaceId={id!}
        userRole={myRole} // Passando role
        onClose={() => setSelectedTaskId(null)}
      />
    </div>
  );
}