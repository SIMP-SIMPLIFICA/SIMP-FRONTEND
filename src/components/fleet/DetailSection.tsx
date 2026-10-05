import type { ReactNode } from "react";
import { History } from "lucide-react";

/** Bloco de dados da página de detalhe do Frotas (rótulo/valor em grade). */
export function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`section-${title}`} className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 id={`section-${title}`} className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h2>
      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">{children}</dl>
    </section>
  );
}

export function DetailItem({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  const empty = value === null || value === undefined || value === "";
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className={`mt-1 text-sm ${empty ? "text-slate-400" : "text-slate-800"} ${mono ? "font-mono" : ""}`}>
        {empty ? "—" : value}
      </dd>
    </div>
  );
}

/** Espaço reservado: abastecimentos, viagens e manutenções entram aqui nas próximas TASKs. */
export function HistoryPlaceholder() {
  return (
    <section aria-labelledby="section-historico" className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 id="section-historico" className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Histórico
      </h2>
      <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-8 text-center">
        <History className="mx-auto h-7 w-7 text-slate-300" aria-hidden="true" />
        <p className="mt-2 text-sm font-medium text-slate-700">Nenhum registro ainda</p>
        <p className="mt-1 text-sm text-slate-500">Abastecimentos, viagens e manutenções aparecerão aqui.</p>
      </div>
    </section>
  );
}
