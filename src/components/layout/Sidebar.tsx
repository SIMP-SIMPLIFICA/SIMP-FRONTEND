import { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  BarChart3,
  Briefcase,
  BookOpen,
  Users,
  Shield,
  ChevronLeft,
  ChevronDown,
  LogOut,
  User,
  Receipt,
  FileText,
  Brain,
  FolderArchive,
  Settings,
  X,
  Wrench,
  Landmark,
  Tag,
  CalendarDays,
  StickyNote,
} from "lucide-react";

import { useQueryClient } from "@tanstack/react-query";
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
    anyOf: ["finance:read", "finance:write", "finance:approve", "finance:export"],
    children: [
      { label: "Lançamentos", to: "/financeiro/lancamentos", icon: <Receipt className="h-4 w-4" /> },
      { label: "Contas Bancárias", to: "/financeiro/contas", icon: <Landmark className="h-4 w-4" /> },
      { label: "Categorias", to: "/financeiro/categorias", icon: <Tag className="h-4 w-4" /> },
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
    label: "Comunicação",
    to: "/communication",
    icon: <FileText className="h-5 w-5" />,
    anyOf: ["documents:read", "documents:create", "documents:manage", "documents:sign", "documents:send"],
  },
  {
    label: "Processos Virtuais",
    to: "/processos-virtuais",
    icon: <FolderArchive className="h-5 w-5" />,
    anyOf: ["processes:read", "processes:write", "processes:manage", "processes:download"],
    children: [
      { label: "Processos", to: "/processos-virtuais", icon: <FolderArchive className="h-4 w-4" /> },
      { label: "Configurações", to: "/processos-virtuais/configuracoes", icon: <Tag className="h-4 w-4" /> },
    ],
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
    anyOf: ["settings:read", "settings:write", "system:admin"],
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
    label: "Utilidades",
    to: "/utilidades",
    icon: <Wrench className="h-5 w-5" />,
    children: [
      { label: "Calendário", to: "/utilidades/calendario", icon: <CalendarDays className="h-4 w-4" /> },
      { label: "Anotações",  to: "/utilidades/notas",      icon: <StickyNote   className="h-4 w-4" /> },
    ],
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
interface SidebarProps {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

export default function Sidebar({ mobileOpen, setMobileOpen }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { data } = useMe(true);

  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("simp:sidebarCollapsed") === "1";
  });

  const [financeOpen, setFinanceOpen] = useState(() =>
    location.pathname.startsWith("/financeiro")
  );

  const [processesOpen, setProcessesOpen] = useState(() =>
    location.pathname.startsWith("/processos-virtuais")
  );

  const [utilitiesOpen, setUtilitiesOpen] = useState(() =>
    location.pathname.startsWith("/utilidades")
  );

  // Fecha o menu mobile ao mudar de rota
  useEffect(() => {
    if (setMobileOpen) setMobileOpen(false);
  }, [location.pathname, setMobileOpen]);

  // Keep submenu open when navigating into any /financeiro/* route
  useEffect(() => {
    if (location.pathname.startsWith("/financeiro")) {
      setTimeout(() => setFinanceOpen(true), 0);
    }
  }, [location.pathname]);

  // Keep submenu open when navigating into any /processos-virtuais/* route
  useEffect(() => {
    if (location.pathname.startsWith("/processos-virtuais")) {
      setTimeout(() => setProcessesOpen(true), 0);
    }
  }, [location.pathname]);

  // Keep submenu open when navigating into any /utilidades/* route
  useEffect(() => {
    if (location.pathname.startsWith("/utilidades")) {
      setTimeout(() => setUtilitiesOpen(true), 0);
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
    queryClient.clear();
    navigate("/login");
  }

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.anyOf) return true;
    if (!data) return false;
    return hasAnyPermission(data, item.anyOf);
  });

  const sidebarContent = (
    <div
      className={cx(
        "h-full bg-[#0A5BC4] text-white flex flex-col transition-all duration-300 ease-in-out shadow-xl relative",
        collapsed ? "w-[88px]" : "w-[280px]"
      )}
    >
      {/* Glow Effect Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[30%] bg-white/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-[5%] right-0 w-[30%] h-[20%] bg-blue-400/10 blur-[80px] rounded-full" />
      </div>

      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-6 shrink-0 relative z-10">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 shadow-inner">
            <LayoutGrid className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="text-xl font-bold tracking-tight bg-gradient-to-br from-white to-white/70 bg-clip-text text-transparent">
              SIMP
            </div>
          )}
        </div>

        {/* Mobile Close Button */}
        {setMobileOpen && (
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 mt-4 overflow-y-auto no-scrollbar relative z-10">
        <ul className="space-y-1.5">
          {visibleItems.map((item) => {
            // ── Item with submenu ──────────────────────────────────────────
            if (item.children) {
              const isActive = location.pathname.startsWith(item.to);
              const submenuOpen =
                item.to === "/processos-virtuais" ? processesOpen :
                item.to === "/utilidades" ? utilitiesOpen :
                financeOpen;
              const setSubmenuOpen =
                item.to === "/processos-virtuais" ? setProcessesOpen :
                item.to === "/utilidades" ? setUtilitiesOpen :
                setFinanceOpen;

              return (
                <li key={item.to}>
                  {collapsed ? (
                    // Collapsed: single icon that navigates to parent route
                    <NavLink
                      to={item.to}
                      className={cx(
                        "flex items-center justify-center rounded-2xl px-4 py-3 transition hover:bg-white/10",
                        isActive ? ACTIVE_ITEM : "bg-transparent"
                      )}
                    >
                      <span className="shrink-0">{item.icon}</span>
                    </NavLink>
                  ) : (
                    // Expanded: NavLink (navigates) + chevron button (toggles)
                    <div
                      className={cx(
                        "flex items-center rounded-2xl overflow-hidden",
                        isActive ? ACTIVE_ITEM : "bg-transparent"
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
                        onClick={() => setSubmenuOpen((v) => !v)}
                        className="px-3 py-3 transition hover:bg-white/10"
                        aria-label={submenuOpen ? "Recolher submenu" : "Expandir submenu"}
                      >
                        <ChevronDown
                          className={cx(
                            "h-4 w-4 transition-transform",
                            submenuOpen ? "rotate-180" : ""
                          )}
                        />
                      </button>
                    </div>
                  )}

                  {/* Submenu children */}
                  {submenuOpen && !collapsed && (
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
      <div className="p-3 mt-auto space-y-1.5 relative z-10 border-t border-white/5">
        <button
          onClick={toggleCollapsed}
          className={cx(BASE_ITEM, "hidden lg:flex w-full bg-transparent")}
        >
          <ChevronLeft
            className={cx(
              "h-5 w-5 shrink-0 transition-transform",
              collapsed ? "rotate-180" : ""
            )}
          />
          {!collapsed && <span className="font-medium text-sm">Recolher</span>}
        </button>

        <button
          onClick={logout}
          className={cx(BASE_ITEM, "w-full bg-transparent")}
        >
          <LogOut className="h-5 w-5 shrink-0 text-red-200" />
          {!collapsed && (
            <span className="font-medium text-sm">Sair</span>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block h-screen shrink-0 sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      <div
        className={cx(
          "fixed inset-0 z-[100] transition-opacity duration-300 lg:hidden",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        {/* Overlay */}
        <div
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setMobileOpen?.(false)}
        />

        {/* Drawer Content */}
        <div
          className={cx(
            "absolute inset-y-0 left-0 transition-transform duration-300 ease-out shadow-2xl",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="h-full w-[280px]">
            {sidebarContent}
          </div>
        </div>
      </div>
    </>
  );
}
