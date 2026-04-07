import { createContext, useContext, useState } from 'react'

type ProcessTab = 'categorias' | 'origens' | 'empresas'

interface UniversalProcessModalContextValue {
  isOpen: boolean
  activeTab: ProcessTab
  open: (tab?: ProcessTab) => void
  close: () => void
}

const UniversalProcessModalContext = createContext<UniversalProcessModalContextValue | null>(null)

export function UniversalProcessModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<ProcessTab>('categorias')

  function open(tab: ProcessTab = 'categorias') {
    setActiveTab(tab)
    setIsOpen(true)
  }

  function close() {
    setIsOpen(false)
  }

  return (
    <UniversalProcessModalContext.Provider value={{ isOpen, activeTab, open, close }}>
      {children}
    </UniversalProcessModalContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUniversalProcessModal() {
  const ctx = useContext(UniversalProcessModalContext)
  if (!ctx) throw new Error('useUniversalProcessModal must be used inside UniversalProcessModalProvider')
  return ctx
}
