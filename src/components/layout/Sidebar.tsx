import { useState, useEffect } from "react";
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type NavChild = { label: string; to: string; icon: React.ReactNode };

type NavItem = {
  label: string;
  to: string;
  icon: React.ReactNode;
  anyOf?: string[];
  children?: NavChild[];
};

// ---------------------------------------------------------------------------
// Static data — module-level constants, never recreated on re-render
// ---------------------------------------------------------------------------
const NAV_ITEMS: NavItem[] = [
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
      { label: "Lançamentos", to: "/financeiro/lancamentos", icon: <Receipt className="h-4 w-4" /> },
      { label: "Relatórios", to: "/financeiro/relatorios", icon: <FileText className="h-4 w-4" /> },
      { label: "Inteligência", to: "/financeiro/inteligencia", icon: <Brain className="h-4 w-4" /> },
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
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function cx(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

const BASE_ITEM =
  "flex items-center gap-3 rounded-2xl px-4 py-3 transition hover:bg-white/10";
const ACTIVE_ITEM = "bg-white/12 ring-1 ring-white/15";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data } = useMe(true);

  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("simp:sidebarCollapsed") === "1";
  });

  const [financeOpen, setFinanceOpen] = useState(() =>
    location.pathname.startsWith("/financeiro")
  );

  // Keep submenu open when navigating into any /financeiro/* route
  useEffect(() => {
    if (location.pathname.startsWith("/financeiro")) {
      setFinanceOpen(true);
    }
  }, [location.pathname]);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("simp:sidebarCollapsed", next ? "1" : "0");
      return next;
    });
  }

  function logout() {
    clearAccessToken();
    navigate("/login");
  }

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.anyOf) return true;
    if (!data) return false;
    return hasAnyPermission(data, item.anyOf);
  });

  return (
    <aside
      className={cx(
        "h-screen bg-[#0A5BC4] text-white flex flex-col",
        collapsed ? "w-[88px]" : "w-[280px]"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-3 px-6">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/15">
          <LayoutGrid className="h-5 w-5" />
        </div>
        {!collapsed && (
          <span className="text-xl font-semibold tracking-wide">SIMP</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-4 pt-4">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            // ── Item with submenu ──────────────────────────────────────────
            if (item.children) {
              const onFinanceiro = location.pathname.startsWith(item.to);

              return (
                <li key={item.to}>
                  {collapsed ? (
                    // Collapsed: single icon that navigates to parent route
                    <NavLink
                      to={item.to}
                      className={cx(
                        "flex items-center justify-center rounded-2xl px-4 py-3 transition hover:bg-white/10",
                        onFinanceiro ? ACTIVE_ITEM : "bg-transparent"
                      )}
                    >
                      <span className="shrink-0">{item.icon}</span>
                    </NavLink>
                  ) : (
                    // Expanded: NavLink (navigates) + chevron button (toggles)
                    <div
                      className={cx(
                        "flex items-center rounded-2xl overflow-hidden",
                        onFinanceiro ? ACTIVE_ITEM : "bg-transparent"
                      )}
                    >
                      <NavLink
                        to={item.to}
                        end
                        className="flex flex-1 items-center gap-3 px-4 py-3 transition hover:bg-white/10"
                      >
                        <span className="shrink-0">{item.icon}</span>
                        <span className="text-[15px] font-semibold">
                          {item.label}
                        </span>
                      </NavLink>

                      <button
                        onClick={() => setFinanceOpen((v) => !v)}
                        className="px-3 py-3 transition hover:bg-white/10"
                        aria-label={financeOpen ? "Recolher submenu" : "Expandir submenu"}
                      >
                        <ChevronDown
                          className={cx(
                            "h-4 w-4 transition-transform",
                            financeOpen ? "rotate-180" : ""
                          )}
                        />
                      </button>
                    </div>
                  )}

                  {/* Submenu children */}
                  {financeOpen && !collapsed && (
                    <ul className="mt-1 ml-4 space-y-1 border-l border-white/20 pl-4">
                      {item.children.map((child) => (
                        <li key={child.to}>
                          <NavLink
                            to={child.to}
                            className={({ isActive }) =>
                              cx(
                                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-white/10",
                                isActive
                                  ? "bg-white/15 font-semibold text-white"
                                  : "text-white/75"
                              )
                            }
                          >
                            <span className="shrink-0">{child.icon}</span>
                            {child.label}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            }

            // ── Regular item ───────────────────────────────────────────────
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    cx(BASE_ITEM, isActive ? ACTIVE_ITEM : "bg-transparent")
                  }
                >
                  <span className="shrink-0">{item.icon}</span>
                  {!collapsed && (
                    <span className="text-[15px] font-semibold">
                      {item.label}
                    </span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="shrink-0 space-y-2 px-4 pb-5">
        <button
          onClick={toggleCollapsed}
          className={cx(BASE_ITEM, "w-full bg-transparent")}
        >
          <ChevronLeft
            className={cx(
              "h-5 w-5 shrink-0 transition-transform",
              collapsed ? "rotate-180" : ""
            )}
          />
          {!collapsed && <span className="font-semibold">Recolher</span>}
        </button>

        <button
          onClick={logout}
          className={cx(BASE_ITEM, "w-full bg-transparent")}
        >
          <LogOut className="h-5 w-5 shrink-0 text-red-200" />
          {!collapsed && (
            <span className="font-semibold text-red-100">Sair</span>
          )}
        </button>
      </div>
    </aside>
  );
}
