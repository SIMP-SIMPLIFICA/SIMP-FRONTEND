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
import { DepartmentSelect } from "@/components/departments/DepartmentSelect";
import { toast } from "@/hooks/use-toast";
import { useCreateFleetDriver, useUpdateFleetDriver } from "@/hooks/useFleet";
import {
  CNH_CATEGORIES,
  CNH_STATUS_LABELS,
  EMPLOYMENT_KIND_LABELS,
  type DriverInput,
  type FleetCnhCategory,
  type FleetCnhStatus,
  type FleetDriver,
  type FleetEmploymentKind,
} from "@/lib/api/fleet";
import { describeFleetError } from "@/lib/fleet-errors";
import { formatCpfInput, isValidCnhNumber, isValidCpf, onlyDigits } from "@/lib/fleet-validation";

/**
 * Cadastro de motorista. CPF e CNH nunca chegam inteiros do servidor (só a
 * máscara); na edição, os campos ficam vazios e só são enviados se digitados —
 * vazio mantém o valor já cifrado no banco.
 */
function buildSchema(isEdit: boolean) {
  const optionalOnEdit = (validate: (v: string) => boolean) => (v: string) => (isEdit && v === "") || validate(v);
  return z.object({
    name: z.string().trim().min(3, "Informe o nome completo."),
    cpf: z.string().refine(optionalOnEdit(v => isValidCpf(onlyDigits(v))), "CPF inválido. Confira os 11 dígitos."),
    cnhNumber: z
      .string()
      .refine(optionalOnEdit(v => isValidCnhNumber(onlyDigits(v))), "A CNH precisa ter 11 dígitos."),
    cnhCategory: z.string(),
    cnhExpiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a validade da CNH."),
    cnhStatus: z.string(),
    employmentKind: z.string(),
    departmentId: z.string().nullable(),
  });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

function toFormValues(driver?: FleetDriver | null): FormValues {
  return {
    name: driver?.name ?? "",
    cpf: "",
    cnhNumber: "",
    cnhCategory: driver?.cnhCategory ?? "B",
    cnhExpiry: driver?.cnhExpiry ?? "",
    cnhStatus: driver?.cnhStatus ?? "DESCONHECIDA",
    employmentKind: driver?.employmentKind ?? "EFETIVO",
    departmentId: driver?.departmentId ?? null,
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver?: FleetDriver | null;
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-red-600">{message}</p> : null;
}

export function DriverFormDialog({ open, onOpenChange, driver }: Props) {
  const isEdit = Boolean(driver);
  const createDriver = useCreateFleetDriver();
  const updateDriver = useUpdateFleetDriver();
  const isPending = createDriver.isPending || updateDriver.isPending;

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(buildSchema(isEdit)), defaultValues: toFormValues(driver) });

  useEffect(() => {
    if (open) reset(toFormValues(driver));
  }, [open, driver, reset]);

  async function onSubmit(values: FormValues) {
    const base = {
      name: values.name.trim(),
      cnhCategory: values.cnhCategory as FleetCnhCategory,
      cnhExpiry: values.cnhExpiry,
      cnhStatus: values.cnhStatus as FleetCnhStatus,
      employmentKind: values.employmentKind as FleetEmploymentKind,
      departmentId: values.departmentId,
    };
    const cpf = values.cpf ? onlyDigits(values.cpf) : undefined;
    const cnhNumber = values.cnhNumber ? onlyDigits(values.cnhNumber) : undefined;

    try {
      if (driver) {
        await updateDriver.mutateAsync({
          id: driver.id,
          data: { ...base, ...(cpf ? { cpf } : {}), ...(cnhNumber ? { cnhNumber } : {}) },
        });
        toast({ title: "Motorista atualizado." });
      } else {
        const data: DriverInput = { ...base, cpf: cpf ?? "", cnhNumber: cnhNumber ?? "" };
        await createDriver.mutateAsync(data);
        toast({ title: `${base.name} cadastrado.` });
      }
      onOpenChange(false);
    } catch (error) {
      toast({ title: describeFleetError(error), variant: "destructive" });
    }
  }

  const enumSelect = (
    name: "cnhCategory" | "cnhStatus" | "employmentKind",
    label: string,
    options: Record<string, string>
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
              {Object.entries(options).map(([value, text]) => (
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
          <DialogTitle>{isEdit ? "Editar motorista" : "Novo motorista"}</DialogTitle>
          <DialogDescription>
            CPF e CNH são guardados cifrados e só aparecem mascarados nas listas.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col min-h-0 flex-1" onSubmit={handleSubmit(onSubmit)} noValidate>
          <ScrollArea className="flex-1">
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome completo</Label>
                <Input id="name" {...register("name")} />
                <FieldError message={errors.name?.message} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder={driver ? `${driver.cpfMasked} (manter)` : "000.000.000-00"}
                    {...register("cpf", {
                      onChange: e => setValue("cpf", formatCpfInput((e.target as HTMLInputElement).value)),
                    })}
                  />
                  <FieldError message={errors.cpf?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cnhNumber">Nº da CNH</Label>
                  <Input
                    id="cnhNumber"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder={driver ? `${driver.cnhMasked} (manter)` : "11 dígitos"}
                    {...register("cnhNumber")}
                  />
                  <FieldError message={errors.cnhNumber?.message} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {enumSelect("cnhCategory", "Categoria da CNH", Object.fromEntries(CNH_CATEGORIES.map(c => [c, c])))}
                <div className="space-y-1.5">
                  <Label htmlFor="cnhExpiry">Validade da CNH</Label>
                  <Input id="cnhExpiry" type="date" {...register("cnhExpiry")} />
                  <FieldError message={errors.cnhExpiry?.message} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {enumSelect("cnhStatus", "Situação da CNH", CNH_STATUS_LABELS)}
                {enumSelect("employmentKind", "Vínculo", EMPLOYMENT_KIND_LABELS)}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="departmentId">Departamento</Label>
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
