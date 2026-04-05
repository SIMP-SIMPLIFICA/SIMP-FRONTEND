import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type UniversalFinanceTab = "contas" | "categorias";

type ContextValue = {
  open: (tab?: UniversalFinanceTab) => void;
  close: () => void;
  isOpen: boolean;
  activeTab: UniversalFinanceTab;
  setActiveTab: (tab: UniversalFinanceTab) => void;
};

const UniversalFinanceModalContext = createContext<ContextValue | null>(null);

export function UniversalFinanceModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<UniversalFinanceTab>("contas");

  const open = useCallback((tab: UniversalFinanceTab = "contas") => {
    setActiveTab(tab);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  return (
    <UniversalFinanceModalContext.Provider value={{ open, close, isOpen, activeTab, setActiveTab }}>
      {children}
    </UniversalFinanceModalContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUniversalFinanceModal() {
  const ctx = useContext(UniversalFinanceModalContext);
  if (!ctx) throw new Error("useUniversalFinanceModal must be used inside UniversalFinanceModalProvider");
  return ctx;
}
