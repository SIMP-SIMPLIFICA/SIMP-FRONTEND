import { useState, useEffect } from 'react';
import { taskService } from '../../lib/api/tasks';
import { X, Plus, User as UserIcon } from 'lucide-react'; // Assumindo que você usa lucide-react, se não, use ícones normais ou texto

// Tipagem baseada no retorno do seu Controller e Schema
interface User {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  avatar: string | null;
}

interface Assignee {
  userId: string;
  user: User;
}

interface AssigneeSelectorProps {
  taskId: string;
  currentAssignees: Assignee[]; // A lista atual que vem da Task
  onUpdate: () => void; // Função para recarregar a tarefa pai após mudanças
}

export function AssigneeSelector({ taskId, currentAssignees, onUpdate }: AssigneeSelectorProps) {
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [loading, setLoading] = useState(false);

  // Carrega todos os usuários do sistema ao abrir o componente
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const users = await taskService.getAssignableUsers();
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
      onUpdate(); // Atualiza a tela principal
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

  // Filtra usuários que JÁ estão na tarefa para não mostrar na lista de adição
  const usersToAdd = availableUsers.filter(
    (u) => !currentAssignees.some((assigned) => assigned.user.id === u.id)
  );

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-gray-700">Responsáveis</h3>
      
      <div className="flex flex-wrap gap-2 items-center">
        {/* Lista de Membros Atuais */}
        {currentAssignees.map((assignee) => (
          <div 
            key={assignee.userId} 
            className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm border border-blue-100"
          >
            {/* Avatar ou Inicial */}
            {assignee.user.avatar ? (
              <img src={assignee.user.avatar} alt="Avatar" className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <UserIcon size={14} />
            )}
            
            <span>{assignee.user.firstName || assignee.user.email}</span>
            
            <button 
              onClick={() => handleRemove(assignee.userId)}
              disabled={loading}
              className="hover:text-red-600 ml-1 transition-colors"
              title="Remover membro"
            >
              <X size={14} />
            </button>
          </div>
        ))}

        {/* Botão de Adicionar / Select */}
        {!isSelecting ? (
          <button
            onClick={() => setIsSelecting(true)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 border border-dashed border-gray-300 rounded-full px-3 py-1 hover:border-blue-400 transition-all"
          >
            <Plus size={14} />
            <span>Adicionar</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
            <select
              autoFocus
              className="text-sm border border-gray-300 rounded-md p-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}