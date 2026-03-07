import { useMe } from "@/hooks/useMe";
import { useNavigate } from "react-router-dom";
import { NotificationBell } from "./NotificationBell";
import { Menu } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/utils";

// Interface local para garantir que o TS reconheça os campos
interface UserWithDetails {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string;
  email: string;
  avatar?: string;
  roles?: { role?: { displayName?: string; name?: string } }[];
}

function initialsFromName(first?: string | null, last?: string | null, fallback?: string) {
  const a = (first?.trim()?.[0] ?? "").toUpperCase();
  const b = (last?.trim()?.[0] ?? "").toUpperCase();
  const init = `${a}${b}`.trim();
  if (init) return init;
  return (fallback?.trim()?.slice(0, 2) ?? "US").toUpperCase();
}

export function Topbar({
  title = "Dashboard",
  onMenuClick
}: {
  title?: string;
  onMenuClick?: () => void;
}) {
  const nav = useNavigate();
  const { data } = useMe(true);

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
    <header className="flex h-16 items-center justify-between border-b bg-white px-4 md:px-6 shrink-0 z-20">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Toggle Menu"
        >
          <Menu className="h-6 w-6 text-slate-600" />
        </button>
        <div className="text-lg md:text-xl font-semibold text-slate-800 truncate max-w-[200px] md:max-w-none">
          {title}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* Componente de Notificações em Tempo Real */}
        <NotificationBell />

        <button
          onClick={() => nav("/profile")}
          className="flex items-center gap-2 md:gap-3 rounded-2xl px-1 md:px-2 py-1 hover:bg-slate-50 transition-colors"
          title="Ir para meu perfil"
        >
          <div className="hidden sm:block text-right leading-tight">
            <div className="text-sm font-semibold text-slate-800 line-clamp-1">{fullName}</div>
            <div className="text-xs text-slate-500 line-clamp-1">{roleLabel}</div>
          </div>
          <Avatar key={user?.avatar} className="h-8 w-8 md:h-11 md:w-11 border border-slate-200">
            <AvatarImage src={getAvatarUrl(user?.avatar)} />
            <AvatarFallback className="bg-amber-100 text-amber-700 font-semibold text-sm md:text-base">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </div>
    </header>
  );
}