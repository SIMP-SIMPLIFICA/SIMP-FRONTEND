import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import { Topbar } from "./Topbar";

const titleByPath: Record<string, string> = {
  "/": "Dashboard",
  "/financeiro": "Financeiro",
  "/workspaces": "Workspaces",
  "/biblioteca": "Biblioteca",
  "/configuracoes": "Configurações",
  "/communication": "Comunicação",
  "/processos-virtuais": "Processos Virtuais",
  "/usuarios": "Usuários",
  "/roles": "Roles",
  "/profile": "Meu Perfil",
};

export function AppLayout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const title = titleByPath[location.pathname] ?? "SIMP";

  return (
    <div className="min-h-screen bg-[#F6F8FC] flex">
      {/* Sidebar - Desktop and Mobile (Drawer) */}
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Topbar title={title} onMenuClick={() => setMobileOpen(true)} />

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
