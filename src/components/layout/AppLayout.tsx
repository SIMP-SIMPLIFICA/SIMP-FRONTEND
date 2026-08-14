import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import { Topbar } from "./Topbar";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { UniversalFinanceModalProvider } from "@/context/UniversalFinanceModalContext";
import { UniversalFinanceModal } from "@/components/finance/UniversalFinanceModal";
import { UniversalProcessModalProvider } from "@/context/UniversalProcessModalContext";
import { UniversalProcessModal } from "@/components/processos-virtuais/UniversalProcessModal";
import { SupportWidget } from "@/components/support/SupportWidget";

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

  const [mobileOpen, setMobileOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // Evita que o drawer fique "aberto" em estado obsoleto ao cruzar de volta
  // para a largura mobile depois de ter sido fechado automaticamente no desktop.
  // mobileOpen é estado independente (alternado pelo usuário) — não dá para
  // derivá-lo de isDesktop durante o render, por isso o ajuste via efeito.
  useEffect(() => {
    if (isDesktop) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset intencional de estado não derivável ao cruzar o breakpoint
      setMobileOpen(false);
    }
  }, [isDesktop]);

  return (
    <UniversalFinanceModalProvider>
      <UniversalProcessModalProvider>
        <div className="flex h-screen overflow-hidden bg-background">
          <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

          <main className="flex flex-1 flex-col overflow-hidden">
            <Topbar title={title} onMenuClick={() => setMobileOpen(true)} />
            <div className="flex-1 overflow-y-auto p-6">
              <Outlet />
            </div>
          </main>
        </div>
        <UniversalFinanceModal />
        <UniversalProcessModal />
        <SupportWidget />
      </UniversalProcessModalProvider>
    </UniversalFinanceModalProvider>
  );
}
