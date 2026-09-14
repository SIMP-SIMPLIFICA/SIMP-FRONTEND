import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQddItems } from "@/hooks/useQddItems";
import { formatBRL } from "@/utils/currency";

/**
 * Seletor de ficha orçamentária (Bloco 4 — Controle Orçamentário).
 *
 * Mostra SÓ as fichas do departamento escolhido no Bloco 1 — nunca a lista
 * inteira do município. Sem essa filtragem, nada impediria imputar a despesa
 * de uma secretaria na dotação de outra.
 *
 * Sem `departmentId`, o campo nem consulta a API: fica desabilitado com uma
 * instrução, porque não há universo de fichas para mostrar ainda.
 */

interface Props {
  departmentId: string | null | undefined;
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

/** Sentinela do item "sem ficha vinculada" — o Radix não aceita value vazio. */
const NONE = "__none__";

export function QddItemSelect({ departmentId, value, onChange, disabled }: Props) {
  const { data: items, isLoading } = useQddItems({ departmentId: departmentId ?? undefined });

  if (!departmentId) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Selecione o órgão concedente primeiro" />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select
      value={value ?? NONE}
      onValueChange={next => onChange(next === NONE ? null : next)}
      disabled={disabled || isLoading}
    >
      <SelectTrigger>
        <SelectValue placeholder={isLoading ? "Carregando..." : "Sem dotação vinculada"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>Sem dotação vinculada</SelectItem>
        {items?.map(item => (
          <SelectItem key={item.id} value={item.id}>
            {item.ficha} · {item.naturezaDespesa} · {formatBRL(item.valorOrcado)} ({item.year})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
