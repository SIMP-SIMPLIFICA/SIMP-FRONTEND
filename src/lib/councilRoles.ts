import type { CouncilMemberRole } from '@/lib/api/councils'

/**
 * Rótulos dos cargos de conselho.
 *
 * Os VALORES do enum no banco permanecem inalterados (MEMBRO_TITULAR,
 * MEMBRO_SUPLENTE) — aqui muda apenas como são exibidos, o que evita uma
 * migration com atualização de registros existentes.
 *
 * Fonte única: antes estava duplicado em CouncilDetailPage e EditMemberModal, e
 * o PDF do calendário seria a terceira cópia.
 */
export const COUNCIL_ROLE_LABELS: Record<CouncilMemberRole, string> = {
  PRESIDENTE:      'Presidente',
  VICE_PRESIDENTE: 'Vice-Presidente',
  SECRETARIO:      'Secretário(a)',
  MEMBRO_TITULAR:  'Conselheiro(a)',
  MEMBRO_SUPLENTE: 'Suplente',
}

/** Cargos que compõem a Mesa Diretora (assinam o calendário oficial). */
export const MESA_DIRETORA_ROLES: CouncilMemberRole[] = [
  'PRESIDENTE',
  'VICE_PRESIDENTE',
  'SECRETARIO',
]
