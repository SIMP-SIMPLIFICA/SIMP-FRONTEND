import { useMe } from "@/hooks/useMe";
import { useNavigate } from "react-router-dom";
import { NotificationBell } from "./NotificationBell"; 

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

export function Topbar({ title = "Dashboard" }: { title?: string }) {
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
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div className="text-xl font-semibold text-slate-800">{title}</div>

      <div className="flex items-center gap-4">
        
        {/* Componente de Notificações em Tempo Real */}
        <NotificationBell />

        <button
          onClick={() => nav("/profile")}
          className="flex items-center gap-3 rounded-2xl px-2 py-1 hover:bg-slate-50 transition-colors"
          title="Ir para meu perfil"
        >
          <div className="text-right leading-tight">
            <div className="font-semibold text-slate-800">{fullName}</div>
            <div className="text-sm text-slate-500">{roleLabel}</div>
          </div>
          <div className="grid h-11 w-11 place-items-center rounded-full bg-amber-100 text-amber-700 font-semibold">
            {initials}
          </div>
        </button>
      </div>
    </header>
  );
}