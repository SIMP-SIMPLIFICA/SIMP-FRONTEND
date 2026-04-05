import { useState } from 'react';
import { taskService } from '@/lib/api/tasks';
import { X, Plus, User as UserIcon, Loader2 } from 'lucide-react';
import { type WorkspaceMember } from '@/types/workspace';
import { type TaskAssignee } from '@/types/task';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface AssigneeSelectorProps {
  taskId: string;
  currentAssignees: TaskAssignee[];
  onUpdate: () => void;
  members: WorkspaceMember[];
}

export function AssigneeSelector({ taskId, currentAssignees, onUpdate, members }: AssigneeSelectorProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);

  const handleAdd = async (userId: string) => {
    if (!userId) return;
    setLoading(true);
    try {
      await taskService.addAssignee(taskId, userId);
      setIsSelecting(false);
      onUpdate();
    } catch {
      // silently ignore — task detail will not update
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
              <Select defaultOpen onValueChange={(userId) => void handleAdd(userId)}>
                <SelectTrigger className="h-8 text-xs w-44">
                  <SelectValue placeholder="Selecionar membro..." />
                </SelectTrigger>
                <SelectContent onPointerDownOutside={() => setIsSelecting(false)}>
                  {usersToAdd.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-400">
                      {availableUsers.length > 0 ? 'Todos já adicionados' : 'Nenhum membro no workspace'}
                    </div>
                  ) : (
                    usersToAdd.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.firstName} {user.lastName}
                      </SelectItem>
                    ))
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