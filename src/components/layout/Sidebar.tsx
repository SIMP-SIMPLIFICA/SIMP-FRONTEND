import { useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  BarChart3,
  Briefcase,
  BookOpen,
  Settings,
  Users,
  Shield,
  ChevronLeft,
  LogOut,
} from "lucide-react";

import { useMe } from "@/hooks/useMe";
import { hasAnyPermission } from "@/lib/permissions";
import { clearAccessToken } from "@/lib/auth";

type NavItem = {
  label: string;
  to: string;
  icon: React.ReactNode;
  anyOf?: string[];
};

function classNames(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

export default function Sidebar() {
  const nav = useNavigate();
  const location = useLocation();
  const { data } = useMe(true);

  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("simp:sidebarCollapsed");
    return saved === "1";
  });

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem("simp:sidebarCollapsed", next ? "1" : "0");
      return next;
    });
  }

  function logout() {
    clearAccessToken();
    nav("/login");
  }

  const items: NavItem[] = useMemo(
    () => [
      {
        label: "Dashboard",
        to: "/",
        icon: <LayoutGrid className="h-5 w-5" />,
      },
      {
        label: "Financeiro",
        to: "/financeiro",
        icon: <BarChart3 className="h-5 w-5" />,
      },
      {
        label: "Workspaces",
        to: "/workspaces",
        icon: <Briefcase className="h-5 w-5" />,
      },
      {
        label: "Biblioteca",
        to: "/biblioteca",
        icon: <BookOpen className="h-5 w-5" />,
      },
      {
        label: "Configurações",
        to: "/configuracoes",
        icon: <Settings className="h-5 w-5" />,
      },
      {
        label: "Usuários",
        to: "/usuarios",
        icon: <Users className="h-5 w-5" />,
        anyOf: ["users:read", "users:manage"],
      },
      {
        label: "Roles",
        to: "/roles",
        icon: <Shield className="h-5 w-5" />,
        anyOf: ["roles:read", "roles:manage"],
      },
    ],
    []
  );

  const visibleItems = useMemo(() => {
    return items.filter((it) => {
      if (!it.anyOf) return true;
      if (!data) return false;
      return hasAnyPermission(data, it.anyOf);
    });
  }, [items, data]);

  return (
    <aside
      className={classNames(
        "h-screen bg-[#0A5BC4] text-white",
        "flex flex-col",
        collapsed ? "w-[88px]" : "w-[280px]"
      )}
    >
      {/* Header / Brand */}
      <div className="flex h-16 items-center gap-3 px-6">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/15">
          <LayoutGrid className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="text-xl font-semibold tracking-wide">SIMP</div>
        )}
      </div>

      {/* Nav */}
      <nav className="px-4 pt-4">
        <ul className="space-y-2">
          {visibleItems.map((it) => (
            <li key={it.to}>
              <NavLink
                to={it.to}
                className={({ isActive }) =>
                  classNames(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 transition",
                    "hover:bg-white/10",
                    isActive
                      ? "bg-white/12 ring-1 ring-white/15"
                      : "bg-transparent"
                  )
                }
                end={it.to === "/"}
              >
                <span className="shrink-0">{it.icon}</span>
                {!collapsed && (
                  <span className="text-[15px] font-semibold">{it.label}</span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Footer actions */}
      <div className="px-4 pb-5 space-y-2">
        <button
          onClick={toggleCollapsed}
          className={classNames(
            "w-full flex items-center gap-3 rounded-2xl px-4 py-3",
            "hover:bg-white/10 transition"
          )}
        >
          <ChevronLeft
            className={classNames(
              "h-5 w-5 transition-transform",
              collapsed ? "rotate-180" : ""
            )}
          />
          {!collapsed && <span className="font-semibold">Recolher</span>}
        </button>

        <button
          onClick={logout}
          className={classNames(
            "w-full flex items-center gap-3 rounded-2xl px-4 py-3",
            "hover:bg-white/10 transition"
          )}
        >
          <LogOut className="h-5 w-5 text-red-200" />
          {!collapsed && (
            <span className="font-semibold text-red-100">Sair</span>
          )}
        </button>

        {/* opcional: debugzinho pra ver rota atual */}
        <div className="mt-2 px-1 text-[11px] text-white/50">
          {!collapsed ? location.pathname : ""}
        </div>
      </div>
    </aside>
  );
}
