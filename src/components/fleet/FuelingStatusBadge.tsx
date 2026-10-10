import { Badge } from "@/components/ui/badge";
import { type FleetFueling, LIFECYCLE_LABELS } from "@/lib/api/fleet-fueling";

const TONE: Record<string, string> = {
  draft: "border-slate-300 bg-slate-50 text-slate-600",
  open: "border-emerald-200 bg-emerald-50 text-emerald-700",
  busy: "border-sky-200 bg-sky-50 text-sky-700",
  done: "border-slate-200 bg-slate-100 text-slate-700",
  bad: "border-red-200 bg-red-50 text-red-700",
  stale: "border-amber-200 bg-amber-50 text-amber-800",
};

/**
 * Situação da autorização: rascunho (documento) ou o ciclo operacional depois
 * da emissão — os dois estados são separados de propósito (o PDF emitido não muda).
 */
export function FuelingStatusBadge({ fueling }: { fueling: Pick<FleetFueling, "status" | "lifecycle" | "isExpired"> }) {
  if (fueling.status === "PENDING") {
    return <Badge variant="outline" className={TONE.draft}>Rascunho</Badge>;
  }
  if (fueling.isExpired) {
    return <Badge variant="outline" className={TONE.stale}>Vencida</Badge>;
  }
  const tone =
    fueling.lifecycle === "OPEN"
      ? TONE.open
      : fueling.lifecycle === "IN_USE" || fueling.lifecycle === "AWAITING_REVIEW"
        ? TONE.busy
        : fueling.lifecycle === "BLOCKED" || fueling.lifecycle === "CANCELLED"
          ? TONE.bad
          : fueling.lifecycle === "EXPIRED"
            ? TONE.stale
            : TONE.done;
  return (
    <Badge variant="outline" className={tone}>
      {LIFECYCLE_LABELS[fueling.lifecycle]}
    </Badge>
  );
}
