import { useEffect, useState } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

// Tipos necessários
type UserRoleRef = {
  id: string;
  name: string;
  displayName: string;
};

type ApiUser = {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  roles: { role: UserRoleRef }[];
};

type CreateUserBody = {
  email: string;
  username: string;
  password?: string;
  firstName: string;
  lastName: string;
  roles?: string[]; // IDs das roles
  isActive?: boolean;
};

type UpdateUserBody = {
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
};

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: ApiUser | null; // Se null, é modo CRIAÇÃO. Se preenchido, é EDIÇÃO.
  onSuccess: () => void;
}

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: UserFormDialogProps) {
  const isEditing = !!user;

  // Estados do Formulário
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());

  // Estados de UI
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Roles disponíveis para seleção (apenas na criação)
  const [availableRoles, setAvailableRoles] = useState<UserRoleRef[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  // Carregar dados quando abrir ou mudar o user
  useEffect(() => {
    if (open) {
      if (user) {
        // Modo Edição
        setFirstName(user.firstName || "");
        setLastName(user.lastName || "");
        setUsername(user.username || "");
        setEmail(user.email || "");
        setIsActive(user.isActive);
        setPassword("");
        setSelectedRoles(new Set(user.roles.map((r) => r.role.id)));
        void fetchRoles();
      } else {
        // Modo Criação
        setFirstName("");
        setLastName("");
        setUsername("");
        setEmail("");
        setPassword("");
        setIsActive(true);
        setSelectedRoles(new Set());
        void fetchRoles();
      }
    }
  }, [open, user]);

  async function fetchRoles() {
    try {
      setLoadingRoles(true);
      const res = await apiRequest<{ data: UserRoleRef[] }>("/api/v1/roles?limit=100");
      setAvailableRoles(res.data);
    } catch (error) {
      console.error("Erro ao carregar roles", error);
    } finally {
      setLoadingRoles(false);
    }
  }

  function toggleRole(roleId: string) {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email || !username || !firstName) {
      toast({ title: "Campos obrigatórios", description: "Preencha nome, usuário e e-mail.", variant: "destructive" });
      return;
    }

    // VALIDAÇÃO DE USERNAME (apenas na criação ou se o username foi alterado)
    const originalUsername = user?.username || "";
    if (username !== originalUsername) {
      const usernameRegex = /^[a-zA-Z0-9_-]+$/;
      if (!usernameRegex.test(username)) {
        toast({
          title: "Nome de usuário inválido",
          description: "Use apenas letras, números, underline (_) ou hífen (-). Não use pontos ou espaços.",
          variant: "destructive"
        });
        return;
      }
    }

    if (!isEditing && !password) {
      toast({ title: "Senha obrigatória", description: "Defina uma senha inicial.", variant: "destructive" });
      return;
    }

    try {
      setSubmitting(true);

      if (isEditing && user) {
        // --- ATUALIZAR ---
        const body: UpdateUserBody = { firstName, lastName, username, email, isActive };
        await apiRequest(`/api/v1/users/${user.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });

        // Diff de roles
        const previousIds = new Set(user.roles.map((r) => r.role.id));
        const toAdd = [...selectedRoles].filter((id) => !previousIds.has(id));
        const toRemove = [...previousIds].filter((id) => !selectedRoles.has(id));

        if (toAdd.length > 0) {
          await apiRequest(`/api/v1/users/${user.id}/roles`, {
            method: "POST",
            body: JSON.stringify({ roleIds: toAdd }),
          });
        }
        if (toRemove.length > 0) {
          await apiRequest(`/api/v1/users/${user.id}/roles`, {
            method: "DELETE",
            body: JSON.stringify({ roleIds: toRemove }),
          });
        }

        toast({ title: "Usuário atualizado", description: "Dados e perfis alterados com sucesso." });
      } else {
        // --- CRIAR ---
        const body: CreateUserBody = {
          firstName,
          lastName,
          username,
          email,
          password,
          isActive,
          roles: Array.from(selectedRoles),
        };

        await apiRequest("/api/v1/users", {
          method: "POST",
          body: JSON.stringify(body),
        });

        toast({ title: "Usuário criado", description: "Novo acesso liberado." });
      }

      onSuccess();
      onOpenChange(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast({
        title: "Erro na operação",
        description: err.message || "Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações cadastrais."
              : "Preencha os dados para criar um novo acesso."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Nome Completo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="João"
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label>Sobrenome</Label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Silva"
                disabled={submitting}
              />
            </div>
          </div>

          {/* Credenciais */}
          <div className="space-y-2">
            <Label>E-mail Institucional</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="joao.silva@prefeitura.gov.br"
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label>Nome de Usuário (Login)</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="joao_silva" // Placeholder ajustado para o formato correto
              disabled={submitting}
            />
            <p className="text-[10px] text-slate-500">
              Apenas letras, números, _ e -. Sem pontos.
            </p>
          </div>

          {/* Senha (apenas na criação) */}
          {!isEditing && (
            <div className="space-y-2">
              <Label>Senha Inicial</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={submitting}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Status */}
          <div className="flex items-center space-x-2 py-2">
            <Checkbox
              id="isActive"
              checked={isActive}
              onCheckedChange={(c) => setIsActive(c === true)}
              disabled={submitting}
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Usuário Ativo?
            </Label>
          </div>

          {/* Seleção de Roles */}
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Perfis de Acesso (Roles)</Label>
              {loadingRoles && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto border rounded-lg p-2 bg-slate-50">
              {availableRoles.map((role) => (
                <div key={role.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`role-${role.id}`}
                    checked={selectedRoles.has(role.id)}
                    onCheckedChange={() => toggleRole(role.id)}
                    disabled={submitting}
                  />
                  <label
                    htmlFor={`role-${role.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 truncate"
                    title={role.displayName}
                  >
                    {role.displayName}
                  </label>
                </div>
              ))}
              {!loadingRoles && availableRoles.length === 0 && (
                <div className="text-xs text-slate-500 col-span-2 text-center py-2">
                  Nenhuma role disponível.
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting} className="bg-[#0A5BC4] hover:bg-[#094FA8]">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Salvar Alterações" : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}