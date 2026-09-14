import { useState } from "react";
import { BudgetLawSection } from "./BudgetLawSection";
import { QddTab } from "./QddTab";
import { YearSelect } from "./YearSelect";

/**
 * Aba "Orçamento & QDD" do detalhe do departamento (Épico 4, Fase 2).
 *
 * Um exercício SÓ, escolhido aqui e compartilhado pelas duas seções: as leis
 * orçamentárias e as dotações de um mesmo ano precisam aparecer lado a lado,
 * não em dois seletores que podem divergir.
 */

interface Props {
  departmentId: string;
  canWrite: boolean;
}

export function BudgetTab({ departmentId, canWrite }: Props) {
  const [year, setYear] = useState(() => new Date().getFullYear());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Exercício orçamentário</h3>
          <p className="text-xs text-slate-400">
            Leis e dotações abaixo são todas relativas a este ano.
          </p>
        </div>
        <YearSelect value={year} onChange={setYear} />
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-800">Leis Orçamentárias</h3>
        <BudgetLawSection departmentId={departmentId} year={year} canWrite={canWrite} />
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-800">Dotações do QDD</h3>
        <QddTab departmentId={departmentId} year={year} canWrite={canWrite} />
      </section>
    </div>
  );
}
