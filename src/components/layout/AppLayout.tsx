import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import { Topbar } from "./Topbar";

function getTitleByPath(pathname: string): string {
  if (pathname.startsWith("/financeiro")) return "Financeiro";
  if (pathname.startsWith("/workspaces")) return "Workspaces";
  if (pathname.startsWith("/biblioteca")) return "Biblioteca";
  if (pathname.startsWith("/configuracoes")) return "Configurações";
  if (pathname.startsWith("/usuarios")) return "Usuários";
  if (pathname.startsWith("/roles")) return "Roles";
  if (pathname.startsWith("/profile")) return "Minha Conta";
  if (pathname === "/") return "Dashboard";
  return "SIMP";
}

export function AppLayout() {
  const location = useLocation();
  const title = getTitleByPath(location.pathname);

  return (
    <div className="min-h-screen bg-[#F6F8FC]">
      <div className="flex min-h-screen">
        <Sidebar />

        <main className="flex-1">
          <Topbar title={title} />
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
