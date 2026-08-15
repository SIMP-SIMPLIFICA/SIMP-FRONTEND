import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { taskService } from '@/lib/api/tasks';
import { X, Plus, User as UserIcon, Loader2, ShieldOff } from 'lucide-react';
import { type WorkspaceMember } from '@/types/workspace';
import { type TaskAssignee } from '@/types/task';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/hooks/use-toast';

interface AssigneeSelectorProps {
  taskId: string;
  workspaceId: string;
  currentAssignees: TaskAssignee[];
  onUpdate: () => void;
  members: WorkspaceMember[];
}

export function AssigneeSelector({ taskId, workspaceId, currentAssignees, onUpdate, members }: AssigneeSelectorProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: assignableUsers = [] } = useQuery({
    queryKey: ['assignable-users', workspaceId],
    queryFn: () => taskService.getAssignableUsers(workspaceId),
    enabled: !!workspaceId,
    staleTime: 30_000,
  });

  const permissionMap = new Map(assignableUsers.map(u => [u.id, u.hasPermission]));

  const handleAdd = async (userId: string) => {
    if (!userId) return;
    setLoading(true);
    try {
      await taskService.addAssignee(taskId, userId);
      setIsSelecting(false);
      onUpdate();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Erro ao adicionar responsável.';
      toast({ title: 'Sem permissão', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userId: string) => {
    setLoading(true);
    try {
      await taskService.removeAssignee(taskId, userId);
      onUpdate();
    } finally {
      setLoading(false);
    }
  };

  const availableUsers = members.map(m => m.user);

  const usersToAdd = availableUsers.filter(
    (u) => !currentAssignees.some((assigned) => assigned.user.id === u.id)
  );

  return (
    <>
    <ConfirmDialog
      open={removeId !== null}
      title="Remover responsável?"
      description="O membro será removido desta tarefa."
      confirmLabel="Remover"
      onConfirm={() => { const id = removeId; setRemoveId(null); if (id) void handleRemove(id); }}
      onCancel={() => setRemoveId(null)}
    />
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Responsáveis</h3>

      <div className="flex flex-wrap gap-2 items-center">
        {currentAssignees.map((assignee) => (
          <div
            key={assignee.userId}
            className="flex items-center gap-2 bg-white px-2 py-1 rounded border shadow-sm text-xs group hover:border-red-200 transition-colors"
          >
            <AvatarSmall url={assignee.user.avatar} name={assignee.user.firstName} />
            <span>{assignee.user.firstName}</span>
            <button
              onClick={() => setRemoveId(assignee.userId)}
              disabled={loading}
              className="text-gray-400 hover:text-red-600 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {!isSelecting ? (
          <button
            onClick={() => setIsSelecting(true)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 border border-dashed border-gray-300 rounded-full px-3 py-1 hover:border-blue-400 transition-all"
          >
            <Plus size={12} />
            <span>Adicionar</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            ) : (
              <Select
                defaultOpen
                onValueChange={(userId) => {
                  if (permissionMap.get(userId) === false) return;
                  void handleAdd(userId);
                }}
              >
                <SelectTrigger className="h-8 text-xs w-48">
                  <SelectValue placeholder="Selecionar membro..." />
                </SelectTrigger>
                <SelectContent onPointerDownOutside={() => setIsSelecting(false)}>
                  {usersToAdd.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-400">
                      {availableUsers.length > 0 ? 'Todos já adicionados' : 'Nenhum membro no workspace'}
                    </div>
                  ) : (
                    usersToAdd.map(user => {
                      const hasPerm = permissionMap.get(user.id) !== false;
                      return (
                        <SelectItem
                          key={user.id}
                          value={user.id}
                          disabled={!hasPerm}
                          className={!hasPerm ? 'opacity-50 cursor-not-allowed' : ''}
                        >
                          <div className="flex flex-col">
                            <span className={!hasPerm ? 'text-slate-400' : ''}>
                              {user.firstName} {user.lastName}
                            </span>
                            {!hasPerm && (
                              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                <ShieldOff size={9} />
                                Sem permissão (Edite em Roles)
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            )}
            <button onClick={() => setIsSelecting(false)} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

function AvatarSmall({ url, name }: { url: string | null, name: string | null }) {
    if (url) return <img src={url} alt={name || "Avatar"} className="w-5 h-5 rounded-full object-cover" />;
    return (
        <div
            className="bg-gray-100 rounded-full p-0.5"
            title={name || "Sem nome"}
        >
            <UserIcon size={12} className="text-gray-500" />
        </div>
    );
}
