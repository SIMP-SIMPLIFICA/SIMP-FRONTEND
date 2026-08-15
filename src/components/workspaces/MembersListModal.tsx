import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Trash2, Shield, LogOut } from "lucide-react";
import { workspaceService } from "@/lib/api/workspaces";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

interface Member {
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  user: {
    id: string;
    firstName: string | null;
    email: string;
    avatar: string | null;
    lastName?: string | null; 
  }
}

interface MembersListModalProps {
  workspaceId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  members: any[];
  currentUserId?: string;
}

export function MembersListModal({ workspaceId, members, currentUserId }: MembersListModalProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleRemoveOrLeave = async (userId: string, isLeaving: boolean) => {
    const message = isLeaving 
        ? "Tem certeza que deseja SAIR deste workspace?" 
        : "Tem certeza que deseja remover este usuário?";

    if (!confirm(message)) return;

    try {
      await workspaceService.removeMember(workspaceId, userId);
      
      if (isLeaving) {
          setOpen(false);
          navigate("/workspaces");
      } else {
          queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId] });
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      alert(error.response?.data?.message || "Erro ao realizar a ação.");
    }
  };

  // Lógica de Permissões
  const myMembership = members.find((m: Member) => m.userId === currentUserId);
  const myRole = myMembership?.role;
  const canManage = myRole === 'OWNER' || myRole === 'ADMIN';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary">
          <Users size={16} />
          {members.length} Membros
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Membros do Workspace</DialogTitle>
          {/* Debug Visual: Se aparecer 'ID: undefined', o problema está no WorkspaceDetailPage */}
          <div className="text-[10px] text-gray-400">
             Seu ID: {currentUserId || "Carregando..."} | Role: {myRole || "Visitante"}
          </div>
        </DialogHeader>
        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
          {members.map((member: Member) => {
            const isMe = member.userId === currentUserId;
            const isTargetOwner = member.role === 'OWNER';

            // Regra: Admin/Dono pode remover qualquer um (exceto Dono e ele mesmo)
            const showTrashBtn = canManage && !isMe && !isTargetOwner;
            // Regra: Qualquer um pode sair (exceto Dono)
            const showLeaveBtn = isMe && !isTargetOwner;

            return (
                <div key={member.userId} className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-3">
                    <Avatar>
                    <AvatarImage src={member.user.avatar || undefined} />
                    <AvatarFallback>{member.user.firstName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                    <p className="text-sm font-medium">
                        {member.user.firstName} {isMe && <span className="text-xs text-blue-600 font-normal">(Você)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{member.user.email}</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    {/* CORREÇÃO AQUI: Span em volta dos ícones para aceitar title */}
                    {member.role === 'OWNER' && (
                        <span title="Dono">
                            <Shield size={14} className="text-amber-500" />
                        </span>
                    )}
                    {member.role === 'ADMIN' && (
                        <span title="Admin">
                            <Shield size={14} className="text-blue-500" />
                        </span>
                    )}
                    
                    {showTrashBtn && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-gray-400 hover:text-red-600"
                            onClick={() => handleRemoveOrLeave(member.userId, false)}
                            title="Remover usuário"
                        >
                            <Trash2 size={14} />
                        </Button>
                    )}

                    {showLeaveBtn && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-xs border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => handleRemoveOrLeave(member.userId, true)}
                        >
                            <LogOut size={12} className="mr-1" /> Sair
                        </Button>
                    )}
                </div>
                </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}