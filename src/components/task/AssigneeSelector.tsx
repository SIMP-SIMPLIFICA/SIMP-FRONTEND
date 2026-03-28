import { useState } from 'react';
import { taskService } from '@/lib/api/tasks';
import { X, Plus, User as UserIcon, Loader2 } from 'lucide-react'; 

interface User {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  avatar: string | null;
}

interface Member {
    userId: string;
    role: string;
    user: User;
}

interface Assignee {
  userId: string;
  user: User;
}

interface AssigneeSelectorProps {
  taskId: string;
  currentAssignees: Assignee[];
  onUpdate: () => void;
  members: Member[];
}

export function AssigneeSelector({ taskId, currentAssignees, onUpdate, members }: AssigneeSelectorProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAdd = async (userId: string) => {
    if (!userId) return;
    try {
      setLoading(true);
      await taskService.addAssignee(taskId, userId);
      setIsSelecting(false);
      onUpdate(); 
    } catch (error: unknown) {
      const msg = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      alert(msg || "Erro ao adicionar membro");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm("Remover membro?")) return;
    try {
      setLoading(true);
      await taskService.removeAssignee(taskId, userId);
      onUpdate();
    } catch {
      alert("Erro ao remover membro");
    } finally {
      setLoading(false);
    }
  };

  const availableUsers = members.map(m => m.user);

  const usersToAdd = availableUsers.filter(
    (u) => !currentAssignees.some((assigned) => assigned.user.id === u.id)
  );

  return (
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
              onClick={() => handleRemove(assignee.userId)}
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
                <select
                autoFocus
                className="text-xs border border-gray-300 rounded-md p-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white max-w-[150px]"
                onChange={(e) => handleAdd(e.target.value)}
                defaultValue=""
                onBlur={() => setIsSelecting(false)}
                >
                <option value="" disabled>Selecione...</option>
                
                {usersToAdd.map((user) => (
                    <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                    </option>
                ))}

                {usersToAdd.length === 0 && availableUsers.length > 0 && (
                    <option disabled>Todos já adicionados</option>
                )}
                {availableUsers.length === 0 && (
                    <option disabled>Nenhum membro no workspace</option>
                )}
                </select>
            )}
            
            <button onClick={() => setIsSelecting(false)} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
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