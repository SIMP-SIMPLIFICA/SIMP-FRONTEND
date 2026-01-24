import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import { Topbar } from "./Topbar";

const titleByPath: Record<string, string> = {
  "/": "Dashboard",
  "/financeiro": "Financeiro",
  "/workspaces": "Workspaces",
  "/biblioteca": "Biblioteca",
  "/configuracoes": "Configurações",
};

export function AppLayout() {
  const location = useLocation();
  const title = titleByPath[location.pathname] ?? "SIMP";

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
