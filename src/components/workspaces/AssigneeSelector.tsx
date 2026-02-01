import { useState, useEffect } from 'react';
import { taskService } from '@/lib/api/tasks';
import { X, Plus, User as UserIcon } from 'lucide-react'; 

// Interface local agora corresponde exatamente ao UserSummary global
interface User {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  avatar: string | null;
}

// Interface local correspondendo ao TaskAssignee
interface Assignee {
  userId: string;
  user: User;
}

interface AssigneeSelectorProps {
  taskId: string;
  currentAssignees: Assignee[]; // Agora o TS aceitará o TaskAssignee[] aqui
  onUpdate: () => void;
}

export function AssigneeSelector({ taskId, currentAssignees, onUpdate }: AssigneeSelectorProps) {
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const users = await taskService.getAssignableUsers();
      // O endpoint getAssignableUsers também deve retornar User[] com esses campos
      setAvailableUsers(users);
    } catch (error) {
      console.error("Erro ao carregar usuários", error);
    }
  };

  const handleAdd = async (userId: string) => {
    if (!userId) return;
    try {
      setLoading(true);
      await taskService.addAssignee(taskId, userId);
      setIsSelecting(false);
      onUpdate(); 
    } catch (error) {
      alert("Erro ao adicionar membro");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm("Remover este membro da tarefa?")) return;
    try {
      setLoading(true);
      await taskService.removeAssignee(taskId, userId);
      onUpdate();
    } catch (error) {
      alert("Erro ao remover membro");
    } finally {
      setLoading(false);
    }
  };

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
            {assignee.user.avatar ? (
              <img src={assignee.user.avatar} alt="Avatar" className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <div className="bg-gray-100 rounded-full p-1">
                <UserIcon size={12} className="text-gray-500" />
              </div>
            )}
            
            <span>{assignee.user.firstName || assignee.user.email}</span>
            
            <button 
              onClick={() => handleRemove(assignee.userId)}
              disabled={loading}
              className="text-gray-400 hover:text-red-600 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remover membro"
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
            <select
              autoFocus
              className="text-xs border border-gray-300 rounded-md p-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white h-7"
              onChange={(e) => handleAdd(e.target.value)}
              defaultValue=""
              disabled={loading}
            >
              <option value="" disabled>Selecione...</option>
              {usersToAdd.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} ({user.email})
                </option>
              ))}
              {usersToAdd.length === 0 && <option disabled>Todos já adicionados</option>}
            </select>
            
            <button 
              onClick={() => setIsSelecting(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}