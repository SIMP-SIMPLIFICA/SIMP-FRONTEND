import { useState, useEffect, useRef } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  BarChart3,
  Briefcase,
  BookOpen,
  Users,
  Shield,
  ChevronRight,
  ChevronLeft,
  LogOut,
  User,
  FileText,
  FolderArchive,
  X,
  Wrench,
  ShieldCheck,
  Building2,
  Handshake,
  Hash,
  Landmark,
} from "lucide-react";

import { useQueryClient } from "@tanstack/react-query";
import { useMe } from "@/hooks/useMe";
import { hasAnyPermission } from "@/lib/permissions";
import { clearAccessToken } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type NavChild = { label: string; to: string; module?: string };

type NavItem = {
  label: string;
  to: string;
  icon: React.ReactNode;
  anyOf?: string[];
  module?: string;
  children?: NavChild[];
};

type NavSection = {
  label: string;
  items: NavItem[];
};

// ---------------------------------------------------------------------------
// Navigation structure — grouped into sections
// ---------------------------------------------------------------------------
const NAV_SECTIONS: NavSection[] = [
  {
    label: "Principal",
    items: [
      {
        label: "Dashboard",
        to: "/",
        icon: <LayoutGrid className="h-4 w-4" />,
      },
      {
        label: "Financeiro",
        to: "/financeiro",
        icon: <BarChart3 className="h-4 w-4" />,
        module: "finance",
        anyOf: ["finance:read", "finance:write", "finance:approve", "finance:export"],
        children: [
          { label: "Visão Geral", to: "/financeiro" },
          { label: "Lançamentos", to: "/financeiro/lancamentos" },
          { label: "Contas Bancárias", to: "/financeiro/contas" },
          { label: "Categorias", to: "/financeiro/categorias" },
          { label: "Relatórios", to: "/financeiro/relatorios" },
          { label: "Diagnóstico", to: "/financeiro/inteligencia" },
        ],
      },
      {
        label: "Workspaces",
        to: "/workspaces",
        icon: <Briefcase className="h-4 w-4" />,
        module: "tasks",
      },
      {
        label: "Comunicação",
        to: "/communication",
        icon: <FileText className="h-4 w-4" />,
        module: "communication",
        anyOf: ["documents:read", "documents:create", "documents:manage", "documents:sign", "documents:send"],
      },
    ],
  },
  {
    label: "Documentos",
    items: [
      {
        label: "Processos Virtuais",
        to: "/processos-virtuais",
        icon: <FolderArchive className="h-4 w-4" />,
        module: "virtual_processes",
        anyOf: ["processes:read", "processes:write", "processes:manage", "processes:download"],
        children: [
          { label: "Processos", to: "/processos-virtuais" },
          { label: "Configurações", to: "/processos-virtuais/configuracoes" },
        ],
      },
      {
        label: "Biblioteca",
        to: "/biblioteca",
        icon: <BookOpen className="h-4 w-4" />,
        module: "library",
        anyOf: ["library:read"],
      },
      {
        label: "Convênios",
        to: "/convenios",
        icon: <Handshake className="h-4 w-4" />,
        module: "covenants",
        anyOf: ["covenants:read", "covenants:write", "covenants:delete"],
      },
      {
        label: "Protocolos",
        to: "/protocolos",
        icon: <Hash className="h-4 w-4" />,
        module: "protocols",
        anyOf: ["protocols:read", "protocols:write", "protocols:admin"],
      },
      {
        label: "Conselhos",
        to: "/conselhos",
        icon: <Landmark className="h-4 w-4" />,
        module: "councils",
      },
    ],
  },
  {
    label: "Utilitários",
    items: [
      {
        label: "Utilidades",
        to: "/utilidades",
        icon: <Wrench className="h-4 w-4" />,
        children: [
          { label: "Calendário", to: "/utilidades/calendario", module: "calendar" },
          { label: "Anotações", to: "/utilidades/notas", module: "notes" },
        ],
      },
    ],
  },
  {
    label: "Administração",
    items: [
      {
        label: "Meu Perfil",
        to: "/profile",
        icon: <User className="h-4 w-4" />,
      },
      {
        label: "Organização",
        to: "/organizacao",
        icon: <Building2 className="h-4 w-4" />,
      },

      {
        label: "Usuários",
        to: "/usuarios",
        icon: <Users className="h-4 w-4" />,
        anyOf: ["users:read", "users:manage"],
      },
      {
        label: "Roles",
        to: "/roles",
        icon: <Shield className="h-4 w-4" />,
        anyOf: ["roles:read", "roles:manage"],
      },
      {
        label: "Departamentos",
        to: "/departamentos",
        icon: <Building2 className="h-4 w-4" />,
        anyOf: ["departments:read", "departments:write", "departments:delete"],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function cx(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

interface UserInfo {
  firstName?: string | null;
  lastName?: string | null;
  username?: string;
  email?: string;
}

function getInitials(u: UserInfo): string {
  const a = (u.firstName?.trim()?.[0] ?? "").toUpperCase();
  const b = (u.lastName?.trim()?.[0] ?? "").toUpperCase();
  const init = `${a}${b}`.trim();
  if (init) return init;
  return (u.username?.slice(0, 2) ?? u.email?.slice(0, 2) ?? "??").toUpperCase();
}

function getDisplayName(u: UserInfo): string {
  return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || u.email || "Usuário";
}

// ---------------------------------------------------------------------------
// Collapsed flyout state
// ---------------------------------------------------------------------------
interface FlyoutState {
  item: NavItem;
  top: number;  // viewport Y offset to align with trigger
}

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

  // Generic open groups — Set of item.to prefixes
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const open = new Set<string>();
    if (location.pathname.startsWith("/financeiro")) open.add("/financeiro");
    if (location.pathname.startsWith("/processos-virtuais")) open.add("/processos-virtuais");
    if (location.pathname.startsWith("/utilidades")) open.add("/utilidades");
    return open;
  });

  // Flyout panel when collapsed
  const [flyout, setFlyout] = useState<FlyoutState | null>(null);
  const flyoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close mobile drawer on route change
  useEffect(() => {
    if (setMobileOpen) setMobileOpen(false);
  }, [location.pathname, setMobileOpen]);

  // Auto-open group when navigating into it externally (e.g. deep link)
  useEffect(() => {
    const prefixes = ["/financeiro", "/processos-virtuais", "/utilidades"];
    prefixes.forEach((prefix) => {
      if (location.pathname.startsWith(prefix)) {
        setOpenGroups((prev) => new Set([...prev, prefix]));
      }
    });
  }, [location.pathname]);

  function toggleGroup(to: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(to)) next.delete(to);
      else next.add(to);
      return next;
    });
  }

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

  // Flyout helpers — delay on close so mouse can travel to the panel
  function scheduleFlyoutClose() {
    flyoutTimer.current = setTimeout(() => setFlyout(null), 120);
  }

  function cancelFlyoutClose() {
    if (flyoutTimer.current) clearTimeout(flyoutTimer.current);
  }

  function handleTriggerEnter(item: NavItem, el: HTMLElement) {
    cancelFlyoutClose();
    const rect = el.getBoundingClientRect();
    setFlyout({ item, top: rect.top });
  }

  const rawUser = data?.user as unknown as UserInfo & {
    isSuperAdmin?: boolean;
    organization?: { name: string };
    enabledModules?: string[];
  };
  const isSuperAdmin = rawUser?.isSuperAdmin ?? false;
  const orgName = rawUser?.organization?.name ?? null;
  const initials = rawUser ? getInitials(rawUser) : "??";
  const displayName = rawUser ? getDisplayName(rawUser) : "Usuário";
  const userEmail = rawUser?.email ?? "";

  const enabledModules: string[] = rawUser?.enabledModules ?? [];

  function filterItems(items: NavItem[]): NavItem[] {
    return items
      .map((item) => {
        if (item.to === "/organizacao") return (!!orgName && !isSuperAdmin) ? item : null;
        // Module check (super admin bypasses)
        if (!isSuperAdmin && item.module && !enabledModules.includes(item.module)) return null;
        // Permission check
        if (item.anyOf && !isSuperAdmin) {
          if (!data) return null;
          if (!hasAnyPermission(data, item.anyOf)) return null;
        }
        // Filter children by module
        if (item.children) {
          const visibleChildren = item.children.filter(
            (c) => !c.module || isSuperAdmin || enabledModules.includes(c.module)
          );
          if (visibleChildren.length === 0) return null;
          return { ...item, children: visibleChildren };
        }
        return item;
      })
      .filter(Boolean) as NavItem[];
  }

  // -------------------------------------------------------------------------
  // Sidebar body
  // -------------------------------------------------------------------------
  const sidebarContent = (
    <div
      className={cx(
        "h-full bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 h-14 shrink-0 border-b border-slate-100">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
            <LayoutGrid className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <span className="font-bold text-slate-900 text-[15px] tracking-tight">SIMP</span>
          )}
        </div>

        {setMobileOpen && !collapsed && (
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 hover:bg-slate-100 rounded-md transition-colors"
          >
            <X className="h-4 w-4 text-slate-500" />
          </button>
        )}
      </div>

      {/* ── Org / Super Admin badge ─────────────────────────────────────── */}
      {!collapsed && (isSuperAdmin || orgName) && (
        <div className="px-3 pt-3">
          {isSuperAdmin ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span className="text-xs font-semibold text-amber-700">Super Admin</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
              <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="text-xs font-medium text-slate-600 truncate">{orgName}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-5 no-scrollbar">

        {/* Super Admin shortcut */}
        {isSuperAdmin && (
          <div>
            {!collapsed && (
              <p className="px-2 pb-1.5 text-[10px] uppercase tracking-widest font-semibold text-amber-500">
                Super Admin
              </p>
            )}
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                cx(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors text-sm w-full",
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-amber-700 hover:bg-amber-50",
                  collapsed && "justify-center"
                )
              }
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="font-medium">Painel Admin</span>}
            </NavLink>
          </div>
        )}

        {NAV_SECTIONS.map((section) => {
          const visibleItems = filterItems(section.items);
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.label}>
              {/* Section label */}
              {!collapsed && (
                <p className="px-2 pb-1.5 text-[10px] uppercase tracking-widest font-semibold text-slate-400">
                  {section.label}
                </p>
              )}

              <ul className="space-y-0.5">
                {visibleItems.map((item) => {
                  const isGroupActive =
                    item.to !== "/" && location.pathname.startsWith(item.to);
                  const isOpen = openGroups.has(item.to);

                  // ── Item with children ───────────────────────────────
                  if (item.children) {
                    return (
                      <li key={item.to}>
                        {collapsed ? (
                          // Collapsed: icon + hover triggers flyout
                          <div
                            onMouseEnter={(e) => handleTriggerEnter(item, e.currentTarget)}
                            onMouseLeave={scheduleFlyoutClose}
                          >
                            <button
                              className={cx(
                                "flex items-center justify-center w-full px-2 py-2 rounded-lg transition-colors",
                                isGroupActive
                                  ? "bg-slate-900 text-white"
                                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              )}
                            >
                              {item.icon}
                            </button>
                          </div>
                        ) : (
                          <>
                            {/* Parent row — click to toggle, does NOT navigate */}
                            <button
                              onClick={() => toggleGroup(item.to)}
                              className={cx(
                                "flex items-center justify-between w-full px-2.5 py-2 rounded-lg transition-colors text-sm",
                                isGroupActive
                                  ? "text-slate-900"
                                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                              )}
                            >
                              <div className="flex items-center gap-2.5">
                                <span
                                  className={cx(
                                    "shrink-0 transition-colors",
                                    isGroupActive ? "text-blue-600" : "text-slate-400"
                                  )}
                                >
                                  {item.icon}
                                </span>
                                <span className={cx("font-medium", isGroupActive && "font-semibold")}>
                                  {item.label}
                                </span>
                              </div>
                              <ChevronRight
                                className={cx(
                                  "h-3.5 w-3.5 text-slate-400 transition-transform duration-200 shrink-0",
                                  isOpen && "rotate-90"
                                )}
                              />
                            </button>

                            {/* Children */}
                            {isOpen && (
                              <ul className="mt-1 ml-[22px] pl-3.5 border-l border-slate-200 space-y-0.5">
                                {item.children.map((child) => (
                                  <li key={child.to}>
                                    <NavLink
                                      to={child.to}
                                      end={child.to === item.to}
                                      className={({ isActive }) =>
                                        cx(
                                          "block px-2.5 py-1.5 rounded-md text-sm transition-colors",
                                          isActive
                                            ? "bg-blue-50 text-blue-700 font-semibold"
                                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                                        )
                                      }
                                    >
                                      {child.label}
                                    </NavLink>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </>
                        )}
                      </li>
                    );
                  }

                  // ── Regular item ─────────────────────────────────────
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.to === "/"}
                        className={({ isActive }) =>
                          cx(
                            "flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors text-sm w-full",
                            isActive
                              ? "bg-slate-900 text-white"
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                            collapsed && "justify-center"
                          )
                        }
                      >
                        <span className="shrink-0">{item.icon}</span>
                        {!collapsed && <span className="font-medium">{item.label}</span>}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-slate-100 p-2 space-y-1">
        {/* Collapse toggle — desktop only */}
        <button
          onClick={toggleCollapsed}
          className={cx(
            "hidden lg:flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors text-sm",
            collapsed && "justify-center"
          )}
        >
          <ChevronLeft
            className={cx(
              "h-4 w-4 shrink-0 transition-transform",
              collapsed && "rotate-180"
            )}
          />
          {!collapsed && <span className="font-medium">Recolher</span>}
        </button>

        {/* User card */}
        <div
          className={cx(
            "flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-100",
            collapsed && "justify-center"
          )}
        >
          <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
            <span className="text-white text-[10px] font-bold leading-none">{initials}</span>
          </div>

          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate leading-tight">{displayName}</p>
                <p className="text-[10px] text-slate-400 truncate leading-tight">{userEmail}</p>
              </div>
              <button
                onClick={logout}
                className="p-1 rounded-md hover:bg-red-50 transition-colors group"
                title="Sair"
              >
                <LogOut className="h-3.5 w-3.5 text-slate-400 group-hover:text-red-500 transition-colors" />
              </button>
            </>
          )}
        </div>

        {/* Logout standalone when collapsed */}
        {collapsed && (
          <button
            onClick={logout}
            className="flex items-center justify-center w-full px-2.5 py-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );

  // ── Flyout panel (rendered outside sidebar, fixed position) ──────────────
  const flyoutPanel = collapsed && flyout ? (
    <div
      className="fixed z-[200] flex"
      style={{ left: 68, top: flyout.top }}
      onMouseEnter={cancelFlyoutClose}
      onMouseLeave={scheduleFlyoutClose}
    >
      {/* Arrow connector */}
      <div className="w-2 flex items-start pt-2.5">
        <div className="w-2 h-2 border-t border-l border-slate-200 bg-white rotate-[-45deg] translate-x-[5px]" />
      </div>

      {/* Panel */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg py-1.5 min-w-[180px] overflow-hidden">
        {/* Group label */}
        <p className="px-3 py-1.5 text-[10px] uppercase tracking-widest font-semibold text-slate-400 border-b border-slate-100 mb-1">
          {flyout.item.label}
        </p>

        {/* Children */}
        {flyout.item.children?.map((child) => (
          <NavLink
            key={child.to}
            to={child.to}
            end={child.to === flyout.item.to}
            className={({ isActive }) =>
              cx(
                "block px-3 py-1.5 text-sm transition-colors mx-1 rounded-md",
                isActive
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )
            }
          >
            {child.label}
          </NavLink>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block h-screen shrink-0 sticky top-0">
        {sidebarContent}
      </aside>

      {/* Flyout — rendered at document level via fixed positioning */}
      {flyoutPanel}

      {/* Mobile Drawer */}
      <div
        className={cx(
          "fixed inset-0 z-[100] transition-opacity duration-300 lg:hidden",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        <div
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setMobileOpen?.(false)}
        />
        <div
          className={cx(
            "absolute inset-y-0 left-0 transition-transform duration-300 ease-out shadow-xl",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="h-full w-[260px]">
            {sidebarContent}
          </div>
        </div>
      </div>
    </>
  );
}
