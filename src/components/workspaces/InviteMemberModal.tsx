import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useRef } from "react";
import { UserPlus, Loader2 } from "lucide-react";
import { workspaceService } from "@/lib/api/workspaces";
import { toast } from "@/hooks/use-toast";

interface OrgUser {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  avatar: string | null;
}

interface InviteMemberModalProps {
  workspaceId: string;
  existingMemberIds?: string[];
}

export function InviteMemberModal({ workspaceId, existingMemberIds = [] }: InviteMemberModalProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<OrgUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<OrgUser | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedUser) return;
    if (search.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await workspaceService.searchOrgUsers(search.trim());
        const filtered = results.filter((u) => !existingMemberIds.includes(u.id));
        setSuggestions(filtered);
        setShowDropdown(filtered.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [search, selectedUser]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (user: OrgUser) => {
    setSelectedUser(user);
    setSearch(`${user.firstName} ${user.lastName ?? ""} (${user.email})`);
    setShowDropdown(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = selectedUser?.email ?? search.trim();
    if (!email) return;

    try {
      setLoading(true);
      await workspaceService.inviteMember(workspaceId, email);
      toast({ title: "Membro adicionado com sucesso!" });
      setSearch("");
      setSelectedUser(null);
      setOpen(false);
    } catch (error: unknown) {
      const msg = (error as { message?: string })?.message ?? "Erro ao convidar usuário.";
      toast({ title: "Erro ao convidar", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setSearch("");
      setSelectedUser(null);
      setSuggestions([]);
      setShowDropdown(false);
    }
    setOpen(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <UserPlus size={16} />
          Convidar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar Membro</DialogTitle>
          <DialogDescription>
            Busque pelo nome ou e-mail do usuário que deseja adicionar a este workspace.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleInvite} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="member-search">Nome ou E-mail</Label>
            <div ref={containerRef} className="relative">
              <Input
                id="member-search"
                placeholder="Buscar por nome ou e-mail..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setSelectedUser(null); }}
                onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                autoComplete="off"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
              )}
              {showDropdown && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {suggestions.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex flex-col"
                      onMouseDown={() => handleSelect(user)}
                    >
                      <span className="font-medium">{user.firstName} {user.lastName}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !search.trim()}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adicionar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
