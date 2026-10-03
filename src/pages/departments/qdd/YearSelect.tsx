import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Exercício orçamentário — compartilhado entre a aba de QDD e a de Leis
 * Orçamentárias, para as duas sempre mostrarem o mesmo ano.
 *
 * Janela de dois anos para trás e um para frente: cobre o fechamento do
 * exercício anterior e o planejamento do próximo, sem virar uma lista longa
 * de anos que ninguém vai usar.
 */

interface Props {
  value: number;
  onChange: (year: number) => void;
}

export function YearSelect({ value, onChange }: Props) {
  const current = new Date().getFullYear();
  const years = [current + 1, current, current - 1, current - 2];

  return (
    <Select value={String(value)} onValueChange={v => onChange(Number(v))}>
      <SelectTrigger className="w-28 h-8">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {years.map(year => (
          <SelectItem key={year} value={String(year)}>
            {year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
