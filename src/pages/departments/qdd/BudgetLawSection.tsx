import { AlertTriangle, Loader2 } from "lucide-react";
import { useBudgetLaws } from "@/hooks/useBudgetLaws";
import type { BudgetLawType } from "@/lib/api/budget-laws";
import { BudgetLawCard } from "./BudgetLawCard";

const TYPES: BudgetLawType[] = ["LOA", "PPA", "LDO"];

interface Props {
  departmentId: string;
  year: number;
  canWrite: boolean;
}

/** Os três cards de leis orçamentárias, para o exercício escolhido. */
export function BudgetLawSection({ departmentId, year, canWrite }: Props) {
  const { data: laws, isLoading, isError } = useBudgetLaws({ departmentId, year });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50/60 py-10 px-6 text-center">
        <AlertTriangle className="h-6 w-6 text-red-400" />
        <p className="text-sm font-medium text-red-700">
          Não foi possível carregar as leis orçamentárias.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {TYPES.map(type => (
        <BudgetLawCard
          // Chaveado por exercício: trocar o ano REMONTA o card, e é essa
          // remontagem — não um efeito — que faz o formulário nascer com os
          // valores do novo exercício em vez do anterior.
          key={`${type}-${year}`}
          type={type}
          departmentId={departmentId}
          year={year}
          law={laws?.find(l => l.type === type) ?? null}
          canWrite={canWrite}
        />
      ))}
    </div>
  );
}
