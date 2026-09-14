import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDepartmentOptions } from '@/hooks/useDepartments'

/**
 * Seletor de Secretaria/Departamento.
 *
 * Componente próprio porque três telas o usam — convênio, processo virtual e,
 * na Fase 3, o formulário de diária. Repetir a consulta e a formatação do
 * rótulo em cada uma faria as três divergirem com o tempo.
 *
 * Mostra `CÓDIGO - Nome`: numa prefeitura, "Secretaria de Administração" e
 * "Secretaria de Administração e Finanças" só se distinguem com folga pela
 * sigla, e é pela sigla que o servidor conhece o setor.
 */

interface Props {
  value: string | null | undefined
  onChange: (value: string | null) => void
  /** Texto do item que limpa a escolha. Ausente = campo obrigatório. */
  clearLabel?: string
  /** Ids fora da lista — ex: setores já vinculados num diálogo de vínculo. */
  excludeIds?: Set<string>
  placeholder?: string
  disabled?: boolean
  id?: string
}

/** Valor sentinela do item "sem setor": o Radix não aceita `value=""`. */
const NONE = '__none__'

export function DepartmentSelect({
  value,
  onChange,
  clearLabel,
  excludeIds,
  placeholder = 'Selecione o departamento',
  disabled,
  id,
}: Props) {
  const { data, isLoading } = useDepartmentOptions()

  const departments = (data?.data ?? []).filter(
    department =>
      // Setor inativo não entra em cadastro NOVO, mas precisa continuar
      // aparecendo quando já é o valor gravado — senão, editar um convênio
      // antigo apagaria o setor dele sem que ninguém pedisse.
      (department.isActive || department.id === value) &&
      !excludeIds?.has(department.id)
  )

  return (
    <Select
      value={value ?? NONE}
      onValueChange={next => onChange(next === NONE ? null : next)}
      disabled={disabled || isLoading}
    >
      <SelectTrigger id={id}>
        <SelectValue placeholder={isLoading ? 'Carregando...' : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {clearLabel && <SelectItem value={NONE}>{clearLabel}</SelectItem>}
        {departments.map(department => (
          <SelectItem key={department.id} value={department.id}>
            {department.code} - {department.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
