import { NavLink } from "react-router-dom";
import {
  LayoutGrid,
  Wallet,
  Building2,
  BookOpen,
  Settings,
  ChevronLeft,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutGrid },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/workspaces", label: "Workspaces", icon: Building2 },
  { to: "/biblioteca", label: "Biblioteca", icon: BookOpen },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="hidden lg:flex lg:w-[280px] lg:flex-col bg-[#0A5BC4] text-white">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10">
          <LayoutGrid className="h-5 w-5" />
        </div>
        <div className="text-xl font-semibold tracking-wide">SIMP</div>
      </div>

      <nav className="px-4">
        <div className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-medium transition",
                    "hover:bg-white/10",
                    isActive && "bg-white/12 ring-1 ring-white/15"
                  )
                }
              >
                <Icon className="h-5 w-5 opacity-90" />
                <span className="opacity-95">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      <div className="mt-auto px-4 pb-6 pt-6">
        <button className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-medium opacity-90 transition hover:bg-white/10">
          <ChevronLeft className="h-5 w-5" />
          Recolher
        </button>

        <button className="mt-2 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-medium text-white/90 transition hover:bg-white/10">
          <LogOut className="h-5 w-5 text-red-200" />
          Sair
        </button>
      </div>
    </aside>
  );
}
