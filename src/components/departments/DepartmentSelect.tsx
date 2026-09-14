import { AlertTriangle } from 'lucide-react'
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
 *
 * TRÊS ESTADOS EXPLÍCITOS além da lista normal — carregando, erro e vazio —
 * de propósito: um `limit` da consulta acima do teto que o backend aceita já
 * fez este seletor abrir SEM NENHUM item, em silêncio, em toda tela que o
 * usava. Um Select que nunca diz "deu errado" esconde exatamente esse tipo de
 * falha até alguém clicar nele no navegador.
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

/** Sentinelas dos itens informativos — o Radix não aceita `value=""`. */
const NONE = '__none__'
const EMPTY = '__empty__'

export function DepartmentSelect({
  value,
  onChange,
  clearLabel,
  excludeIds,
  placeholder = 'Selecione o departamento',
  disabled,
  id,
}: Props) {
  const { data, isLoading, isError } = useDepartmentOptions()

  const departments = (data?.data ?? []).filter(
    department =>
      // Setor inativo não entra em cadastro NOVO, mas precisa continuar
      // aparecendo quando já é o valor gravado — senão, editar um convênio
      // antigo apagaria o setor dele sem que ninguém pedisse.
      (department.isActive || department.id === value) &&
      !excludeIds?.has(department.id)
  )

  const triggerPlaceholder = isLoading
    ? 'Carregando...'
    : isError
      ? 'Erro ao carregar departamentos'
      : placeholder

  return (
    <Select
      value={value ?? NONE}
      onValueChange={next => onChange(next === NONE ? null : next)}
      // Trigger fica navegável mesmo sem opção nenhuma: é o que deixa o
      // usuário ABRIR o Select e ler por que está vazio, em vez de encarar um
      // campo cinza sem explicação nenhuma.
      disabled={disabled || isLoading}
    >
      <SelectTrigger id={id}>
        <SelectValue placeholder={triggerPlaceholder} />
      </SelectTrigger>
      <SelectContent>
        {isError && (
          <div className="flex items-start gap-2 px-2 py-2 text-xs text-red-600">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Não foi possível carregar os departamentos. Recarregue a página.</span>
          </div>
        )}

        {!isError && !isLoading && departments.length === 0 && (
          <SelectItem value={EMPTY} disabled>
            Nenhum departamento cadastrado
          </SelectItem>
        )}

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
