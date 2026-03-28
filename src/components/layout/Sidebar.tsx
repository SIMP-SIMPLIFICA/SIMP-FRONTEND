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
  ChevronDown,
  LogOut,
  User,
  HandCoins,
  Receipt,
  FileText,
  Brain,
} from "lucide-react";

import { useMe } from "@/hooks/useMe";
import { hasAnyPermission } from "@/lib/permissions";
import { clearAccessToken } from "@/lib/auth";

type NavChild = {
  label: string;
  to: string;
};

type NavItem = {
  label: string;
  to: string;
  icon: React.ReactNode;
  anyOf?: string[];
  children?: NavChild[];
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

  const isOnFinanceiro = location.pathname.startsWith("/financeiro");
  const [financeOpen, setFinanceOpen] = useState(isOnFinanceiro);

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
        children: [
          { label: "Lançamentos", to: "/financeiro/lancamentos" },
          { label: "Relatórios", to: "/financeiro/relatorios" },
          { label: "Inteligência", to: "/financeiro/inteligencia" },
        ],
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
        label: "Meu Perfil",
        to: "/profile",
        icon: <User className="h-5 w-5" />,
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
      {
        label: "Convênios",
        to: "/convenios",
        icon: <HandCoins className="h-5 w-5" />,
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

  const childIcons: Record<string, React.ReactNode> = {
    "/financeiro/lancamentos": <Receipt className="h-4 w-4" />,
    "/financeiro/relatorios": <FileText className="h-4 w-4" />,
    "/financeiro/inteligencia": <Brain className="h-4 w-4" />,
  };

  return (
    <aside
      className={classNames(
        "h-screen bg-[#0A5BC4] text-white",
        "flex flex-col",
        collapsed ? "w-[88px]" : "w-[280px]"
      )}
    >
      <div className="flex h-16 items-center gap-3 px-6">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/15">
          <LayoutGrid className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="text-xl font-semibold tracking-wide">SIMP</div>
        )}
      </div>

      <nav className="px-4 pt-4 overflow-y-auto flex-1">
        <ul className="space-y-1">
          {visibleItems.map((it) => {
            if (it.children && !collapsed) {
              const isParentActive = location.pathname.startsWith(it.to);
              return (
                <li key={it.to}>
                  <button
                    onClick={() => setFinanceOpen((v) => !v)}
                    className={classNames(
                      "w-full flex items-center gap-3 rounded-2xl px-4 py-3 transition",
                      "hover:bg-white/10",
                      isParentActive
                        ? "bg-white/12 ring-1 ring-white/15"
                        : "bg-transparent"
                    )}
                  >
                    <span className="shrink-0">{it.icon}</span>
                    <span className="text-[15px] font-semibold flex-1 text-left">
                      {it.label}
                    </span>
                    <ChevronDown
                      className={classNames(
                        "h-4 w-4 transition-transform shrink-0",
                        financeOpen ? "rotate-180" : ""
                      )}
                    />
                  </button>

                  {financeOpen && (
                    <ul className="mt-1 ml-4 pl-4 border-l border-white/20 space-y-1">
                      {it.children.map((child) => (
                        <li key={child.to}>
                          <NavLink
                            to={child.to}
                            className={({ isActive }) =>
                              classNames(
                                "flex items-center gap-3 rounded-xl px-3 py-2 transition text-sm",
                                "hover:bg-white/10",
                                isActive
                                  ? "bg-white/15 font-semibold"
                                  : "text-white/80"
                              )
                            }
                          >
                            <span className="shrink-0">
                              {childIcons[child.to]}
                            </span>
                            {child.label}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            }

            // Collapsed mode with children: show parent icon only, navigates to parent route
            if (it.children && collapsed) {
              const isParentActive = location.pathname.startsWith(it.to);
              return (
                <li key={it.to}>
                  <NavLink
                    to={it.to}
                    className={classNames(
                      "flex items-center justify-center rounded-2xl px-4 py-3 transition",
                      "hover:bg-white/10",
                      isParentActive
                        ? "bg-white/12 ring-1 ring-white/15"
                        : "bg-transparent"
                    )}
                  >
                    <span className="shrink-0">{it.icon}</span>
                  </NavLink>
                </li>
              );
            }

            return (
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
            );
          })}
        </ul>
      </nav>

      <div className="px-4 pb-5 space-y-2 shrink-0">
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
      </div>
    </aside>
  );
}
