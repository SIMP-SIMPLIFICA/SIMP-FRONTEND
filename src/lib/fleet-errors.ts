/**
 * Mensagens de erro do Simplifica Frotas.
 *
 * O backend já devolve `message` escrita para o usuário (o que aconteceu, o dado
 * concreto e o que fazer); ela é sempre preferida. Os textos abaixo são só o
 * plano B quando a resposta não traz mensagem (ex.: falha de rede).
 */

interface ApiErrorShape {
  error?: string
  message?: string
}

const FALLBACK: Record<string, string> = {
  INVALID_PLATE: 'A placa não é válida. Use o formato antigo (ABC1234) ou Mercosul (ABC1D23).',
  INVALID_RENAVAM: 'O Renavam não é válido. Confira os 11 dígitos no CRLV.',
  INVALID_CPF: 'O CPF não é válido. Confira os 11 dígitos.',
  INVALID_CNH: 'O número da CNH precisa ter 11 dígitos.',
  PLATE_ALREADY_REGISTERED: 'Já existe um veículo ativo com esta placa.',
  RENAVAM_ALREADY_REGISTERED: 'Já existe um veículo ativo com este Renavam.',
  CPF_ALREADY_REGISTERED: 'Este CPF já está cadastrado para outro motorista.',
  ASSET_TAG_REQUIRED: 'Informe o nº de patrimônio: obrigatório para veículo próprio.',
  ASSET_TAG_ALREADY_REGISTERED: 'Este nº de patrimônio já está em outro veículo ativo.',
  REGISTRATION_REQUIRED: 'Informe a matrícula: obrigatória para efetivo e comissionado.',
  REGISTRATION_ALREADY_REGISTERED: 'Esta matrícula já está cadastrada para outro motorista ativo.',
  EXPORT_TOO_LARGE: 'A relação é grande demais para um PDF. Filtre por departamento ou situação.',
  DEPARTMENT_OUT_OF_SCOPE: 'Você só pode cadastrar na frota dos seus departamentos.',
  VEHICLE_IN_USE: 'O veículo tem autorização aberta ou viagem em curso. Encerre-as antes de excluir.',
  DRIVER_IN_USE: 'O motorista tem autorização aberta ou viagem em curso. Encerre-as antes de excluir.',
  PII_KEYS_MISSING: 'O cadastro de motoristas está indisponível no servidor. Avise o administrador do sistema.',
  MODULE_DISABLED: 'O módulo Frota não está habilitado para a sua organização.',
  NOT_FOUND: 'Registro não encontrado. Ele pode ter sido excluído; atualize a página.',
}

export function describeFleetError(error: unknown): string {
  const { error: code, message } = (error ?? {}) as ApiErrorShape
  if (message && code !== 'INTERNAL_SERVER_ERROR') return message
  return (code && FALLBACK[code]) ?? 'Não foi possível concluir a operação. Tente de novo em instantes.'
}
