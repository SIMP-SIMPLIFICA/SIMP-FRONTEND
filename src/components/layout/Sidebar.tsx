import { useMemo, useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  BarChart3,
  Briefcase,
  BookOpen,
  Users,
  Shield,
  ChevronLeft,
  LogOut,
  User,
  FileText,
  FolderArchive,
  X,
} from "lucide-react";

import { useMe } from "@/hooks/useMe";
import { hasAnyPermission } from "@/lib/permissions";
import { clearAccessToken } from "@/lib/auth";

type NavItem = {
  label: string;
  to: string;
  icon: React.ElementType;
  anyOf?: string[];
};

function classNames(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

interface SidebarProps {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

export default function Sidebar({ mobileOpen, setMobileOpen }: SidebarProps) {
  const nav = useNavigate();
  const location = useLocation();
  const { data } = useMe(true);

  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("simp:sidebarCollapsed");
    return saved === "1";
  });

  // Fecha o menu mobile ao mudar de rota
  useEffect(() => {
    if (setMobileOpen) setMobileOpen(false);
  }, [location.pathname, setMobileOpen]);

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
        icon: LayoutGrid,
      },
      {
        label: "Comunicação",
        to: "/communication",
        icon: FileText,
      },
      {
        label: "Processos Virtuais",
        to: "/processos-virtuais",
        icon: FolderArchive,
        anyOf: ["processes:read", "processes:write", "processes:manage", "processes:download"],
      },
      {
        label: "Workspaces",
        to: "/workspaces",
        icon: Briefcase,
      },
      {
        label: "Financeiro",
        to: "/financeiro",
        icon: BarChart3,
      },
      {
        label: "Biblioteca",
        to: "/biblioteca",
        icon: BookOpen,
      },
      {
        label: "Meu Perfil",
        to: "/profile",
        icon: User,
      },
      {
        label: "Usuários",
        to: "/usuarios",
        icon: Users,
        anyOf: ["users:read", "users:manage"],
      },
      {
        label: "Roles",
        to: "/roles",
        icon: Shield,
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

  const isItemActive = (to: string) => {
    if (to === "/") return location.pathname === "/";
    return location.pathname.startsWith(to);
  };

  const sidebarContent = (
    <div
      className={classNames(
        "h-full bg-[#0A5BC4] text-white flex flex-col transition-all duration-300 ease-in-out shadow-xl relative",
        collapsed ? "w-[88px]" : "w-[280px]"
      )}
    >
      {/* Glow Effect Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[30%] bg-white/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-[5%] right-0 w-[30%] h-[20%] bg-blue-400/10 blur-[80px] rounded-full" />
      </div>

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

      <nav className="flex-1 px-3 mt-4 overflow-y-auto no-scrollbar relative z-10">
        <ul className="space-y-1.5">
          {visibleItems.map((it) => {
            const Icon = it.icon;
            const active = isItemActive(it.to);
            return (
              <li key={it.to}>
                <NavLink
                  to={it.to}
                  className={classNames(
                    "group flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200",
                    active
                      ? "bg-white/15 text-white shadow-sm ring-1 ring-white/20"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <span className={classNames(
                    "shrink-0 transition-transform duration-200 group-hover:scale-110",
                    active ? "text-white" : "text-white/60 group-hover:text-white"
                  )}>
                    <Icon className="h-5 w-5" />
                  </span>
                  {!collapsed && (
                    <span className="text-[14px] font-medium tracking-wide">
                      {it.label}
                    </span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-3 mt-auto space-y-1.5 relative z-10 border-t border-white/5">
        <button
          onClick={toggleCollapsed}
          className="hidden lg:flex w-full items-center gap-3 rounded-xl px-4 py-3 text-white/70 hover:bg-white/10 hover:text-white transition-all duration-200"
        >
          <ChevronLeft
            className={classNames(
              "h-5 w-5 transition-transform duration-300",
              collapsed ? "rotate-180" : ""
            )}
          />
          {!collapsed && <span className="font-medium text-sm">Recolher</span>}
        </button>

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-white/70 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200"
        >
          <LogOut className="h-5 w-5" />
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
        className={classNames(
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
          className={classNames(
            "absolute inset-y-0 left-0 transition-transform duration-300 ease-out shadow-2xl",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {/* We force-expand the mobile sidebar for better UX */}
          <div className="h-full w-[280px]">
            {/* Redefinimos o conteúdo para o mobile ignorar o state de 'collapsed' local do desktop */}
            <div className="h-full bg-[#0A5BC4] text-white flex flex-col shadow-xl relative w-full">
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[30%] bg-white/5 blur-[100px] rounded-full" />
              </div>

              <div className="flex h-16 items-center justify-between px-6 shrink-0 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 shadow-inner">
                    <LayoutGrid className="h-5 w-5" />
                  </div>
                  <div className="text-xl font-bold tracking-tight">SIMP</div>
                </div>
                <button
                  onClick={() => setMobileOpen?.(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex-1 px-3 mt-4 overflow-y-auto no-scrollbar relative z-10">
                <ul className="space-y-1.5">
                  {visibleItems.map((it) => {
                    const Icon = it.icon;
                    const active = isItemActive(it.to);
                    return (
                      <li key={it.to}>
                        <NavLink
                          to={it.to}
                          className={classNames(
                            "group flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200",
                            active
                              ? "bg-white/15 text-white shadow-sm ring-1 ring-white/20"
                              : "text-white/70 hover:bg-white/10 hover:text-white"
                          )}
                        >
                          <span className={classNames(
                            "shrink-0",
                            active ? "text-white" : "text-white/60"
                          )}>
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="text-[14px] font-medium tracking-wide">
                            {it.label}
                          </span>
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              <div className="p-3 mt-auto relative z-10 border-t border-white/5">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-white/70 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium text-sm">Sair</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}