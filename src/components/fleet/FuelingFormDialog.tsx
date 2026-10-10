import { useEffect, useMemo, useRef } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, Info, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  useCreateFleetFueling,
  useFuelingDepartments,
  useFuelingOptions,
  useFuelingSuggestions,
  useIssueFleetFueling,
  useUpdateFleetFueling,
} from "@/hooks/useFleetFuelings";
import { FUEL_TYPE_LABELS } from "@/lib/api/fleet";
import type { AuthorizableFuel, FleetFueling, FuelingInput } from "@/lib/api/fleet-fueling";
import { describeFleetError } from "@/lib/fleet-errors";
import { formatIsoDate } from "@/lib/fleet-format";
import {
  cnhCovers,
  decimalGreaterThan,
  formatBrl,
  formatLitres,
  formatUnitPrice,
  parseDecimal,
  previewAmount,
  previewLitres,
} from "@/lib/fleet-fueling-calc";
import { formatPlate } from "@/lib/fleet-validation";

/**
 * Nova autorização de abastecimento (TASK 3A + smart fields da TASK 7).
 *
 * Encadeamento: departamento → lista de veículos e motoristas dele e da frota
 * geral; veículo → combustível, motorista habitual, contrato vigente e preço;
 * litros × preço → valor máximo (ou valor ÷ preço → litros). Os cálculos aqui
 * são só pré-visualização: o servidor recalcula e decide (D2). Avisos (tanque,
 * autorização aberta, ficha sem saldo) não bloqueiam; regras (CNH, combustível,
 * contrato) o servidor recusa com mensagem orientadora.
 */

const schema = z
  .object({
    departmentId: z.string().min(1, "Escolha o departamento que ordena a despesa."),
    vehicleId: z.string().min(1, "Escolha o veículo."),
    driverId: z.string().min(1, "Escolha o motorista."),
    fuelType: z.string().min(1, "Escolha o combustível."),
    contractId: z.string(),
    qddItemId: z.string(),
    unitPriceCap: z.string().refine(v => parseDecimal(v, 4) !== null, "Informe o preço por litro (ex.: 6,19)."),
    maxVolumeL: z.string(),
    maxAmount: z.string(),
    /** Qual limite o usuário digitou: o outro é calculado (aqui na tela e, de verdade, no servidor). */
    limitSource: z.enum(["volume", "amount"]),
    validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a validade."),
    purpose: z
      .string()
      .trim()
      .min(15, "Descreva a finalidade com pelo menos 15 caracteres (destino e motivo).")
      .max(500, "A finalidade pode ter até 500 caracteres."),
  })
  .refine(v => parseDecimal(v.maxVolumeL, 3) !== null || parseDecimal(v.maxAmount, 2) !== null, {
    message: "Informe os litros ou o valor máximo.",
    path: ["maxVolumeL"],
  });

type FormValues = z.infer<typeof schema>;

const pt = (v: string | null | undefined) => (v ? v.replace(".", ",") : "");

function toFormValues(fueling?: FleetFueling | null): FormValues {
  return {
    departmentId: fueling?.departmentId ?? "",
    vehicleId: fueling?.vehicleId ?? "",
    driverId: fueling?.driverId ?? "",
    fuelType: fueling?.fuelType ?? "",
    contractId: fueling?.contractId ?? "",
    qddItemId: fueling?.qddItemId ?? "",
    unitPriceCap: pt(fueling?.unitPriceCap),
    maxVolumeL: pt(fueling?.maxVolumeL),
    maxAmount: "",
    limitSource: "volume",
    validUntil: fueling?.validUntilDate ?? "",
    purpose: fueling?.purpose ?? "",
  };
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-red-600">{message}</p> : null;
}

function Notice({ tone, children }: { tone: "warning" | "info"; children: React.ReactNode }) {
  const Icon = tone === "warning" ? AlertTriangle : Info;
  return (
    <p
      role={tone === "warning" ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-md px-3 py-2 text-sm ${
        tone === "warning" ? "bg-amber-50 text-amber-800" : "bg-sky-50 text-sky-800"
      }`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Rascunho a editar. Ausente = nova autorização. */
  fueling?: FleetFueling | null;
  /** Depois de salvar (e, se pedido, emitir). */
  onSaved?: (fueling: FleetFueling, issued: boolean) => void;
}

export function FuelingFormDialog({ open, onOpenChange, fueling, onSaved }: Props) {
  const createFueling = useCreateFleetFueling();
  const updateFueling = useUpdateFleetFueling();
  const issueFueling = useIssueFleetFueling();
  const isPending = createFueling.isPending || updateFueling.isPending || issueFueling.isPending;

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toFormValues(fueling) });

  /** Veículo cujas sugestões já foram aplicadas — não sobrescrever o que o usuário mudou depois. */
  const appliedVehicle = useRef<string | null>(fueling?.vehicleId ?? null);

  useEffect(() => {
    if (!open) return;
    reset(toFormValues(fueling));
    appliedVehicle.current = fueling?.vehicleId ?? null;
  }, [open, fueling, reset]);

  const values = useWatch({ control });
  const limitSource = values.limitSource ?? "volume";
  const departmentId = values.departmentId || undefined;
  const vehicleId = values.vehicleId || undefined;

  const departmentsQuery = useFuelingDepartments();
  const optionsQuery = useFuelingOptions(departmentId);
  const suggestionsQuery = useFuelingSuggestions(departmentId, vehicleId);
  const departments = useMemo(() => departmentsQuery.data?.data ?? [], [departmentsQuery.data]);
  const options = optionsQuery.data;
  const suggestions = suggestionsQuery.data;

  // Um só departamento no escopo: já vem escolhido.
  useEffect(() => {
    if (open && !fueling && !getValues("departmentId") && departments.length === 1) {
      setValue("departmentId", departments[0].id);
    }
  }, [open, fueling, departments, getValues, setValue]);

  // Validade padrão (3 dias úteis, calculada no servidor com os feriados).
  useEffect(() => {
    if (!open || fueling || !options) return;
    if (!getValues("validUntil")) setValue("validUntil", options.defaultValidUntil);
  }, [open, fueling, options, getValues, setValue]);

  // Ficha única do departamento: valor DERIVADO (não setValue por efeito) — o
  // Select do Radix descarta um valor gravado no mesmo ciclo em que as opções chegam.
  const soleQddItemId = options?.qddItems.length === 1 ? options.qddItems[0].id : "";
  const effectiveQddItemId = values.qddItemId || soleQddItemId;

  const vehicle = options?.vehicles.find(v => v.id === values.vehicleId);
  const driver = options?.drivers.find(d => d.id === values.driverId);
  const contract = options?.contracts.find(c => c.id === values.contractId);
  const qddItem = options?.qddItems.find(q => q.id === effectiveQddItemId);
  const fuelChoices = vehicle?.compatibleFuels ?? [];

  // Smart fields ao escolher o veículo: combustível, motorista habitual, contrato e preço.
  useEffect(() => {
    if (!suggestions || !vehicleId || appliedVehicle.current === vehicleId || !options) return;
    appliedVehicle.current = vehicleId;
    if (suggestions.suggestedFuelType) setValue("fuelType", suggestions.suggestedFuelType, { shouldValidate: true });
    const habitual = options.drivers.find(d => d.id === suggestions.habitualDriverId);
    if (habitual && !habitual.ineligibleReason) setValue("driverId", habitual.id, { shouldValidate: true });
    if (suggestions.suggestedContractId) setValue("contractId", suggestions.suggestedContractId);
    if (suggestions.suggestedUnitPrice) setValue("unitPriceCap", pt(suggestions.suggestedUnitPrice), { shouldValidate: true });
  }, [suggestions, vehicleId, options, setValue]);

  function onFuelChange(fuel: string) {
    setValue("fuelType", fuel, { shouldValidate: true });
    const match = options?.contracts.find(c => c.fuelType === fuel);
    setValue("contractId", match?.id ?? "");
    if (match?.unitPrice) setValue("unitPriceCap", pt(match.unitPrice), { shouldValidate: true });
  }

  function onContractChange(id: string) {
    setValue("contractId", id);
    const chosen = options?.contracts.find(c => c.id === id);
    if (chosen?.unitPrice) setValue("unitPriceCap", pt(chosen.unitPrice), { shouldValidate: true });
  }

  // ── Pré-visualização dos limites ──
  const computedAmount = limitSource === "volume" ? previewAmount(values.maxVolumeL ?? "", values.unitPriceCap ?? "") : null;
  const computedLitres = limitSource === "amount" ? previewLitres(values.maxAmount ?? "", values.unitPriceCap ?? "") : null;
  const effectiveLitres = limitSource === "volume" ? parseDecimal(values.maxVolumeL ?? "", 3) : computedLitres;
  const effectiveAmount = limitSource === "volume" ? computedAmount : parseDecimal(values.maxAmount ?? "", 2);

  const tankExceeded = Boolean(vehicle && effectiveLitres && decimalGreaterThan(effectiveLitres, vehicle.tankCapacityL));
  const budgetShort = Boolean(
    qddItem?.saldoRestante && effectiveAmount && decimalGreaterThan(effectiveAmount, qddItem.saldoRestante)
  );
  const contractShort = Boolean(contract && effectiveAmount && decimalGreaterThan(effectiveAmount, contract.availableAmount));
  const priceAboveContract = Boolean(
    contract?.unitPrice && parseDecimal(values.unitPriceCap ?? "", 4) && decimalGreaterThan(parseDecimal(values.unitPriceCap ?? "", 4) as string, contract.unitPrice)
  );
  const cnhExpiresFirst = Boolean(driver && values.validUntil && driver.cnhExpiry < values.validUntil);
  const driverCategoryMismatch = Boolean(driver && vehicle && !cnhCovers(driver.cnhCategory, vehicle.requiredCnhCategory));
  const openAuthorization = suggestions?.openAuthorization;

  function toPayload(form: FormValues): FuelingInput {
    return {
      departmentId: form.departmentId,
      vehicleId: form.vehicleId,
      driverId: form.driverId,
      fuelType: form.fuelType as AuthorizableFuel,
      contractId: form.contractId || null,
      qddItemId: form.qddItemId || soleQddItemId || null,
      unitPriceCap: parseDecimal(form.unitPriceCap, 4) ?? "",
      // Só a grandeza digitada vai: o servidor calcula a outra.
      maxVolumeL: form.limitSource === "volume" ? parseDecimal(form.maxVolumeL, 3) : null,
      maxAmount: form.limitSource === "amount" ? parseDecimal(form.maxAmount, 2) : null,
      validUntil: form.validUntil,
      purpose: form.purpose.trim(),
    };
  }

  async function save(form: FormValues, andIssue: boolean) {
    try {
      const payload = toPayload(form);
      let saved = fueling
        ? await updateFueling.mutateAsync({ id: fueling.id, data: payload })
        : await createFueling.mutateAsync(payload);
      if (andIssue) {
        saved = await issueFueling.mutateAsync(saved.id);
        toast({ title: `Autorização nº ${saved.formattedNumber} emitida.` });
      } else {
        toast({ title: "Rascunho salvo. Ele pode ser editado até a emissão." });
      }
      for (const warning of saved.warnings.filter(w => w.code === "BUDGET_OVERRUN")) {
        toast({ title: warning.message });
      }
      onOpenChange(false);
      onSaved?.(saved, andIssue);
    } catch (error) {
      toast({ title: describeFleetError(error), variant: "destructive" });
    }
  }

  const selectField = (
    name: "departmentId" | "vehicleId" | "driverId" | "contractId" | "qddItemId",
    label: string,
    placeholder: string,
    items: Array<{ value: string; label: string; disabledReason?: string | null }>,
    onChange?: (value: string) => void,
    fallbackValue = ""
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select value={field.value || fallbackValue || undefined} onValueChange={onChange ?? field.onChange}>
            <SelectTrigger id={name} aria-label={label}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {items.length === 0 && (
                <SelectItem value="__empty__" disabled>
                  Nenhuma opção disponível
                </SelectItem>
              )}
              {items.map(item => (
                <SelectItem key={item.value} value={item.value} disabled={Boolean(item.disabledReason)}>
                  {item.label}
                  {item.disabledReason ? ` — ${item.disabledReason}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      <FieldError message={errors[name]?.message} />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-hidden p-0 gap-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>{fueling ? "Editar rascunho da autorização" : "Nova autorização de abastecimento"}</DialogTitle>
          <DialogDescription>
            Ao emitir, a autorização recebe número, PDF com QR de uso único para o posto e reserva o valor na ficha e no contrato.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col min-h-0 flex-1" noValidate onSubmit={handleSubmit(form => save(form, false))}>
          <ScrollArea className="flex-1">
            <div className="px-6 py-5 space-y-4">
              {selectField(
                "departmentId",
                "Departamento que ordena",
                departmentsQuery.isLoading ? "Carregando..." : "Selecione o departamento",
                departments.map(d => ({ value: d.id, label: d.code ? `${d.code} - ${d.name}` : d.name }))
              )}
              {departmentsQuery.isSuccess && departments.length === 0 && (
                <Notice tone="warning">
                  Você não faz parte de nenhum departamento. Peça ao administrador para incluí-lo no departamento que ordena o abastecimento.
                </Notice>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  {selectField(
                    "vehicleId",
                    "Veículo",
                    departmentId ? "Selecione o veículo" : "Escolha o departamento primeiro",
                    (options?.vehicles ?? []).map(v => ({
                      value: v.id,
                      label: `${formatPlate(v.plate)} · ${v.makeModel ?? "sem modelo"}`,
                      disabledReason: v.unavailableReason,
                    }))
                  )}
                  {vehicle && (
                    <p className="mt-1 text-xs text-slate-500">
                      {FUEL_TYPE_LABELS[vehicle.fuelType]} · tanque de {formatLitres(vehicle.tankCapacityL)}
                    </p>
                  )}
                </div>
                <div>
                  {selectField(
                    "driverId",
                    "Motorista",
                    departmentId ? "Selecione o motorista" : "Escolha o departamento primeiro",
                    (options?.drivers ?? []).map(d => ({
                      value: d.id,
                      label: `${d.name} · CNH ${d.cnhCategory}`,
                      disabledReason:
                        d.ineligibleReason ??
                        (vehicle && !cnhCovers(d.cnhCategory, vehicle.requiredCnhCategory)
                          ? `exige CNH ${vehicle.requiredCnhCategory}`
                          : null),
                    }))
                  )}
                  {driver && (
                    <p className="mt-1 text-xs text-slate-500">
                      CNH {driver.cnhCategory} válida até {formatIsoDate(driver.cnhExpiry)}
                    </p>
                  )}
                </div>
              </div>

              {openAuthorization && <Notice tone="warning">{openAuthorization.message}</Notice>}
              {driverCategoryMismatch && vehicle && (
                <Notice tone="warning">Este veículo exige CNH categoria {vehicle.requiredCnhCategory}. Escolha outro motorista.</Notice>
              )}
              {cnhExpiresFirst && driver && (
                <Notice tone="warning">
                  A CNH de {driver.name} vence em {formatIsoDate(driver.cnhExpiry)}, antes do fim da validade da autorização.
                </Notice>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="fuelType">Combustível</Label>
                  <Controller
                    control={control}
                    name="fuelType"
                    render={({ field }) => (
                      <Select value={field.value || undefined} onValueChange={onFuelChange} disabled={!vehicle}>
                        <SelectTrigger id="fuelType" aria-label="Combustível">
                          <SelectValue placeholder={vehicle ? "Selecione" : "Escolha o veículo primeiro"} />
                        </SelectTrigger>
                        <SelectContent>
                          {fuelChoices.map(fuel => (
                            <SelectItem key={fuel} value={fuel}>
                              {FUEL_TYPE_LABELS[fuel]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError message={errors.fuelType?.message} />
                </div>
                {selectField(
                  "contractId",
                  "Contrato",
                  "Selecione o contrato",
                  (options?.contracts ?? [])
                    .filter(c => !values.fuelType || c.fuelType === values.fuelType)
                    .map(c => ({ value: c.id, label: `Nº ${c.number} · ${c.supplierName} · ${formatUnitPrice(c.unitPrice)}/L` })),
                  onContractChange
                )}
              </div>
              {options && values.fuelType && !options.contracts.some(c => c.fuelType === values.fuelType) && (
                <Notice tone="warning">
                  Não há contrato vigente de {FUEL_TYPE_LABELS[values.fuelType as AuthorizableFuel]}. O rascunho pode ser salvo, mas só é emitido com contrato.
                </Notice>
              )}
              {contract && <p className="text-xs text-slate-500">Saldo do contrato: {formatBrl(contract.availableAmount)}</p>}
              {contractShort && contract && (
                <Notice tone="warning">
                  O valor máximo passa do saldo do contrato ({formatBrl(contract.availableAmount)}). A emissão será recusada: reduza os litros.
                </Notice>
              )}

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="unitPriceCap">Preço por litro (R$)</Label>
                  <Input id="unitPriceCap" inputMode="decimal" placeholder="6,19" {...register("unitPriceCap")} />
                  <FieldError message={errors.unitPriceCap?.message} />
                  {priceAboveContract && <p className="text-sm text-red-600">Acima do preço do contrato.</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="maxVolumeL">Litros (máx.)</Label>
                  <Input
                    id="maxVolumeL"
                    inputMode="decimal"
                    placeholder={computedLitres ? computedLitres.replace(".", ",") : "40"}
                    {...register("maxVolumeL", {
                      onChange: () => {
                        setValue("limitSource", "volume");
                        setValue("maxAmount", "");
                      },
                    })}
                  />
                  <FieldError message={errors.maxVolumeL?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="maxAmount">Valor (máx.)</Label>
                  <Input
                    id="maxAmount"
                    inputMode="decimal"
                    placeholder={computedAmount ? formatBrl(computedAmount) : "R$"}
                    {...register("maxAmount", {
                      onChange: () => {
                        setValue("limitSource", "amount");
                        setValue("maxVolumeL", "");
                      },
                    })}
                  />
                </div>
              </div>
              <p className="text-sm text-slate-600" aria-live="polite">
                {limitSource === "volume" && computedAmount && <>Valor máximo calculado: <strong>{formatBrl(computedAmount)}</strong></>}
                {limitSource === "amount" && computedLitres && <>Litros calculados: <strong>{formatLitres(computedLitres)}</strong></>}
              </p>
              {tankExceeded && vehicle && (
                <Notice tone="warning">
                  {formatLitres(effectiveLitres)} passa da capacidade do tanque ({formatLitres(vehicle.tankCapacityL)}).
                </Notice>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  {selectField(
                    "qddItemId",
                    "Ficha QDD",
                    "Selecione a ficha",
                    (options?.qddItems ?? []).map(q => ({
                      value: q.id,
                      label: `${q.ficha} · ${q.naturezaDespesa} · Fonte ${q.fonte}`,
                    })),
                    undefined,
                    soleQddItemId
                  )}
                  {qddItem?.saldoRestante && <p className="mt-1 text-xs text-slate-500">Saldo da ficha: {formatBrl(qddItem.saldoRestante)}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="validUntil">Válida até</Label>
                  <Input id="validUntil" type="date" {...register("validUntil")} />
                  <FieldError message={errors.validUntil?.message} />
                  {options && values.validUntil === options.defaultValidUntil && (
                    <p className="text-xs text-slate-500">3 dias úteis, contando os feriados cadastrados.</p>
                  )}
                </div>
              </div>
              {budgetShort && (
                <Notice tone="warning">
                  A ficha QDD não tem saldo para este valor. A emissão não é bloqueada (o estouro fica registrado), mas confira com a contabilidade.
                </Notice>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="purpose">Finalidade</Label>
                <Textarea id="purpose" rows={3} placeholder="Ex.: Transporte de pacientes para Araguaína" {...register("purpose")} />
                <FieldError message={errors.purpose?.message} />
                {suggestions && suggestions.recentPurposes.length > 0 && (
                  <div className="flex flex-wrap gap-2" aria-label="Finalidades recentes">
                    {suggestions.recentPurposes.map(purpose => (
                      <button
                        key={purpose}
                        type="button"
                        className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
                        onClick={() => setValue("purpose", purpose, { shouldValidate: true })}
                      >
                        {purpose.length > 60 ? `${purpose.slice(0, 57)}...` : purpose}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          <div className="flex flex-wrap justify-end gap-3 px-6 py-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" variant="outline" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar rascunho
            </Button>
            <Button type="button" disabled={isPending} onClick={handleSubmit(form => save(form, true))}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Emitir e gerar PDF
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
