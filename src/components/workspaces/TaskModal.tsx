import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTaskDetails, useTaskNotes, useUpdateTask, useDeleteTask, useAttachments } from "@/hooks/useTasks";
import { taskService } from "@/lib/api/tasks";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Checklist } from "./Checklist";
import { 
  Calendar as CalendarIcon, 
  AlignLeft, 
  MessageSquare, 
  Trash2, 
  CheckCircle, 
  UploadCloud, 
  FileIcon,
  ExternalLink,
  Plus,
  X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TaskModalProps {
  taskId: string | null;
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  userRole?: string; // Prop recebido do WorkspaceDetailPage
}

const API_URL = "http://localhost:3000"; 

export function TaskModal({ taskId, isOpen, onClose, workspaceId, userRole }: TaskModalProps) {
  const queryClient = useQueryClient();
  const { data: task, isLoading } = useTaskDetails(taskId);
  const { mutate: addNote } = useTaskNotes(taskId || "");
  const { mutate: updateTask } = useUpdateTask(workspaceId);
  const { mutateAsync: deleteTask } = useDeleteTask(workspaceId);
  const { upload, remove: removeAttachment } = useAttachments(taskId || "");
  
  // --- PERMISSÕES ---
  const isViewer = userRole === 'VIEWER';
  const canEdit = !isViewer; // Owner, Admin e Member podem editar
  const canDeleteTask = userRole === 'OWNER' || userRole === 'ADMIN';

  // --- LÓGICA DE ASSIGNEES ---
  const { data: assignableUsers } = useQuery({
    queryKey: ['assignableUsers', workspaceId],
    queryFn: () => taskService.getAssignableUsers(workspaceId),
    enabled: isOpen && !!workspaceId
  });

  const addAssignee = useMutation({
    mutationFn: (userId: string) => taskService.addAssignee(taskId!, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['task', taskId] })
  });

  const removeAssignee = useMutation({
    mutationFn: (userId: string) => taskService.removeAssignee(taskId!, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['task', taskId] })
  });

  const [noteText, setNoteText] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (task) {
      setDescription(task.description || "");
    }
  }, [task]);

  const handleSaveDescription = () => {
    if (task && description !== task.description) {
      updateTask({ id: task.id, description });
    }
  };

  const handleStatusChange = (newStatus: string) => {
     if (!task) return;
     updateTask({ id: task.id, status: newStatus as any });
  };

  const handlePriorityChange = (newPriority: string) => {
     if (!task) return;
     updateTask({ id: task.id, priority: newPriority as any });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     if (!task) return;
     const date = new Date(e.target.value + "T12:00:00");
     updateTask({ id: task.id, dueDate: date.toISOString() });
  };

  const handleDelete = async () => {
    if(confirm("Tem certeza que deseja excluir esta tarefa?")) {
        if (taskId) {
            await deleteTask(taskId);
            onClose();
        }
    }
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    addNote(noteText);
    setNoteText("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && taskId) {
        upload.mutate(file);
        e.target.value = ""; 
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        {isLoading || !task ? (
          <div className="p-8 flex justify-center items-center h-full">Carregando...</div>
        ) : (
          <>
            {/* --- HEADER --- */}
            <div className="px-6 py-4 border-b bg-background z-10 flex justify-between items-start">
              <div className="space-y-1">
                 <div className="flex gap-2 mb-2">
                    <Select defaultValue={task.priority} onValueChange={handlePriorityChange} disabled={!canEdit}>
                        <SelectTrigger className="w-[100px] h-6 text-xs border-none bg-secondary/50">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="LOW">Baixa</SelectItem>
                            <SelectItem value="MEDIUM">Média</SelectItem>
                            <SelectItem value="HIGH">Alta</SelectItem>
                            <SelectItem value="URGENT">Urgente</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select defaultValue={task.status} onValueChange={handleStatusChange} disabled={!canEdit}>
                         <SelectTrigger className="w-[120px] h-6 text-xs border-none bg-blue-100 text-blue-700 font-bold">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="TODO">A Fazer</SelectItem>
                            <SelectItem value="IN_PROGRESS">Em Progresso</SelectItem>
                            <SelectItem value="IN_REVIEW">Revisão</SelectItem>
                            <SelectItem value="DONE">Concluído</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
                 <DialogTitle className="text-xl font-bold">{task.title}</DialogTitle>
                 <DialogDescription>
                    #{task.code} • Criado em {format(new Date(task.createdAt), "dd 'de' MMMM", { locale: ptBR })} 
                    {task.creator ? ` por ${task.creator.firstName}` : ''}
                 </DialogDescription>
              </div>
              
              <div className="flex gap-2">
                 {/* Concluir */}
                 {canEdit && task.status !== 'DONE' && (
                    <Button variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => handleStatusChange('DONE')}>
                        <CheckCircle className="w-4 h-4 mr-2" /> Concluir
                    </Button>
                 )}
                 {/* Excluir (Só Admin/Owner) */}
                 {canDeleteTask && (
                     <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={handleDelete}>
                        <Trash2 className="w-4 h-4" />
                     </Button>
                 )}
              </div>
            </div>

            {/* --- CORPO --- */}
            <div className="flex-1 flex overflow-hidden">
               
               {/* ESQUERDA: Conteúdo Principal */}
               <div className="flex-1 flex flex-col border-r h-full bg-white">
                 <Tabs defaultValue="overview" className="flex-1 flex flex-col h-full">
                    <div className="px-6 pt-4 border-b">
                        <TabsList className="bg-transparent p-0 gap-6">
                            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                            <TabsTrigger value="checklist">Checklist</TabsTrigger>
                            <TabsTrigger value="attachments">Anexos ({task.attachments?.length || 0})</TabsTrigger>
                            <TabsTrigger value="history">Histórico</TabsTrigger>
                        </TabsList>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                        {/* Aba Visão Geral */}
                        <TabsContent value="overview" className="mt-0 space-y-8">
                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold flex items-center gap-2 text-gray-700">
                                    <AlignLeft className="w-4 h-4" /> Descrição
                                </h3>
                                <Textarea
                                    className="min-h-[120px] resize-none focus:bg-white transition-colors"
                                    placeholder={canEdit ? "Adicione uma descrição..." : "Sem descrição."}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    onBlur={handleSaveDescription} 
                                    readOnly={!canEdit}
                                />
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold flex items-center gap-2 text-gray-700">
                                    <MessageSquare className="w-4 h-4" /> Comentários
                                </h3>
                                <div className="space-y-4">
                                    {task.notes?.map(note => (
                                        <div key={note.id} className="flex gap-3 text-sm">
                                            <Avatar className="w-8 h-8">
                                                <AvatarImage src={note.author.avatar || undefined} />
                                                <AvatarFallback>{note.author.firstName?.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold">{note.author.firstName}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {format(new Date(note.createdAt), "dd/MM/yyyy HH:mm")}
                                                    </span>
                                                </div>
                                                <p className="text-gray-700 mt-1">{note.content}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {task.notes?.length === 0 && <p className="text-sm text-muted-foreground italic">Nenhum comentário.</p>}
                                </div>
                                
                                {canEdit && (
                                    <form onSubmit={handleAddNote} className="flex gap-2 items-start mt-4 pt-4 border-t">
                                        <div className="flex-1 gap-2 flex flex-col">
                                            <Input 
                                                value={noteText}
                                                onChange={(e) => setNoteText(e.target.value)}
                                                placeholder="Escreva um comentário..." 
                                            />
                                            <Button type="submit" size="sm" className="self-end mt-2">Comentar</Button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </TabsContent>

                        {/* Aba Checklist */}
                        <TabsContent value="checklist" className="mt-0">
                            <div className={!canEdit ? "pointer-events-none opacity-60" : ""}>
                                <Checklist taskId={task.id} items={task.checklist || []} />
                            </div>
                        </TabsContent>

                        {/* Aba Anexos */}
                        <TabsContent value="attachments" className="mt-0">
                             {canEdit && (
                                 <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors relative cursor-pointer group">
                                    <input 
                                        type="file" 
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        onChange={handleFileUpload}
                                        disabled={upload.isPending}
                                    />
                                    <div className="flex flex-col items-center gap-2 group-hover:scale-105 transition-transform">
                                        <UploadCloud className="w-8 h-8 text-blue-500" />
                                        <p className="text-sm font-medium text-gray-700">
                                            {upload.isPending ? "Enviando arquivo..." : "Clique para selecionar um arquivo"}
                                        </p>
                                    </div>
                                 </div>
                             )}

                             <div className="mt-6 space-y-3">
                                {task.attachments?.map((file) => (
                                    <div key={file.id} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-8 h-8 bg-blue-50 rounded flex items-center justify-center text-blue-600 shrink-0">
                                                <FileIcon className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-700 truncate">{file.fileName}</p>
                                                <a 
                                                    href={`${API_URL}/uploads/${file.fileName}`}
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-[10px] text-blue-500 hover:underline flex items-center gap-1"
                                                >
                                                    Visualizar <ExternalLink className="w-3 h-3"/>
                                                </a>
                                            </div>
                                        </div>
                                        {/* AQUI ESTAVA O PROBLEMA: Botão de remover precisa de canEdit */}
                                        {canEdit && (
                                            <Button variant="ghost" size="icon" onClick={() => removeAttachment.mutate(file.id)}>
                                                <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                             </div>
                        </TabsContent>

                        {/* Aba Histórico */}
                        <TabsContent value="history" className="mt-0">
                             <div className="space-y-6 relative pl-4 border-l-2 border-gray-100 ml-2 py-2">
                                {task.history?.map((log, idx) => (
                                    <div key={idx} className="relative">
                                        <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-white border-2 border-blue-500" />
                                        <div className="text-sm">
                                            <span className="font-semibold text-gray-800 mr-1">
                                                {log.user?.firstName || 'Sistema'}
                                            </span> 
                                            <span className="text-gray-600">
                                                {log.action}
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-wide">
                                            {format(new Date(log.createdAt), "dd MMM 'às' HH:mm", { locale: ptBR })}
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </TabsContent>
                    </div>
                 </Tabs>
               </div>

               {/* DIREITA: Sidebar */}
               <div className="w-72 bg-gray-50 p-6 border-l overflow-y-auto shrink-0 space-y-6">
                  {/* Responsáveis */}
                  <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Responsáveis</h4>
                        
                        {canEdit && (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full bg-gray-200 hover:bg-gray-300">
                                        <Plus className="w-3 h-3" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-48 p-2" align="end">
                                    <p className="text-xs font-semibold mb-2 text-muted-foreground">Atribuir a:</p>
                                    <div className="space-y-1">
                                        {assignableUsers?.map(user => (
                                            <button 
                                                key={user.id}
                                                className="w-full flex items-center gap-2 p-1.5 hover:bg-gray-100 rounded text-sm text-left"
                                                onClick={() => addAssignee.mutate(user.id)}
                                            >
                                                <Avatar className="w-5 h-5">
                                                    <AvatarImage src={user.avatar} />
                                                    <AvatarFallback>{user.firstName.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <span className="truncate">{user.firstName}</span>
                                            </button>
                                        ))}
                                        {assignableUsers?.length === 0 && <span className="text-xs text-muted-foreground">Sem membros disponíveis.</span>}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                          {task.assignees?.map(assignee => (
                             <div key={assignee.userId} className="flex items-center gap-2 bg-white px-2 py-1 rounded border shadow-sm text-xs group">
                                <Avatar className="w-5 h-5">
                                    <AvatarImage src={assignee.user.avatar || undefined} />
                                    <AvatarFallback>{assignee.user.firstName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span>{assignee.user.firstName}</span>
                                {/* Botão de Remover Responsável - Se você é ADMIN ou OWNER, canEdit é true, então você pode ver o botão */}
                                {canEdit && (
                                    <button 
                                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 ml-1 transition-opacity"
                                        onClick={() => removeAssignee.mutate(assignee.userId)}
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                             </div>
                          ))}
                      </div>
                  </div>

                  {/* Datas */}
                  <div className="space-y-3">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Prazos</h4>
                      <div className="space-y-2">
                          <label className="text-xs text-gray-600 block">Data de Entrega</label>
                          <div className="relative">
                              <CalendarIcon className="w-4 h-4 absolute left-2 top-2.5 text-gray-400 pointer-events-none" />
                              <Input 
                                type="date" 
                                className="pl-8 h-9 text-xs" 
                                defaultValue={task.dueDate ? task.dueDate.split('T')[0] : ''}
                                onChange={handleDateChange}
                                disabled={!canEdit}
                              />
                          </div>
                      </div>
                  </div>
                  
                  <div className="pt-6 border-t text-xs text-gray-400">
                      <p>Criado em: {new Date(task.createdAt).toLocaleDateString()}</p>
                      <p>Atualizado: {new Date(task.updatedAt).toLocaleDateString()}</p>
                  </div>
               </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}