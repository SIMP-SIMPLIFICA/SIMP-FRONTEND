/**
 * Tradução de `action`/`resource` da auditoria para linguagem humana.
 *
 * Fonte: levantamento real dos pontos que gravam em `audit_logs` no
 * SIMP-BACKEND (`auditLedgerService.record` / `prisma.auditLog.create` em
 * `virtual-process.controller.ts`, `user.controller.ts`, `role.controller.ts`,
 * `auth.service.ts`, `daily-allowance.service.ts`, `fleet-fueling.service.ts`,
 * `library.controller.ts`, `admin.controller.ts`, `security-alert.service.ts`
 * — 2026-09-22). Não é uma lista inventada.
 *
 * `action`/`resource` continuam texto livre no banco (spec
 * audit-log-admin-panel §4, achado §1.2): nada aqui vira um enum fechado no
 * SERVIDOR, e por isso o filtro por Ação/Recurso continua mandando a chave
 * exata pra API (`contains`, `resource` exato) — só a APRESENTAÇÃO muda.
 * Quando um módulo novo passar a auditar algo e este arquivo não acompanhar,
 * `humanize()` ainda mostra algo legível (Title Case) em vez da chave crua ou
 * de "undefined" — nunca falha silenciosamente, só fica menos bonito até
 * alguém atualizar a lista abaixo.
 */

export const RESOURCE_LABELS: Record<string, string> = {
  ORGANIZATION: "Organização",
  DAILY_ALLOWANCE: "Diária",
  FLEET_FUELING: "Abastecimento de Frota",
  LIBRARY_DOCUMENT: "Documento da Biblioteca",
  VIRTUAL_PROCESS: "Processo Virtual",
  VIRTUAL_PROCESS_DOCUMENT: "Anexo do Processo Virtual",
  SECURITY: "Segurança",
  SYSTEM: "Sistema",
  DOCUMENT: "Documento",
  role: "Perfil de Acesso",
  user: "Usuário",
};

/**
 * action → rótulo, para os casos NÃO ambíguos (a chave já é específica o
 * bastante sozinha). Verbos genéricos que mais de um módulo poderia
 * reaproveitar (`UPLOAD`, `DOWNLOAD`, `DELETE`...) ficam em
 * `AMBIGUOUS_ACTIONS`, resolvidos junto com o `resource`.
 */
export const ACTION_LABELS: Record<string, string> = {
  ORGANIZATION_SUSPENDED: "Organização suspensa",
  ORGANIZATION_REACTIVATED: "Organização reativada",
  DAILY_ALLOWANCE_ISSUED: "Diária emitida",
  DAILY_ALLOWANCE_ACCOUNTED: "Prestação de contas registrada",
  FLEET_FUELING_ISSUED: "Abastecimento emitido",
  DOWNLOAD_ZIP: "Download em lote (ZIP)",
  VISUALIZOU: "Visualização",
  AUTUOU: "Autuação (criação do processo)",
  ALTEROU_STATUS: "Alteração de status",
  ATUALIZOU_DADOS_EMPRESA: "Atualização de dados da empresa",
  ATUALIZOU_VIGENCIA: "Atualização de vigência",
  ATUALIZOU_ORCAMENTO: "Atualização de orçamento",
  EXCLUIU: "Exclusão",
  ANEXOU_DOCUMENTO: "Anexo de documento",
  REMOVEU_DOCUMENTO: "Remoção de documento",
  BAIXOU_DOCUMENTO: "Download de anexo",
  roles_listed: "Listagem de perfis",
  role_viewed: "Visualização de perfil",
  role_created: "Criação de perfil",
  role_updated: "Edição de perfil",
  role_deleted: "Exclusão de perfil",
  role_duplicated: "Duplicação de perfil",
  users_listed: "Listagem de usuários",
  user_viewed: "Visualização de usuário",
  user_created: "Criação de usuário",
  user_updated: "Edição de usuário",
  user_deleted: "Exclusão de usuário",
  roles_assigned: "Atribuição de perfil a usuário",
  roles_removed: "Remoção de perfil de usuário",
  user_sessions_terminated: "Encerramento de sessões",
  password_reset_forced: "Redefinição de senha (forçada por admin)",
  certificate_generated: "Geração de certificado",
  logo_uploaded: "Envio de logo",
  logo_removed: "Remoção de logo",
  user_register: "Cadastro de usuário",
  user_login: "Login",
  user_logout: "Logout",
  password_changed: "Alteração de senha",
  password_reset_requested: "Solicitação de redefinição de senha",
  password_reset_completed: "Redefinição de senha concluída",
  email_verified: "Verificação de e-mail",
  user_profile_updated: "Atualização de perfil",
  SUSPICIOUS_ACCESS_DETECTED: "Acesso suspeito detectado",
};

/** (resource → (action → rótulo)) só para os verbos crus reaproveitáveis. */
const AMBIGUOUS_ACTIONS: Record<string, Record<string, string>> = {
  LIBRARY_DOCUMENT: {
    UPLOAD: "Documento enviado",
    DOWNLOAD: "Documento baixado",
    DELETE: "Documento excluído",
  },
};

function humanize(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

export function translateResource(resource: string): string {
  return RESOURCE_LABELS[resource] ?? humanize(resource);
}

/**
 * `resource` é opcional só por conveniência de call sites que não o têm à
 * mão — sempre que existir (linha da tabela, CSV, detalhe), passe-o: é o que
 * resolve os verbos ambíguos antes de cair no dicionário plano.
 */
export function translateAction(action: string, resource?: string): string {
  if (resource && AMBIGUOUS_ACTIONS[resource]?.[action]) {
    return AMBIGUOUS_ACTIONS[resource][action];
  }
  return ACTION_LABELS[action] ?? humanize(action);
}

// ─────────────────────────────────────────────────────────────────────────
// Opções para os <Select> de filtro — só os valores catalogados acima.
// ─────────────────────────────────────────────────────────────────────────

export interface FilterOption {
  value: string;
  label: string;
}

/** Recurso: lista pequena e estável (um item por módulo) — cabe num Select simples. */
export const RESOURCE_FILTER_OPTIONS: FilterOption[] = Object.entries(RESOURCE_LABELS)
  .map(([value, label]) => ({ value, label }))
  .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

/**
 * Ação, agrupada por recurso (chave = valor real de `resource`) — evitar uma
 * lista solta de ~40 itens. `getActionOptions` abaixo decide o que mostrar
 * conforme o Recurso já escolhido na tela.
 */
const ACTION_GROUPS: Record<string, FilterOption[]> = {
  ORGANIZATION: [
    { value: "ORGANIZATION_SUSPENDED", label: "Suspensão" },
    { value: "ORGANIZATION_REACTIVATED", label: "Reativação" },
  ],
  DAILY_ALLOWANCE: [
    { value: "DAILY_ALLOWANCE_ISSUED", label: "Emissão" },
    { value: "DAILY_ALLOWANCE_ACCOUNTED", label: "Prestação de Contas" },
  ],
  FLEET_FUELING: [{ value: "FLEET_FUELING_ISSUED", label: "Emissão" }],
  LIBRARY_DOCUMENT: [
    { value: "UPLOAD", label: "Envio" },
    { value: "DOWNLOAD", label: "Download" },
    { value: "DELETE", label: "Exclusão" },
    { value: "DOWNLOAD_ZIP", label: "Download em Lote (ZIP)" },
  ],
  VIRTUAL_PROCESS: [
    { value: "AUTUOU", label: "Autuação (Criação)" },
    { value: "VISUALIZOU", label: "Visualização" },
    { value: "ALTEROU_STATUS", label: "Alteração de Status" },
    { value: "ATUALIZOU_DADOS_EMPRESA", label: "Atualização de Dados da Empresa" },
    { value: "ATUALIZOU_VIGENCIA", label: "Atualização de Vigência" },
    { value: "ATUALIZOU_ORCAMENTO", label: "Atualização de Orçamento" },
    { value: "ANEXOU_DOCUMENTO", label: "Anexo de Documento" },
    { value: "REMOVEU_DOCUMENTO", label: "Remoção de Documento" },
    { value: "EXCLUIU", label: "Exclusão" },
  ],
  VIRTUAL_PROCESS_DOCUMENT: [{ value: "BAIXOU_DOCUMENTO", label: "Download de Anexo" }],
  user: [
    { value: "user_created", label: "Criação" },
    { value: "user_updated", label: "Edição" },
    { value: "user_deleted", label: "Exclusão" },
    { value: "user_viewed", label: "Visualização" },
    { value: "users_listed", label: "Listagem" },
    { value: "roles_assigned", label: "Atribuição de Perfil" },
    { value: "roles_removed", label: "Remoção de Perfil" },
    { value: "user_sessions_terminated", label: "Encerramento de Sessões" },
    { value: "password_reset_forced", label: "Redefinição de Senha (forçada)" },
    { value: "certificate_generated", label: "Geração de Certificado" },
    { value: "logo_uploaded", label: "Envio de Logo" },
    { value: "logo_removed", label: "Remoção de Logo" },
    { value: "user_register", label: "Cadastro" },
    { value: "user_login", label: "Login" },
    { value: "user_logout", label: "Logout" },
    { value: "password_changed", label: "Alteração de Senha" },
    { value: "password_reset_requested", label: "Solicitação de Redefinição de Senha" },
    { value: "password_reset_completed", label: "Redefinição de Senha Concluída" },
    { value: "email_verified", label: "Verificação de E-mail" },
    { value: "user_profile_updated", label: "Atualização de Perfil" },
  ],
  role: [
    { value: "role_created", label: "Criação" },
    { value: "role_updated", label: "Edição" },
    { value: "role_deleted", label: "Exclusão" },
    { value: "role_duplicated", label: "Duplicação" },
    { value: "role_viewed", label: "Visualização" },
    { value: "roles_listed", label: "Listagem" },
  ],
  SECURITY: [{ value: "SUSPICIOUS_ACCESS_DETECTED", label: "Acesso Suspeito Detectado" }],
};

/**
 * Opções do Select de Ação. Com um Recurso já escolhido, mostra só as ações
 * daquele módulo (curto, direto). Sem recurso escolhido, mostra tudo junto,
 * com o módulo prefixado no rótulo para não perder o contexto.
 */
export function getActionOptions(resource?: string): FilterOption[] {
  if (resource && ACTION_GROUPS[resource]) {
    return ACTION_GROUPS[resource];
  }
  return Object.entries(ACTION_GROUPS)
    .flatMap(([res, options]) =>
      options.map(opt => ({ value: opt.value, label: `${translateResource(res)} · ${opt.label}` }))
    )
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}
