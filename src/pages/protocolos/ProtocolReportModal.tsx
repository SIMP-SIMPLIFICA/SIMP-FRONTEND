import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileDown, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { protocolService } from "@/lib/api/protocols";
import type { DocumentCategory } from "@/lib/api/protocols";
import { CATEGORY_LABELS, typesForCategory } from "@/lib/protocolTypes";
import { savePdfBlob } from "@/lib/official-documents";

/**
 * Filtros do Relatório de Protocolos (Épico 3 — Fase 2).
 *
 * Pergunta o recorte ANTES de baixar. Sem isto, o relatório sairia sempre
 * completo: num órgão com anos de histórico, um PDF de centenas de páginas que
 * ninguém consegue usar para conferir um período específico.
 *
 * Todos os campos são opcionais de propósito — quem quer o relatório completo
 * apenas confirma sem preencher nada.
 */

const schema = z
  .object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    documentCategory: z.string().optional(),
    type: z.string().optional(),
  })
  // Mesma regra do backend, conferida aqui para o retorno ser imediato.
  .refine(
    data => !data.startDate || !data.endDate || data.startDate <= data.endDate,
    {
      message: "A data inicial não pode ser posterior à data final.",
      path: ["endDate"],
    }
  );

type FormValues = z.input<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProtocolReportModal({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { startDate: "", endDate: "", documentCategory: "", type: "" },
  });

  const category = watch("documentCategory") as DocumentCategory | "";
  const availableTypes = typesForCategory(category);

  async function onSubmit(values: FormValues) {
    setDownloading(true);
    try {
      const blob = await protocolService.downloadReport({
        startDate: values.startDate || undefined,
        endDate: values.endDate || undefined,
        documentCategory: (values.documentCategory as DocumentCategory) || undefined,
        type: values.type || undefined,
      });

      savePdfBlob(blob, `relatorio-protocolos-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast({ title: "Relatório gerado com sucesso." });
      onOpenChange(false);
      reset();
    } catch {
      toast({
        title: "Não foi possível gerar o relatório.",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Relatório de Protocolos</DialogTitle>
          <DialogDescription>
            Escolha o recorte do relatório. Deixe em branco para incluir todos os
            registros.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="startDate">Data inicial</Label>
              <Input id="startDate" type="date" {...register("startDate")} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="endDate">Data final</Label>
              <Input id="endDate" type="date" {...register("endDate")} />
              {errors.endDate && (
                <p className="text-sm text-red-600">{errors.endDate.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="documentCategory">Categoria</Label>
            <select
              id="documentCategory"
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              {...register("documentCategory")}
              onChange={event => {
                setValue("documentCategory", event.target.value);
                // O tipo selecionado pode não existir na nova categoria — limpar
                // evita enviar um filtro que nunca retorna nada.
                setValue("type", "");
              }}
            >
              <option value="">Todas</option>
              <option value="COMUNICACAO">{CATEGORY_LABELS.COMUNICACAO}</option>
              <option value="NORMATIVO">{CATEGORY_LABELS.NORMATIVO}</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="type">Tipo de documento</Label>
            <select
              id="type"
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              {...register("type")}
            >
              <option value="">Todos</option>
              {availableTypes.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
            O relatório sai com QR Code de verificação pública no rodapé de todas
            as páginas.
          </p>
        </form>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={downloading}>
            {downloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            Gerar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
