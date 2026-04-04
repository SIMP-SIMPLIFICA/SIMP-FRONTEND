import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import { Topbar } from "./Topbar";
import { UniversalFinanceModalProvider } from "@/context/UniversalFinanceModalContext";
import { UniversalFinanceModal } from "@/components/finance/UniversalFinanceModal";

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
    <UniversalFinanceModalProvider>
      <div className="flex h-screen overflow-hidden bg-[#F6F8FC]">
        <Sidebar />

        <main className="flex flex-1 flex-col overflow-hidden">
          <Topbar title={title} />
          <div className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </div>
        </main>
      </div>
      <UniversalFinanceModal />
    </UniversalFinanceModalProvider>
  );
}
