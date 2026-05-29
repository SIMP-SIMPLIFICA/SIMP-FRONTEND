export const MODULE_LABELS: Record<string, string> = {
  tasks:             "Tarefas",
  finance:           "Financeiro",
  communication:     "Comunicação",
  virtual_processes: "Processos Virtuais",
  calendar:          "Calendário",
  notes:             "Notas",
  departments:       "Departamentos",
  library:           "Biblioteca",
  covenants:         "Convênios",
  protocols:         "Protocolos",
  councils:          "Conselhos",
  support:           "Suporte",
}

export function getModuleLabel(key: string): string {
  return MODULE_LABELS[key] ?? key
}
