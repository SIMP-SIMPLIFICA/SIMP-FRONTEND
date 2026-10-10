import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useCreateFleetContract, useUpdateFleetContract } from "@/hooks/useFleetFuelings";
import { FUEL_TYPE_LABELS } from "@/lib/api/fleet";
import { AUTHORIZABLE_FUELS, type AuthorizableFuel, type FleetContract } from "@/lib/api/fleet-fueling";
import { describeFleetError } from "@/lib/fleet-errors";
import { parseDecimal } from "@/lib/fleet-fueling-calc";
import { onlyDigits } from "@/lib/fleet-validation";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data.");

const schema = z
  .object({
    number: z.string().trim().min(1, "Informe o nº do contrato.").max(40),
    supplierName: z.string().trim().min(3, "Informe o fornecedor (posto).").max(160),
    supplierCnpj: z.string().refine(v => onlyDigits(v).length === 14, "O CNPJ tem 14 dígitos."),
    object: z.string().trim().min(3, "Descreva o objeto do contrato.").max(500),
    fuelType: z.enum(AUTHORIZABLE_FUELS as [AuthorizableFuel, ...AuthorizableFuel[]]),
    unitPrice: z.string().refine(v => parseDecimal(v, 4) !== null, "Informe o preço por litro (ex.: 6,19)."),
    totalAmount: z.string().refine(v => parseDecimal(v, 2) !== null, "Informe o valor total do contrato."),
    maxVolumeL: z.string().refine(v => v.trim() === "" || parseDecimal(v, 3) !== null, "Use só números (litros)."),
    commitmentNumber: z.string().trim().max(40),
    startDate: isoDate,
    endDate: isoDate,
  })
  .refine(v => v.startDate <= v.endDate, { message: "O fim da vigência é anterior ao início.", path: ["endDate"] });

type FormValues = z.infer<typeof schema>;

function toFormValues(contract?: FleetContract | null): FormValues {
  const pt = (v: string | null | undefined) => (v ? v.replace(".", ",") : "");
  return {
    number: contract?.number ?? "",
    supplierName: contract?.supplierName ?? "",
    supplierCnpj: contract?.supplierCnpj ?? "",
    object: contract?.object ?? "",
    fuelType: contract?.fuelType ?? "GASOLINA",
    unitPrice: pt(contract?.unitPrice),
    totalAmount: pt(contract?.totalAmount),
    maxVolumeL: pt(contract?.maxVolumeL),
    commitmentNumber: contract?.commitmentNumber ?? "",
    startDate: contract?.startDate ?? "",
    endDate: contract?.endDate ?? "",
  };
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-red-600">{message}</p> : null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract?: FleetContract | null;
}

/** Contrato (ata) de combustível — cadastro mínimo da TASK 3A (D16). */
export function ContractFormDialog({ open, onOpenChange, contract }: Props) {
  const createContract = useCreateFleetContract();
  const updateContract = useUpdateFleetContract();
  const isPending = createContract.isPending || updateContract.isPending;

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toFormValues(contract) });

  useEffect(() => {
    if (open) reset(toFormValues(contract));
  }, [open, contract, reset]);

  async function onSubmit(values: FormValues) {
    const payload = {
      number: values.number,
      supplierName: values.supplierName,
      supplierCnpj: onlyDigits(values.supplierCnpj),
      object: values.object,
      fuelType: values.fuelType,
      unitPrice: parseDecimal(values.unitPrice, 4) ?? "",
      totalAmount: parseDecimal(values.totalAmount, 2) ?? "",
      maxVolumeL: values.maxVolumeL.trim() ? parseDecimal(values.maxVolumeL, 3) : null,
      commitmentNumber: values.commitmentNumber || null,
      startDate: values.startDate,
      endDate: values.endDate,
    };
    try {
      if (contract) {
        await updateContract.mutateAsync({ id: contract.id, data: payload });
        toast({ title: `Contrato nº ${payload.number} atualizado.` });
      } else {
        await createContract.mutateAsync(payload);
        toast({ title: `Contrato nº ${payload.number} cadastrado.` });
      }
      onOpenChange(false);
    } catch (error) {
      toast({ title: describeFleetError(error), variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden p-0 gap-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>{contract ? "Editar contrato" : "Novo contrato de combustível"}</DialogTitle>
          <DialogDescription>
            A autorização de abastecimento usa o preço e o posto deste contrato. O saldo é calculado pelas autorizações emitidas.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col min-h-0 flex-1" onSubmit={handleSubmit(onSubmit)} noValidate>
          <ScrollArea className="flex-1">
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="number">Nº do contrato</Label>
                  <Input id="number" placeholder="012/2026" {...register("number")} />
                  <FieldError message={errors.number?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fuelType">Combustível</Label>
                  <Controller
                    control={control}
                    name="fuelType"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="fuelType" aria-label="Combustível">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AUTHORIZABLE_FUELS.map(fuel => (
                            <SelectItem key={fuel} value={fuel}>
                              {FUEL_TYPE_LABELS[fuel]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="supplierName">Fornecedor (posto)</Label>
                <Input id="supplierName" {...register("supplierName")} />
                <FieldError message={errors.supplierName?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="supplierCnpj">CNPJ do posto</Label>
                <Input id="supplierCnpj" inputMode="numeric" placeholder="00.000.000/0000-00" {...register("supplierCnpj")} />
                <FieldError message={errors.supplierCnpj?.message} />
                <p className="text-xs text-slate-500">É o CNPJ que o cupom fiscal precisa trazer na hora do abastecimento.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="object">Objeto</Label>
                <Input id="object" placeholder="Fornecimento de gasolina comum" {...register("object")} />
                <FieldError message={errors.object?.message} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="unitPrice">Preço por litro (R$)</Label>
                  <Input id="unitPrice" inputMode="decimal" placeholder="6,19" {...register("unitPrice")} />
                  <FieldError message={errors.unitPrice?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="totalAmount">Valor total (R$)</Label>
                  <Input id="totalAmount" inputMode="decimal" {...register("totalAmount")} />
                  <FieldError message={errors.totalAmount?.message} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="maxVolumeL">Volume máximo (L, opcional)</Label>
                  <Input id="maxVolumeL" inputMode="decimal" {...register("maxVolumeL")} />
                  <FieldError message={errors.maxVolumeL?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="commitmentNumber">Nº do empenho (opcional)</Label>
                  <Input id="commitmentNumber" {...register("commitmentNumber")} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="startDate">Início da vigência</Label>
                  <Input id="startDate" type="date" {...register("startDate")} />
                  <FieldError message={errors.startDate?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="endDate">Fim da vigência</Label>
                  <Input id="endDate" type="date" {...register("endDate")} />
                  <FieldError message={errors.endDate?.message} />
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-3 px-6 py-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {contract ? "Salvar" : "Cadastrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
