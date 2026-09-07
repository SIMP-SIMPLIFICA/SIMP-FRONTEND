import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileCheck2, Loader2, Lock, Save } from "lucide-react";
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
import { useMe } from "@/hooks/useMe";
import { hasPermission } from "@/lib/permissions";
import { type FleetFueling, isIssued } from "@/lib/api/fleet-fuelings";
import {
  useCreateFleetFueling,
  useIssueFleetFueling,
  useUpdateFleetFueling,
} from "@/hooks/useFleetFuelings";
import {
  describeDocumentError,
  formatCurrency,
  toDateInputValue,
} from "@/lib/official-documents";

/**
 * Formulário de Abastecimento (Épico 3, FE.3).
 *
 * Mesmo ciclo das diárias: rascunho editável e documento emitido em somente
 * leitura, porque a emissão publica um hash que não pode divergir do papel.
 */

/** Remove tudo que não é letra ou dígito e sobe para maiúsculas. */
function normalizePlate(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Máscara amigável, idêntica à regra do backend.
 *
 * O formato ANTIGO (ABC1234) ganha hífen para leitura; o MERCOSUL (ABC1D23) é
 * escrito sem separador. Aplicar hífen aos dois deixaria a placa Mercosul com
 * uma marca que ela não tem na chapa.
 */
function maskPlate(value: string): string {
  const clean = normalizePlate(value).slice(0, 7);

  // Só insere o hífen quando os 4 caracteres finais forem todos dígitos, que é
  // o que distingue o formato antigo do Mercosul.
  if (clean.length === 7 && /^[A-Z]{3}\d{4}$/.test(clean)) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }
  return clean;
}

const PLATE_OLD = /^[A-Z]{3}\d{4}$/;
const PLATE_MERCOSUR = /^[A-Z]{3}\d[A-Z]\d{2}$/;

const schema = z.object({
  licensePlate: z
    .string()
    .trim()
    .min(1, "Informe a placa do veículo.")
    .transform(normalizePlate)
    .refine(plate => PLATE_OLD.test(plate) || PLATE_MERCOSUR.test(plate), {
      message: "Placa inválida. Use ABC-1234 (antigo) ou ABC1D23 (Mercosul).",
    }),
  odometer: z.coerce
    .number({ invalid_type_error: "Informe um número." })
    .int("O odômetro deve ser um número inteiro.")
    .nonnegative("O odômetro não pode ser negativo."),
  liters: z.coerce
    .number({ invalid_type_error: "Informe um número." })
    .positive("A quantidade de litros deve ser maior que zero."),
  totalValue: z.coerce
    .number({ invalid_type_error: "Informe um valor." })
    .positive("O valor total deve ser maior que zero."),
  date: z.string().min(1, "Informe a data do abastecimento."),
});

type FormValues = z.input<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fueling?: FleetFueling | null;
}

const EMPTY: FormValues = {
  licensePlate: "",
  odometer: "" as unknown as number,
  liters: "" as unknown as number,
  totalValue: "" as unknown as number,
  date: "",
};

export function FleetFuelingForm({ open, onOpenChange, fueling }: Props) {
  const { toast } = useToast();
  const { data: me } = useMe(true);

  const create = useCreateFleetFueling();
  const update = useUpdateFleetFueling();
  const issue = useIssueFleetFueling();

  const readOnly = Boolean(fueling && isIssued(fueling));
  const canIssue = hasPermission(me, "fleetFuelings:issue");
  const canWrite = hasPermission(me, "fleetFuelings:write");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    reset(
      fueling
        ? {
            licensePlate: maskPlate(fueling.licensePlate),
            odometer: fueling.odometer as unknown as number,
            liters: Number(fueling.liters) as unknown as number,
            totalValue: Number(fueling.totalValue) as unknown as number,
            date: toDateInputValue(fueling.date),
          }
        : EMPTY
    );
  }, [fueling, reset]);

  // Prévia do preço por litro — o mesmo número que sai impresso no relatório.
  const liters = Number(watch("liters")) || 0;
  const totalValue = Number(watch("totalValue")) || 0;
  const preview = liters > 0 ? totalValue / liters : 0;

  const saving = create.isPending || update.isPending;
  const issuing = issue.isPending;

  async function persist(values: FormValues): Promise<string | null> {
    const payload = {
      licensePlate: normalizePlate(String(values.licensePlate)),
      odometer: Number(values.odometer),
      liters: Number(values.liters),
      totalValue: Number(values.totalValue),
      date: String(values.date),
    };

    if (fueling) {
      await update.mutateAsync({ id: fueling.id, data: payload });
      return fueling.id;
    }
    const created = await create.mutateAsync(payload);
    return created.id;
  }

  async function onSaveDraft(values: FormValues) {
    try {
      await persist(values);
      toast({ title: "Rascunho salvo." });
      onOpenChange(false);
    } catch (error) {
      toast({ title: describeDocumentError(error), variant: "destructive" });
    }
  }

  async function onIssue(values: FormValues) {
    const confirmed = window.confirm(
      "Emitir o relatório oficial?\n\n" +
        "Depois de emitido, o abastecimento NÃO poderá mais ser alterado nem " +
        "excluído, e o comprovante passará a valer para conferência pública."
    );
    if (!confirmed) return;

    try {
      const id = await persist(values);
      if (!id) return;

      await issue.mutateAsync(id);
      toast({ title: "Relatório emitido com sucesso." });
      onOpenChange(false);
    } catch (error) {
      toast({ title: describeDocumentError(error), variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {readOnly
              ? "Abastecimento emitido"
              : fueling
                ? "Editar rascunho de abastecimento"
                : "Novo abastecimento"}
          </DialogTitle>
          <DialogDescription>
            {readOnly
              ? "Este documento já foi emitido e não pode ser alterado."
              : "Registre o abastecimento para a prestação de contas da frota."}
          </DialogDescription>
        </DialogHeader>

        {readOnly && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Documento oficial em modo somente leitura. Para corrigir alguma
              informação, registre um novo abastecimento.
            </span>
          </div>
        )}

        <form className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="licensePlate">Placa do veículo</Label>
            <Input
              id="licensePlate"
              placeholder="ABC-1234 ou ABC1D23"
              maxLength={8}
              disabled={readOnly}
              {...register("licensePlate")}
              onChange={event =>
                setValue("licensePlate", maskPlate(event.target.value), {
                  shouldValidate: false,
                })
              }
            />
            <p className="text-xs text-slate-500">
              Aceita o formato antigo e o Mercosul.
            </p>
            {errors.licensePlate && (
              <p className="text-sm text-red-600">{errors.licensePlate.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="date">Data do abastecimento</Label>
              <Input id="date" type="date" disabled={readOnly} {...register("date")} />
              {errors.date && <p className="text-sm text-red-600">{errors.date.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="odometer">Odômetro (km)</Label>
              <Input
                id="odometer"
                type="number"
                min="0"
                step="1"
                placeholder="45000"
                disabled={readOnly}
                {...register("odometer")}
              />
              {errors.odometer && (
                <p className="text-sm text-red-600">{errors.odometer.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="liters">Litros</Label>
              <Input
                id="liters"
                type="number"
                step="0.001"
                min="0"
                placeholder="42,500"
                disabled={readOnly}
                {...register("liters")}
              />
              {errors.liters && (
                <p className="text-sm text-red-600">{errors.liters.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="totalValue">Valor total</Label>
              <Input
                id="totalValue"
                type="number"
                step="0.01"
                min="0"
                placeholder="297,50"
                disabled={readOnly}
                {...register("totalValue")}
              />
              {errors.totalValue && (
                <p className="text-sm text-red-600">{errors.totalValue.message}</p>
              )}
            </div>
          </div>

          <div className="rounded-md bg-slate-50 px-3 py-2.5">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Preço por litro
            </p>
            <p className="text-lg font-semibold text-slate-800">
              {formatCurrency(preview)}
            </p>
          </div>
        </form>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {readOnly ? "Fechar" : "Cancelar"}
          </Button>

          {!readOnly && canWrite && (
            <Button
              variant="outline"
              onClick={handleSubmit(onSaveDraft)}
              disabled={saving || issuing}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar Rascunho
            </Button>
          )}

          {!readOnly && canIssue && (
            <Button onClick={handleSubmit(onIssue)} disabled={saving || issuing}>
              {issuing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileCheck2 className="mr-2 h-4 w-4" />
              )}
              Emitir Documento Oficial
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
