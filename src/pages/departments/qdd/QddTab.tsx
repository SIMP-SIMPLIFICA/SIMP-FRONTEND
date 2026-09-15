import { useState } from "react";
import { AlertTriangle, ClipboardList, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Table,
  TableBody,
  TableFooter,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import {
  useCreateQddItem,
  useDeleteQddItem,
  useQddItems,
  useUpdateQddItem,
} from "@/hooks/useQddItems";
import { formatBRL, parseBRL } from "@/utils/currency";
import { QddRow, type QddRowValues } from "./QddRow";
import { BudgetHistoryDialog } from "./BudgetHistoryDialog";

/**
 * QDD — Quadro de Detalhamento da Despesa (Épico 4, Fase 2).
 *
 * Edição EM LINHA, sem modal por ficha: um setor lança dezenas de fichas na
 * abertura do exercício, e um modal por linha transformaria isso em suplício.
 *
 * Estado de edição vive aqui (qual linha está aberta), mas o VALOR digitado
 * vive em cada `QddRow` — uma ficha com erro de validação não pode travar a
 * digitação nas outras.
 */

interface Props {
  departmentId: string;
  /** Exercício escolhido no seletor compartilhado com as Leis Orçamentárias. */
  year: number;
  canWrite: boolean;
}

export function QddTab({ departmentId, year, canWrite }: Props) {
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [historyTarget, setHistoryTarget] = useState<{ id: string; ficha: string } | null>(null);

  const { data: items, isLoading, isError } = useQddItems({ departmentId, year });
  const createMut = useCreateQddItem();
  const updateMut = useUpdateQddItem();
  const deleteMut = useDeleteQddItem();

  const saving = createMut.isPending || updateMut.isPending;

  function clearError(id: string) {
    setRowErrors(current => {
      if (!(id in current)) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  /** Traduz o erro do servidor para a MENSAGEM que aparece na própria linha. */
  function messageFor(err: unknown): string {
    if (err instanceof Error) {
      // O backend já devolve pt-BR pronto (ex: 'Já existe a ficha "0042"...').
      return err.message;
    }
    return "Não foi possível salvar. Tente novamente.";
  }

  async function handleSaveNew(values: QddRowValues) {
    const ficha = values.ficha.trim();
    if (!ficha) {
      setRowErrors(current => ({ ...current, new: "Informe a ficha." }));
      return;
    }
    const valorOrcado = parseBRL(values.valorOrcado);
    if (valorOrcado === null || valorOrcado <= 0) {
      setRowErrors(current => ({ ...current, new: "Informe um valor orçado maior que zero." }));
      return;
    }

    try {
      await createMut.mutateAsync({
        departmentId,
        year,
        ficha,
        fonte: values.fonte.trim(),
        projetoAtividade: values.projetoAtividade.trim(),
        naturezaDespesa: values.naturezaDespesa.trim(),
        valorOrcado,
      });
      clearError("new");
      setEditingId(null);
      toast({ title: "Ficha cadastrada." });
    } catch (err: unknown) {
      // ERRO NA PRÓPRIA LINHA, sem fechar a edição: preserva o que foi
      // digitado, senão corrigir uma ficha duplicada exigiria redigitar tudo.
      setRowErrors(current => ({ ...current, new: messageFor(err) }));
    }
  }

  async function handleSaveExisting(id: string, values: QddRowValues) {
    const valorOrcado = parseBRL(values.valorOrcado);
    if (valorOrcado === null || valorOrcado <= 0) {
      setRowErrors(current => ({ ...current, [id]: "Informe um valor orçado maior que zero." }));
      return;
    }

    // Motivo obrigatório só quando o valor de fato muda (Épico 8, FR-013) —
    // o servidor recusa sem ele; conferir aqui evita a viagem de ida e volta.
    const current = (items ?? []).find(i => i.id === id);
    const isChangingValue = current && valorOrcado !== Number(current.valorOrcado);
    if (isChangingValue && !values.reason.trim()) {
      setRowErrors(prev => ({ ...prev, [id]: "Informe o motivo da alteração do valor orçado." }));
      return;
    }

    try {
      await updateMut.mutateAsync({
        id,
        data: {
          ficha: values.ficha.trim(),
          fonte: values.fonte.trim(),
          projetoAtividade: values.projetoAtividade.trim(),
          naturezaDespesa: values.naturezaDespesa.trim(),
          valorOrcado,
          ...(isChangingValue ? { reason: values.reason.trim() } : {}),
        },
      });
      clearError(id);
      setEditingId(null);
      toast({ title: "Ficha atualizada." });
    } catch (err: unknown) {
      setRowErrors(current => ({ ...current, [id]: messageFor(err) }));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMut.mutateAsync(deleteTarget);
      toast({ title: "Ficha excluída." });
    } catch (err: unknown) {
      // Recusa mais comum: ficha lastreia diária já emitida (409 IN_USE).
      const message = err instanceof Error ? err.message : "Não foi possível excluir a ficha.";
      toast({ title: "Não foi possível excluir", description: message, variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  }

  const total = (items ?? []).reduce((sum, item) => sum + Number(item.valorOrcado), 0);
  const totalUtilizado = (items ?? []).reduce((sum, item) => sum + Number(item.valorUtilizado), 0);
  const totalSaldo = (items ?? []).reduce((sum, item) => sum + Number(item.saldoRestante), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        {canWrite && (
          <Button
            size="sm"
            className="gap-1.5"
            disabled={editingId !== null}
            onClick={() => {
              clearError("new");
              setEditingId("new");
            }}
          >
            <Plus className="h-4 w-4" />
            Nova Ficha
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-14 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando...
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50/60 py-14 px-6 text-center">
          <AlertTriangle className="h-6 w-6 text-red-400" />
          <p className="text-sm font-medium text-red-700">Não foi possível carregar as dotações.</p>
        </div>
      )}

      {!isLoading && !isError && (items?.length ?? 0) === 0 && editingId !== "new" && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 py-14 px-6 text-center">
          <div className="h-11 w-11 rounded-full bg-white border border-slate-200 flex items-center justify-center">
            <ClipboardList className="h-5 w-5 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-700">Nenhuma dotação cadastrada em {year}</p>
          <p className="text-xs text-slate-400 max-w-sm">
            Lance as fichas orçamentárias deste exercício para lastrear as diárias do setor.
          </p>
        </div>
      )}

      {!isError && ((items?.length ?? 0) > 0 || editingId === "new") && (
        <div className="border rounded-xl overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-24">Ficha</TableHead>
                <TableHead className="w-24">Fonte</TableHead>
                <TableHead>Projeto / Atividade</TableHead>
                <TableHead>Natureza da Despesa</TableHead>
                <TableHead className="w-32 text-right">Valor Orçado</TableHead>
                <TableHead className="w-32 text-right">Valor Utilizado</TableHead>
                <TableHead className="w-32 text-right">Saldo Restante</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Linha nova sempre no TOPO: é onde quem lança dezenas de
                  fichas seguidas espera encontrá-la, sem rolar a tabela. */}
              {editingId === "new" && (
                <QddRow
                  item={null}
                  editing
                  saving={createMut.isPending}
                  error={rowErrors.new}
                  canWrite={canWrite}
                  onStartEdit={() => {}}
                  onCancel={() => {
                    clearError("new");
                    setEditingId(null);
                  }}
                  onSave={handleSaveNew}
                />
              )}

              {(items ?? []).map(item => (
                <QddRow
                  // Remonta ao entrar/sair de edição: sem `useEffect` para
                  // ressincronizar estado (o padrão evitado no projeto — ver
                  // `DepartmentFormDialog`), é a troca de `key` que garante
                  // que o formulário nasce com os valores atuais da ficha, e
                  // não com uma digitação anterior descartada.
                  key={`${item.id}:${editingId === item.id}`}
                  item={item}
                  editing={editingId === item.id}
                  saving={saving && editingId === item.id}
                  error={rowErrors[item.id]}
                  canWrite={canWrite}
                  onStartEdit={() => {
                    clearError(item.id);
                    setEditingId(item.id);
                  }}
                  onCancel={() => {
                    clearError(item.id);
                    setEditingId(null);
                  }}
                  onSave={values => handleSaveExisting(item.id, values)}
                  onDelete={() => setDeleteTarget(item.id)}
                  onShowHistory={() => setHistoryTarget({ id: item.id, ficha: item.ficha })}
                />
              ))}
            </TableBody>
            {(items?.length ?? 0) > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4} className="text-sm font-medium text-slate-600">
                    Total orçado em {year}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-slate-900 tabular-nums">
                    {formatBRL(total)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-slate-900 tabular-nums">
                    {formatBRL(totalUtilizado)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-semibold tabular-nums ${totalSaldo < 0 ? "text-red-600" : "text-slate-900"}`}
                  >
                    {formatBRL(totalSaldo)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onCancel={() => setDeleteTarget(null)}
        title="Excluir dotação?"
        description="Esta ação não pode ser desfeita. Fichas que já lastreiam diárias emitidas ou processos vinculados não podem ser excluídas."
        onConfirm={handleDelete}
        confirmLabel="Excluir"
      />

      <BudgetHistoryDialog
        qddItemId={historyTarget?.id ?? null}
        ficha={historyTarget?.ficha ?? ""}
        onClose={() => setHistoryTarget(null)}
      />
    </div>
  );
}
