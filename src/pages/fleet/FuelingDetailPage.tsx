import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Ban, FileDown, FileText, Loader2, Pencil, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DetailItem, DetailSection } from "@/components/fleet/DetailSection";
import { FuelingFormDialog } from "@/components/fleet/FuelingFormDialog";
import { FuelingStatusBadge } from "@/components/fleet/FuelingStatusBadge";
import { toast } from "@/hooks/use-toast";
import { useCancelFleetFueling, useDeleteFleetFueling, useFleetFueling, useIssueFleetFueling } from "@/hooks/useFleetFuelings";
import { useMe } from "@/hooks/useMe";
import { FUEL_TYPE_LABELS, VEHICLE_TYPE_LABELS } from "@/lib/api/fleet";
import { fleetFuelingService } from "@/lib/api/fleet-fueling";
import { describeFleetError } from "@/lib/fleet-errors";
import { authorLine, formatIsoDate } from "@/lib/fleet-format";
import { formatBrl, formatLitres, formatUnitPrice } from "@/lib/fleet-fueling-calc";
import { formatPlate } from "@/lib/fleet-validation";
import { savePdfBlob } from "@/lib/official-documents";
import { hasAnyPermission } from "@/lib/permissions";

/** Simplifica Frotas — detalhe da autorização de abastecimento, com o PDF emitido. */
export default function FuelingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: me } = useMe();
  const canAuthorize = hasAnyPermission(me, ["fleet:authorize_fuel"]);
  const { data: fueling, isLoading, isError, error } = useFleetFueling(id);

  // Enquanto o QR ainda libera o posto, o PDF é vale ao portador: só quem emite o vê (o backend também barra).
  const pdfVisible =
    fueling?.status === "ISSUED" && (canAuthorize || !(fueling.lifecycle === "OPEN" || fueling.lifecycle === "IN_USE"));

  const issueFueling = useIssueFleetFueling();
  const deleteFueling = useDeleteFleetFueling();
  const cancelFueling = useCancelFleetFueling();

  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmIssue, setConfirmIssue] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Libera o object URL do PDF ao sair (ou ao trocar de documento).
  useEffect(() => () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
  }, [pdfUrl]);

  /** Cada abertura é um download auditado no servidor: o PDF carrega o QR de uso único. */
  async function showPdf() {
    if (!fueling) return;
    setPdfLoading(true);
    try {
      const blob = await fleetFuelingService.downloadPdf(fueling.id);
      setPdfUrl(URL.createObjectURL(new Blob([blob], { type: "application/pdf" })));
    } catch (err) {
      toast({ title: describeFleetError(err), variant: "destructive" });
    } finally {
      setPdfLoading(false);
    }
  }

  async function downloadPdf() {
    if (!fueling) return;
    try {
      savePdfBlob(
        await fleetFuelingService.downloadPdf(fueling.id),
        `autorizacao-abastecimento-${(fueling.formattedNumber ?? fueling.id).replace("/", "-")}.pdf`
      );
    } catch (err) {
      toast({ title: describeFleetError(err), variant: "destructive" });
    }
  }

  // Recém-emitida (vinda do formulário): o PDF já abre na tela.
  const openPdfOnArrival = (location.state as { showPdf?: boolean } | null)?.showPdf;
  useEffect(() => {
    if (openPdfOnArrival && pdfVisible && !pdfUrl && !pdfLoading) void showPdf();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openPdfOnArrival, pdfVisible]);

  async function handleIssue() {
    if (!fueling) return;
    setConfirmIssue(false);
    try {
      const issued = await issueFueling.mutateAsync(fueling.id);
      toast({ title: `Autorização nº ${issued.formattedNumber} emitida.` });
      for (const warning of issued.warnings.filter(w => w.code === "BUDGET_OVERRUN")) toast({ title: warning.message });
      await showPdf();
    } catch (err) {
      toast({ title: describeFleetError(err), variant: "destructive" });
    }
  }

  async function handleDelete() {
    if (!fueling) return;
    setConfirmDelete(false);
    try {
      await deleteFueling.mutateAsync(fueling.id);
      toast({ title: "Rascunho excluído." });
      navigate("/frota/abastecimentos");
    } catch (err) {
      toast({ title: describeFleetError(err), variant: "destructive" });
    }
  }

  async function handleCancel() {
    if (!fueling) return;
    try {
      await cancelFueling.mutateAsync({ id: fueling.id, reason: cancelReason.trim() });
      toast({ title: `Autorização nº ${fueling.formattedNumber} cancelada. A reserva foi liberada.` });
      setCancelOpen(false);
      setCancelReason("");
    } catch (err) {
      toast({ title: describeFleetError(err), variant: "destructive" });
    }
  }

  const isDraft = fueling?.status === "PENDING";
  const cancellable = fueling?.status === "ISSUED" && fueling.lifecycle === "OPEN";

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <Link to="/frota/abastecimentos" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Voltar para autorizações
      </Link>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white p-10 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Carregando autorização...</span>
        </div>
      )}

      {isError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {describeFleetError(error)}
        </div>
      )}

      {fueling && (
        <>
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl font-semibold text-slate-800">
                  {fueling.formattedNumber ? `Autorização nº ${fueling.formattedNumber}` : "Autorização em rascunho"}
                </h1>
                <FuelingStatusBadge fueling={fueling} />
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {formatPlate(fueling.vehicle.plate)} · {fueling.driver.name} · {fueling.department.name}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isDraft && canAuthorize && (
                <>
                  <Button variant="outline" onClick={() => setEditing(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Button variant="outline" onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="mr-2 h-4 w-4 text-red-600" />
                    Excluir
                  </Button>
                  <Button onClick={() => setConfirmIssue(true)} disabled={issueFueling.isPending}>
                    {issueFueling.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Emitir e gerar PDF
                  </Button>
                </>
              )}
              {pdfVisible && (
                <Button variant="outline" onClick={() => void downloadPdf()}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Baixar PDF
                </Button>
              )}
              {cancellable && canAuthorize && (
                <Button variant="outline" onClick={() => setCancelOpen(true)}>
                  <Ban className="mr-2 h-4 w-4 text-red-600" />
                  Cancelar autorização
                </Button>
              )}
            </div>
          </header>

          {fueling.warnings.length > 0 && (
            <div className="space-y-2">
              {fueling.warnings.map(w => (
                <p key={w.code} role="alert" className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {w.message}
                </p>
              ))}
            </div>
          )}
          {fueling.budgetOverrun && (
            <p className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              A emissão estourou o saldo da ficha QDD. O estouro não bloqueia, mas fica registrado para a contabilidade.
            </p>
          )}

          <DetailSection title="Autorização">
            <DetailItem label="Combustível" value={FUEL_TYPE_LABELS[fueling.fuelType]} />
            <DetailItem label="Litros (máx.)" value={formatLitres(fueling.maxVolumeL)} />
            <DetailItem label="Valor (máx.)" value={formatBrl(fueling.maxAmount)} />
            <DetailItem label="Preço por litro (máx.)" value={formatUnitPrice(fueling.unitPriceCap)} />
            <DetailItem label="Válida até" value={`${formatIsoDate(fueling.validUntilDate)}, 23:59`} />
            <DetailItem label="Finalidade" value={fueling.purpose} />
          </DetailSection>

          <DetailSection title="Veículo e motorista">
            <DetailItem label="Placa" value={formatPlate(fueling.vehicle.plate)} mono />
            <DetailItem label="Modelo" value={fueling.vehicle.makeModel} />
            <DetailItem label="Tipo" value={VEHICLE_TYPE_LABELS[fueling.vehicle.vehicleType]} />
            <DetailItem label="Patrimônio" value={fueling.vehicle.assetTag} mono />
            <DetailItem label="Motorista" value={fueling.driver.name} />
            <DetailItem label="CNH" value={`${fueling.driver.cnhCategory}, válida até ${formatIsoDate(fueling.driver.cnhExpiry)}`} />
          </DetailSection>

          <DetailSection title="Contrato e orçamento">
            <DetailItem label="Contrato" value={fueling.contract ? `Nº ${fueling.contract.number}` : null} />
            <DetailItem label="Posto (fornecedor)" value={fueling.contract?.supplierName} />
            <DetailItem label="Departamento (ordenador)" value={fueling.department.name} />
            <DetailItem label="Ficha" value={fueling.qddFichaSnapshot ?? fueling.qddItem?.ficha} />
            <DetailItem label="Fonte" value={fueling.qddFonteSnapshot ?? fueling.qddItem?.fonte} />
            <DetailItem label="Natureza da despesa" value={fueling.qddNaturezaSnapshot ?? fueling.qddItem?.naturezaDespesa} />
          </DetailSection>

          <DetailSection title="Registro">
            <DetailItem label="Criada" value={authorLine(fueling.createdAt, fueling.createdBy)} />
            <DetailItem label="Emitida" value={fueling.issuedAt ? authorLine(fueling.issuedAt, fueling.issuedBy) : null} />
            <DetailItem label="Código de integridade (SHA-256)" value={fueling.sha256Hash} mono />
            {fueling.lifecycle === "CANCELLED" && (
              <>
                <DetailItem label="Cancelada" value={fueling.cancelledAt ? authorLine(fueling.cancelledAt, fueling.cancelledBy) : null} />
                <DetailItem label="Motivo do cancelamento" value={fueling.cancelReason} />
              </>
            )}
          </DetailSection>

          {pdfVisible && (
            <section aria-labelledby="section-pdf" className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="section-pdf" className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Documento emitido
                </h2>
                {!pdfUrl && (
                  <Button variant="outline" onClick={() => void showPdf()} disabled={pdfLoading}>
                    {pdfLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                    Ver PDF
                  </Button>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-500">
                O QR grande do PDF é de uso único: quem tiver o papel (ou o arquivo) pode abastecer. Entregue só ao motorista.
              </p>
              {pdfUrl && (
                <iframe
                  title={`PDF da autorização ${fueling.formattedNumber}`}
                  src={pdfUrl}
                  className="mt-4 h-[80vh] w-full rounded border border-slate-200"
                />
              )}
            </section>
          )}

          <FuelingFormDialog open={editing} onOpenChange={setEditing} fueling={fueling} />

          <ConfirmDialog
            open={confirmIssue}
            title="Emitir a autorização?"
            description="Depois de emitida, ela não pode ser editada nem excluída: o valor fica reservado na ficha e no contrato até o uso, o vencimento ou o cancelamento."
            confirmLabel="Emitir"
            onConfirm={() => void handleIssue()}
            onCancel={() => setConfirmIssue(false)}
          />
          <ConfirmDialog
            open={confirmDelete}
            title="Excluir o rascunho?"
            description="O rascunho ainda não tem número; nada foi reservado."
            confirmLabel="Excluir"
            onConfirm={() => void handleDelete()}
            onCancel={() => setConfirmDelete(false)}
          />

          <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cancelar a autorização nº {fueling.formattedNumber}?</DialogTitle>
                <DialogDescription>
                  O QR deixa de valer no posto e a reserva volta para a ficha e o contrato. O motivo fica na trilha de auditoria.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5">
                <Label htmlFor="cancelReason">Motivo</Label>
                <Textarea
                  id="cancelReason"
                  rows={3}
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="Ex.: o motorista perdeu o papel no deslocamento"
                />
                <p className="text-xs text-slate-500">Entre 10 e 500 caracteres.</p>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={cancelFueling.isPending}>
                  Voltar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => void handleCancel()}
                  disabled={cancelFueling.isPending || cancelReason.trim().length < 10 || cancelReason.trim().length > 500}
                >
                  {cancelFueling.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Cancelar autorização
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
