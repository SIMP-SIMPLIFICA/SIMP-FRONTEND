import { useRef, useState } from "react";
import { Check, Loader2, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatBRL } from "@/utils/currency";
import type { QddItem } from "@/lib/api/qdd-items";

/**
 * Uma linha do QDD, com dois modos: leitura e edição.
 *
 * Estado de edição É LOCAL À LINHA, não global na tabela: uma ficha com erro
 * de validação não pode travar a digitação nas outras, e são dezenas de
 * fichas lançadas de uma vez na abertura do exercício.
 *
 * `Enter` salva, `Esc` descarta — sem botão de confirmação obrigatório, porque
 * a tela existe para lançar rápido.
 */

export interface QddRowValues {
  ficha: string;
  fonte: string;
  projetoAtividade: string;
  naturezaDespesa: string;
  valorOrcado: string; // texto digitado, ainda não convertido
}

const EMPTY: QddRowValues = {
  ficha: "",
  fonte: "",
  projetoAtividade: "",
  naturezaDespesa: "",
  valorOrcado: "",
};

interface Props {
  item: QddItem | null; // null = linha nova, ainda não persistida
  editing: boolean;
  saving: boolean;
  /** Erro do servidor (ex: ficha duplicada), exibido na PRÓPRIA linha. */
  error?: string | null;
  canWrite: boolean;
  onStartEdit: () => void;
  onCancel: () => void;
  onSave: (values: QddRowValues) => void;
  onDelete?: () => void;
}

export function QddRow({
  item,
  editing,
  saving,
  error,
  canWrite,
  onStartEdit,
  onCancel,
  onSave,
  onDelete,
}: Props) {
  const [values, setValues] = useState<QddRowValues>(
    item
      ? {
          ficha: item.ficha,
          fonte: item.fonte,
          projetoAtividade: item.projetoAtividade,
          naturezaDespesa: item.naturezaDespesa,
          valorOrcado: formatBRL(item.valorOrcado).replace("R$", "").trim(),
        }
      : EMPTY
  );
  // Foco no primeiro campo assim que a linha nasce em modo de edição — quem
  // clicou "Editar" ou "Nova Ficha" já quer digitar. `autoFocus` no próprio
  // input bastaria, mas o `ref` permite reaproveitar o elemento se precisar de
  // mais controle depois.
  const firstFieldRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof QddRowValues>(key: K, value: QddRowValues[K]) {
    setValues(current => ({ ...current, [key]: value }));
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      onSave(values);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  }

  if (!editing) {
    return (
      <TableRow className="group">
        <TableCell className="font-mono text-sm text-slate-700">{item?.ficha}</TableCell>
        <TableCell className="font-mono text-sm text-slate-600">{item?.fonte}</TableCell>
        <TableCell className="text-sm text-slate-600 max-w-[220px] truncate" title={item?.projetoAtividade}>
          {item?.projetoAtividade}
        </TableCell>
        <TableCell className="text-sm text-slate-600 max-w-[180px] truncate" title={item?.naturezaDespesa}>
          {item?.naturezaDespesa}
        </TableCell>
        <TableCell className="text-right tabular-nums text-slate-800 font-medium">
          {formatBRL(item?.valorOrcado)}
        </TableCell>
        <TableCell className="text-right">
          {canWrite && (
            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onStartEdit}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-500 hover:text-red-700"
                  onClick={onDelete}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
    <TableRow className="bg-blue-50/40">
      <TableCell className="p-1.5">
        <Input
          ref={firstFieldRef}
          autoFocus
          value={values.ficha}
          onChange={e => set("ficha", e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="0042"
          className="h-8 font-mono text-sm"
          disabled={saving}
        />
      </TableCell>
      <TableCell className="p-1.5">
        <Input
          value={values.fonte}
          onChange={e => set("fonte", e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="1500"
          className="h-8 font-mono text-sm"
          disabled={saving}
        />
      </TableCell>
      <TableCell className="p-1.5">
        <Input
          value={values.projetoAtividade}
          onChange={e => set("projetoAtividade", e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="2.001 - Manutenção da Secretaria"
          className="h-8 text-sm"
          disabled={saving}
        />
      </TableCell>
      <TableCell className="p-1.5">
        <Input
          value={values.naturezaDespesa}
          onChange={e => set("naturezaDespesa", e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="3.3.90.14"
          className="h-8 text-sm"
          disabled={saving}
        />
      </TableCell>
      <TableCell className="p-1.5">
        <Input
          value={values.valorOrcado}
          onChange={e => set("valorOrcado", e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="0,00"
          inputMode="decimal"
          className="h-8 text-right tabular-nums text-sm"
          disabled={saving}
        />
      </TableCell>
      <TableCell className="p-1.5">
        <div className="flex items-center justify-end gap-1">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400 mr-1" />
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-emerald-600 hover:text-emerald-700"
                onClick={() => onSave(values)}
                title="Salvar (Enter)"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-400 hover:text-slate-600"
                onClick={onCancel}
                title="Descartar (Esc)"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
    {/* Linha própria para o erro — uma célula com colSpan DENTRO da linha que
        já tem seis campos duplicaria colunas e quebraria a tabela. */}
    {error && (
      <TableRow className="bg-blue-50/40 hover:bg-blue-50/40">
        <TableCell colSpan={6} className="pt-0 pb-1.5">
          <p className="text-xs text-red-600">{error}</p>
        </TableCell>
      </TableRow>
    )}
    </>
  );
}
