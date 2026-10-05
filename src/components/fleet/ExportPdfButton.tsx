import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { describeFleetError } from "@/lib/fleet-errors";
import { savePdfBlob } from "@/lib/official-documents";

interface Props {
  /** Gera o PDF no servidor (POST com filtros no corpo). */
  onExport: () => Promise<Blob>;
  fileName: string;
  label?: string;
  disabled?: boolean;
  /** Motivo exibido quando desabilitado (title + texto para leitor de tela). */
  disabledReason?: string;
  variant?: "default" | "outline";
}

/**
 * Botão "Exportar PDF" do Frotas. O documento sai pelo motor autenticado do
 * backend (QR Code + hash + registro de validação); aqui só baixamos o blob.
 */
export function ExportPdfButton({
  onExport,
  fileName,
  label = "Exportar PDF",
  disabled,
  disabledReason,
  variant = "outline",
}: Props) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      savePdfBlob(await onExport(), fileName);
    } catch (error) {
      toast({ title: describeFleetError(error), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      onClick={() => void handleClick()}
      disabled={disabled || busy}
      title={disabled ? disabledReason : undefined}
      aria-busy={busy}
    >
      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
      {busy ? "Gerando PDF..." : label}
      {disabled && disabledReason && <span className="sr-only"> ({disabledReason})</span>}
    </Button>
  );
}
