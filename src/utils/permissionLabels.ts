const LABELS: Record<string, string> = {
  // Usuários
  'users:read':    'Visualizar Usuários',
  'users:write':   'Criar e Editar Usuários',
  'users:delete':  'Excluir Usuários',
  'users:manage':  'Gerenciar Usuários (total)',

  // Roles / Perfis
  'roles:read':    'Visualizar Perfis de Acesso',
  'roles:write':   'Criar e Editar Perfis',
  'roles:delete':  'Excluir Perfis',
  'roles:manage':  'Gerenciar Permissões Avançadas',

  // Financeiro
  'finance:read':    'Visualizar Financeiro',
  'finance:write':   'Lançar Despesas e Receitas',
  'finance:approve': 'Aprovar Transações',
  'finance:export':  'Exportar Dados Financeiros',

  // Configurações
  'settings:read':  'Ver Configurações do Sistema',
  'settings:write': 'Alterar Configurações do Sistema',

  // Comunicação / Documentos
  'documents:read':   'Visualizar Documentos',
  'documents:create': 'Criar Documentos (Ofícios, Memorandos)',
  'documents:manage': 'Gerenciar Todos os Documentos',
  'documents:sign':   'Assinar Documentos Digitalmente',
  'documents:send':   'Enviar / Protocolar Documentos',

  // Segurança / Sessões
  'sessions:view':   'Ver Sessões Ativas',
  'sessions:manage': 'Derrubar Sessões de Usuários',

  // Processos Virtuais
  'processes:read':     'Visualizar Processos Virtuais',
  'processes:write':    'Criar e Editar Processos',
  'processes:download': 'Baixar Documentos de Processos',
  'processes:manage':   'Gerenciar Todos os Processos',

  // Convênios
  'covenants:read':   'Visualizar Convênios',
  'covenants:write':  'Criar e Editar Convênios',
  'covenants:delete': 'Excluir Convênios',

  // Protocolos
  'protocols:read':  'Visualizar Protocolos',
  'protocols:write': 'Gerar Protocolos Oficiais',
  'protocols:admin': 'Administrar Protocolos (Emitir Qualquer)',

  // Departamentos
  'departments:read':   'Visualizar Departamentos',
  'departments:write':  'Criar e Editar Departamentos',
  'departments:delete': 'Excluir Departamentos',

  // Tarefas / Workspaces
  'tasks:read':   'Visualizar Workspaces e Tarefas',
  'tasks:write':  'Criar e Editar Tarefas',
  'tasks:manage': 'Gerenciar Workspaces (total)',

  // Biblioteca / GED
  'library:read':   'Visualizar Biblioteca de Documentos',
  'library:write':  'Enviar e Editar Documentos na Biblioteca',
  'library:delete': 'Excluir Documentos da Biblioteca',
  'library:logs':   'Ver Logs de Acesso à Biblioteca',

  // Comunicação
  'communication:read': 'Visualizar Módulo de Comunicação',

  // Conselhos Municipais
  'councils:read':  'Visualizar Conselhos Municipais',
  'councils:write': 'Criar e Editar Atas e Pautas',
  'councils:admin': 'Administrar Conselhos (total)',
  'councils:sign':  'Assinar Documentos de Conselhos',

  // Suporte
  'support:read':   'Visualizar Tickets de Suporte',
  'support:write':  'Criar e Responder Tickets',
  'support:admin':  'Administrar Suporte (total)',

  // Auditoria
  'audit:read':   'Visualizar Logs de Auditoria',
  'audit:export': 'Exportar Auditoria',

  // Sistema (super admin)
  'system:admin':   'Administrador do Sistema',
  'backup:manage':  'Gerenciar Backups',
}

export function getPermissionLabel(key: string): string {
  return LABELS[key] ?? key
}
