import { useState } from "react";
import { CalendarDays, FileText, Loader2, Pencil, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useUpsertBudgetLaw } from "@/hooks/useBudgetLaws";
import type { BudgetLaw, BudgetLawType } from "@/lib/api/budget-laws";

/**
 * Um card por lei orçamentária (LOA, PPA ou LDO).
 *
 * Edição INLINE, no próprio card — não um modal: são só três campos, e abrir
 * um diálogo para "Lei nº ____" seria cerimônia maior que a tarefa.
 *
 * O backend faz UPSERT: não existe, do ponto de vista desta tela, um estado
 * de "criar" separado de "editar" — o card em branco e o card preenchido usam
 * exatamente o mesmo botão e o mesmo envio.
 */

const LABELS: Record<BudgetLawType, { title: string; description: string }> = {
  LOA: {
    title: "LOA",
    description: "Lei Orçamentária Anual",
  },
  PPA: {
    title: "PPA",
    description: "Plano Plurianual",
  },
  LDO: {
    title: "LDO",
    description: "Lei de Diretrizes Orçamentárias",
  },
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

interface Props {
  type: BudgetLawType;
  departmentId: string;
  year: number;
  law: BudgetLaw | null;
  canWrite: boolean;
}

export function BudgetLawCard({ type, departmentId, year, law, canWrite }: Props) {
  const [editing, setEditing] = useState(false);
  const [lawNumber, setLawNumber] = useState(law?.lawNumber ?? "");
  const [publishedAt, setPublishedAt] = useState(formatDate(law?.publishedAt ?? null));
  const [details, setDetails] = useState(law?.details ?? "");

  const upsertMut = useUpsertBudgetLaw();
  const meta = LABELS[type];

  // Troca de exercício não ressincroniza este estado por efeito — o pai monta
  // o card com `key={type-year}`, então mudar o ano REMONTA o componente e o
  // `useState` acima já nasce com os valores do novo `law`. Uma atualização em
  // segundo plano do MESMO exercício (refetch) não deve apagar uma edição em
  // andamento, e é isso que a ausência de efeito garante.

  async function handleSave() {
    try {
      await upsertMut.mutateAsync({
        departmentId,
        type,
        year,
        lawNumber: lawNumber.trim() || null,
        publishedAt: publishedAt || null,
        details: details.trim() || null,
      });
      setEditing(false);
      toast({ title: `${meta.title} atualizada.` });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : `Não foi possível salvar a ${meta.title}.`;
      toast({ title: "Erro ao salvar", description: message, variant: "destructive" });
    }
  }

  function handleCancel() {
    setLawNumber(law?.lawNumber ?? "");
    setPublishedAt(formatDate(law?.publishedAt ?? null));
    setDetails(law?.details ?? "");
    setEditing(false);
  }

  const isEmpty = !law?.lawNumber && !law?.publishedAt && !law?.details;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
            <ScrollText className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{meta.title}</p>
            <p className="text-[11px] text-slate-400">{meta.description}</p>
          </div>
        </div>
        {canWrite && !editing && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {!editing && (
        isEmpty ? (
          <p className="text-xs text-slate-400 py-1">
            Nenhuma informação cadastrada para {year}.
          </p>
        ) : (
          <div className="space-y-1.5 text-sm">
            {law?.lawNumber && (
              <p className="flex items-center gap-1.5 text-slate-700">
                <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                Lei nº {law.lawNumber}
              </p>
            )}
            {law?.publishedAt && (
              <p className="flex items-center gap-1.5 text-slate-500 text-xs">
                <CalendarDays className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                Publicada em{" "}
                {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" }).format(
                  new Date(law!.publishedAt!)
                )}
              </p>
            )}
            {law?.details && <p className="text-xs text-slate-500">{law.details}</p>}
          </div>
        )
      )}

      {editing && (
        <div className="space-y-2.5">
          <div className="space-y-1">
            <Label className="text-xs">Número da lei</Label>
            <Input
              value={lawNumber}
              onChange={e => setLawNumber(e.target.value)}
              placeholder={`Ex: 1.234/${year}`}
              className="h-8 text-sm"
              disabled={upsertMut.isPending}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Data de publicação</Label>
            <Input
              type="date"
              value={publishedAt}
              onChange={e => setPublishedAt(e.target.value)}
              className="h-8 text-sm"
              disabled={upsertMut.isPending}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Observações</Label>
            <Textarea
              value={details}
              onChange={e => setDetails(e.target.value)}
              rows={2}
              className="text-sm resize-none"
              disabled={upsertMut.isPending}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={upsertMut.isPending}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={upsertMut.isPending}>
              {upsertMut.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Salvar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
