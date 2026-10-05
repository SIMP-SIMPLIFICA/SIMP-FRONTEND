import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DepartmentSelect } from "@/components/departments/DepartmentSelect";
import { toast } from "@/hooks/use-toast";
import { useCreateFleetVehicle, useUpdateFleetVehicle } from "@/hooks/useFleet";
import {
  type FleetFuelType,
  type FleetOwnership,
  type FleetVehicle,
  type FleetVehicleStatus,
  type FleetVehicleType,
  FUEL_TYPE_LABELS,
  OWNERSHIP_LABELS,
  VEHICLE_STATUS_LABELS,
  VEHICLE_TYPE_LABELS,
} from "@/lib/api/fleet";
import { describeFleetError } from "@/lib/fleet-errors";
import { isValidPlate, isValidRenavam, normalizePlate, onlyDigits, parseDecimalInput } from "@/lib/fleet-validation";

const currentYear = new Date().getFullYear();
const optionalYear = z
  .string()
  .trim()
  .refine(v => v === "" || (/^\d{4}$/.test(v) && Number(v) >= 1950 && Number(v) <= currentYear + 1), "Ano inválido.");

const schema = z
  .object({
    plate: z
      .string()
      .min(1, "Informe a placa.")
      .refine(v => isValidPlate(normalizePlate(v)), "Placa inválida. Use ABC1234 ou ABC1D23."),
    renavam: z
      .string()
      .trim()
      .refine(v => v === "" || isValidRenavam(onlyDigits(v)), "Renavam inválido: confira os 11 dígitos no CRLV."),
    makeModel: z.string().trim().max(120),
    manufactureYear: optionalYear,
    modelYear: optionalYear,
    ownership: z.string(),
    vehicleType: z.string(),
    fuelType: z.string(),
    status: z.string(),
    tankCapacityL: z
      .string()
      .refine(v => parseDecimalInput(v, 3) !== null, "Informe a capacidade do tanque em litros (ex.: 55 ou 55,5)."),
    assetTag: z.string().trim().max(60),
    odometerKm: z.string().trim().refine(v => v === "" || /^\d{1,7}$/.test(v), "Use só números (km)."),
    departmentId: z.string().nullable(),
  })
  .refine(v => !v.manufactureYear || !v.modelYear || Number(v.manufactureYear) <= Number(v.modelYear), {
    message: "O ano de fabricação não pode ser maior que o do modelo.",
    path: ["manufactureYear"],
  })
  // Mesma regra do backend: veículo próprio é bem tombado e tem patrimônio.
  .refine(v => v.ownership !== "PROPRIO" || v.assetTag !== "", {
    message: "Informe o nº de patrimônio: obrigatório para veículo próprio.",
    path: ["assetTag"],
  });

type FormValues = z.infer<typeof schema>;

function toFormValues(vehicle?: FleetVehicle | null): FormValues {
  return {
    plate: vehicle?.plate ?? "",
    renavam: vehicle?.renavam ?? "",
    makeModel: vehicle?.makeModel ?? "",
    manufactureYear: vehicle?.manufactureYear?.toString() ?? "",
    modelYear: vehicle?.modelYear?.toString() ?? "",
    ownership: vehicle?.ownership ?? "PROPRIO",
    vehicleType: vehicle?.vehicleType ?? "AUTOMOVEL",
    fuelType: vehicle?.fuelType ?? "FLEX",
    status: vehicle?.status ?? "EM_USO",
    tankCapacityL: vehicle?.tankCapacityL?.replace(".", ",") ?? "",
    assetTag: vehicle?.assetTag ?? "",
    odometerKm: "",
    departmentId: vehicle?.departmentId ?? null,
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ausente = cadastro novo. */
  vehicle?: FleetVehicle | null;
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-red-600">{message}</p> : null;
}

export function VehicleFormDialog({ open, onOpenChange, vehicle }: Props) {
  const isEdit = Boolean(vehicle);
  const createVehicle = useCreateFleetVehicle();
  const updateVehicle = useUpdateFleetVehicle();
  const isPending = createVehicle.isPending || updateVehicle.isPending;

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toFormValues(vehicle) });
  const assetTagRequired = useWatch({ control, name: "ownership" }) === "PROPRIO";

  useEffect(() => {
    if (open) reset(toFormValues(vehicle));
  }, [open, vehicle, reset]);

  async function onSubmit(values: FormValues) {
    const payload = {
      plate: normalizePlate(values.plate),
      renavam: values.renavam ? onlyDigits(values.renavam) : null,
      makeModel: values.makeModel || null,
      manufactureYear: values.manufactureYear ? Number(values.manufactureYear) : null,
      modelYear: values.modelYear ? Number(values.modelYear) : null,
      ownership: values.ownership as FleetOwnership,
      vehicleType: values.vehicleType as FleetVehicleType,
      fuelType: values.fuelType as FleetFuelType,
      status: values.status as FleetVehicleStatus,
      tankCapacityL: parseDecimalInput(values.tankCapacityL, 3) ?? "",
      assetTag: values.assetTag || null,
      departmentId: values.departmentId,
    };

    try {
      if (vehicle) {
        await updateVehicle.mutateAsync({ id: vehicle.id, data: payload });
        toast({ title: "Veículo atualizado." });
      } else {
        await createVehicle.mutateAsync({
          ...payload,
          ...(values.odometerKm ? { odometerKm: Number(values.odometerKm) } : {}),
        });
        toast({ title: `Veículo ${payload.plate} cadastrado.` });
      }
      onOpenChange(false);
    } catch (error) {
      toast({ title: describeFleetError(error), variant: "destructive" });
    }
  }

  const enumSelect = (
    name: "ownership" | "vehicleType" | "fuelType" | "status",
    label: string,
    labels: Record<string, string>
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger id={name} aria-label={label}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(labels).map(([value, text]) => (
                <SelectItem key={value} value={value}>
                  {text}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden p-0 gap-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>{isEdit ? "Editar veículo" : "Novo veículo"}</DialogTitle>
          <DialogDescription>
            Placa e Renavam são conferidos com o dígito verificador antes de salvar.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col min-h-0 flex-1" onSubmit={handleSubmit(onSubmit)} noValidate>
          <ScrollArea className="flex-1">
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="plate">Placa</Label>
                  <Input
                    id="plate"
                    autoComplete="off"
                    className="font-mono uppercase"
                    placeholder="ABC1D23"
                    {...register("plate")}
                  />
                  <FieldError message={errors.plate?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="renavam">Renavam (opcional)</Label>
                  <Input id="renavam" inputMode="numeric" placeholder="11 dígitos" {...register("renavam")} />
                  <FieldError message={errors.renavam?.message} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="makeModel">Marca / modelo</Label>
                <Input id="makeModel" placeholder="Ex.: Chevrolet Spin 1.8" {...register("makeModel")} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="manufactureYear">Ano de fabricação</Label>
                  <Input id="manufactureYear" inputMode="numeric" {...register("manufactureYear")} />
                  <FieldError message={errors.manufactureYear?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="modelYear">Ano do modelo</Label>
                  <Input id="modelYear" inputMode="numeric" {...register("modelYear")} />
                  <FieldError message={errors.modelYear?.message} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {enumSelect("vehicleType", "Tipo", VEHICLE_TYPE_LABELS)}
                {enumSelect("fuelType", "Combustível", FUEL_TYPE_LABELS)}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {enumSelect("ownership", "Posse", OWNERSHIP_LABELS)}
                {enumSelect("status", "Situação", VEHICLE_STATUS_LABELS)}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="tankCapacityL">Tanque (litros)</Label>
                  <Input id="tankCapacityL" inputMode="decimal" placeholder="55,5" {...register("tankCapacityL")} />
                  <FieldError message={errors.tankCapacityL?.message} />
                </div>
                {!isEdit && (
                  <div className="space-y-1.5">
                    <Label htmlFor="odometerKm">Hodômetro inicial (km)</Label>
                    <Input id="odometerKm" inputMode="numeric" {...register("odometerKm")} />
                    <FieldError message={errors.odometerKm?.message} />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="assetTag">
                  {assetTagRequired ? "Nº de patrimônio" : "Nº de patrimônio (opcional)"}
                </Label>
                <Input id="assetTag" aria-required={assetTagRequired} {...register("assetTag")} />
                <FieldError message={errors.assetTag?.message} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="departmentId">Departamento responsável</Label>
                <Controller
                  control={control}
                  name="departmentId"
                  render={({ field }) => (
                    <DepartmentSelect
                      id="departmentId"
                      value={field.value}
                      onChange={field.onChange}
                      clearLabel="Frota geral (sem departamento)"
                    />
                  )}
                />
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-3 px-6 py-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Salvar" : "Cadastrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
