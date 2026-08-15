import { useMe } from "@/hooks/useMe";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { NotificationBell } from "./NotificationBell";
import { isImpersonating, exitImpersonation } from "@/lib/impersonation";
import { ShieldAlert, LogOut, Menu } from "lucide-react";

// Interface local para garantir que o TS reconheça os campos
interface UserWithDetails {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string;
  email: string;
  roles?: { role?: { displayName?: string; name?: string } }[];
}

function initialsFromName(first?: string | null, last?: string | null, fallback?: string) {
  const a = (first?.trim()?.[0] ?? "").toUpperCase();
  const b = (last?.trim()?.[0] ?? "").toUpperCase();
  const init = `${a}${b}`.trim();
  if (init) return init;
  return (fallback?.trim()?.slice(0, 2) ?? "US").toUpperCase();
}

interface TopbarProps {
  title?: string;
  onMenuClick?: () => void;
}

export function Topbar({ title = "Dashboard", onMenuClick }: TopbarProps) {
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useMe(true);

  const impersonating = isImpersonating()
  const impersonatedOrg: { id: string; name: string } | null = (() => {
    try { return JSON.parse(sessionStorage.getItem("simp:impersonate:org") ?? "null") }
    catch { return null }
  })()

  // Forçamos a tipagem aqui para silenciar o erro do TypeScript
  const user = data?.user as unknown as UserWithDetails;

  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    user?.email ||
    "Usuário";

  const roleLabel =
    user?.roles?.[0]?.role?.displayName ||
    user?.roles?.[0]?.role?.name ||
    "Usuário";

  const initials = initialsFromName(user?.firstName, user?.lastName, user?.username || user?.email);

  return (
    <div>
      {/* Impersonation warning banner */}
      {impersonating && (
        <div className="flex items-center justify-between bg-amber-400 px-6 py-1.5 text-amber-950">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldAlert size={15} />
            Você está acessando como administrador
            {impersonatedOrg ? ` de "${impersonatedOrg.name}"` : " de outra organização"}.
          </div>
          <button
            onClick={() => exitImpersonation(queryClient, nav)}
            className="flex items-center gap-1.5 rounded-lg bg-amber-950/10 px-3 py-1 text-xs font-semibold hover:bg-amber-950/20 transition-colors"
          >
            <LogOut size={13} />
            Sair da Impersonação
          </button>
        </div>
      )}

    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-foreground hover:bg-secondary transition-colors lg:hidden"
          aria-label="Abrir menu de navegação"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="text-xl font-semibold text-foreground">{title}</div>
      </div>

      <div className="flex items-center gap-4">

        {/* Componente de Notificações em Tempo Real */}
        <NotificationBell />

        <button
          onClick={() => nav("/profile")}
          className="flex items-center gap-3 rounded-2xl px-2 py-1 hover:bg-secondary transition-colors"
          title="Ir para meu perfil"
        >
          <div className="text-right leading-tight">
            <div className="font-semibold text-foreground">{fullName}</div>
            <div className="text-sm text-muted-foreground">{roleLabel}</div>
          </div>
          <div className="grid h-11 w-11 place-items-center rounded-full bg-accent text-accent-foreground font-semibold">
            {initials}
          </div>
        </button>
      </div>
    </header>
    </div>
  );
}