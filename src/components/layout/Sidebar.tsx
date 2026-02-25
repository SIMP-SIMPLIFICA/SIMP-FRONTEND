import { useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  BarChart3,
  Briefcase,
  BookOpen,
  Settings,
  ChevronLeft,
  LogOut,
  User,
} from "lucide-react";

import { useMe } from "@/hooks/useMe";
import { hasAnyPermission } from "@/lib/permissions";
import { clearAccessToken } from "@/lib/auth";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavItem = {
  type: "item";
  label: string;
  to: string;
  icon: React.ReactNode;
  anyOf?: string[];
};

type NavGroup = {
  type: "group";
  label: string;
  baseTo: string;
  icon: React.ReactNode;
  children: Omit<NavItem, "type" | "icon">[];
};

type NavElement = NavItem | NavGroup;

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

  const items: NavElement[] = useMemo(
    () => [
      {
        type: "item",
        label: "Dashboard",
        to: "/",
        icon: <LayoutGrid className="h-5 w-5" />,
      },
      {
        type: "group",
        label: "Financeiro",
        baseTo: "/financeiro",
        icon: <BarChart3 className="h-5 w-5" />,
        children: [
          { label: "Visão Geral", to: "/financeiro" },
          { label: "Lançamentos", to: "/financeiro/lancamentos" },
          { label: "Relatórios", to: "/financeiro/relatorios" },
          { label: "Inteligência", to: "/financeiro/inteligencia" },
        ],
      },
      {
        type: "item",
        label: "Workspaces",
        to: "/workspaces",
        icon: <Briefcase className="h-5 w-5" />,
      },
      {
        type: "item",
        label: "Biblioteca",
        to: "/biblioteca",
        icon: <BookOpen className="h-5 w-5" />,
      },
      {
        type: "item",
        label: "Meu Perfil",
        to: "/profile",
        icon: <User className="h-5 w-5" />,
      },
      {
        type: "group",
        label: "Configurações",
        baseTo: "/configuracoes",
        icon: <Settings className="h-5 w-5" />,
        children: [
          { label: "Geral", to: "/configuracoes" },
          { label: "Usuários", to: "/usuarios", anyOf: ["users:read", "users:manage"] },
          { label: "Roles", to: "/roles", anyOf: ["roles:read", "roles:manage"] },
        ],
      },
    ],
    []
  );

  const visibleItems = useMemo(() => {
    return items.map((it) => {
      if (it.type === "item") {
        if (!it.anyOf) return it;
        if (!data) return null;
        return hasAnyPermission(data, it.anyOf) ? it : null;
      } else {
        // Filter group children
        const visibleChildren = it.children.filter((child) => {
          if (!child.anyOf) return true;
          if (!data) return false;
          return hasAnyPermission(data, child.anyOf);
        });

        // If it's a group but all children are hidden due to permissions,
        // we might still want to show the group if we have logic for it.
        // In our case Configurações always has 'Geral'.
        if (visibleChildren.length === 0) return null;

        return {
          ...it,
          children: visibleChildren
        };
      }
    }).filter(Boolean) as NavElement[];
  }, [items, data]);

  return (
    <aside
      className={classNames(
        "sticky top-0 h-screen shrink-0 bg-[#0A5BC4] text-white",
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

      <nav className="px-4 pt-4">
        <ul className="space-y-2">
          {visibleItems.map((it) => {
            if (it.type === "item") {
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
            }

            // It's a Group
            const isGroupActive = location.pathname.startsWith(it.baseTo) ||
              (it.baseTo === "/configuracoes" && (location.pathname.startsWith("/usuarios") || location.pathname.startsWith("/roles")));

            if (collapsed) {
              return (
                <li key={it.baseTo}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className={classNames(
                          "w-full flex items-center justify-center gap-3 rounded-2xl px-4 py-3 transition",
                          "hover:bg-white/10",
                          isGroupActive
                            ? "bg-white/12 ring-1 ring-white/15"
                            : "bg-transparent"
                        )}
                      >
                        <span className="shrink-0">{it.icon}</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" sideOffset={16} className="w-48 bg-[#0A5BC4] text-white border-white/10">
                      <div className="px-2 py-2 text-xs font-semibold text-white/50 uppercase tracking-wider">
                        {it.label}
                      </div>
                      {it.children.map(child => (
                        <DropdownMenuItem key={child.to} asChild className="focus:bg-white/10 focus:text-white cursor-pointer rounded-xl">
                          <NavLink to={child.to} className="w-full">
                            {child.label}
                          </NavLink>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              );
            }

            return (
              <li key={it.baseTo} className="space-y-1">
                <NavLink
                  to={it.baseTo}
                  end={it.baseTo === "/" || it.baseTo === "/financeiro" || it.baseTo === "/configuracoes"}
                  className={classNames(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 transition hover:bg-white/10",
                    isGroupActive ? "text-white" : "text-white/80"
                  )}
                >
                  <span className="shrink-0">{it.icon}</span>
                  <span className="text-[15px] font-semibold">{it.label}</span>
                </NavLink>

                {isGroupActive && (
                  <ul className="pl-11 pr-2 space-y-1 pb-2">
                    {it.children.map(child => (
                      <li key={child.to}>
                        <NavLink
                          to={child.to}
                          end={child.to === "/" || child.to === "/financeiro" || child.to === "/configuracoes"}
                          className={({ isActive }) =>
                            classNames(
                              "block rounded-xl px-3 py-2 text-[14px] transition",
                              "hover:bg-white/10",
                              isActive
                                ? "bg-white/12 text-white font-medium"
                                : "text-white/70 hover:text-white"
                            )
                          }
                        >
                          {child.label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex-1" />

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
      </div>
    </aside>
  );
}