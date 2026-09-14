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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMe } from "@/hooks/useMe";
import { hasPermission } from "@/lib/permissions";
import {
  type DailyAllowance,
  isIssued,
} from "@/lib/api/daily-allowances";
import {
  useCreateDailyAllowance,
  useIssueDailyAllowance,
  useUpdateDailyAllowance,
} from "@/hooks/useDailyAllowances";
import {
  describeDocumentError,
  formatCurrency,
  toDateInputValue,
} from "@/lib/official-documents";
import { BeneficiaryCombobox } from "./BeneficiaryCombobox";
import { DepartmentSelect } from "@/components/departments/DepartmentSelect";

/**
 * Formulário de Diária (Épico 3, FE.2).
 *
 * DOIS ESTADOS, NÃO UM: rascunho editável e documento emitido em somente
 * leitura. A emissão é irreversível — gera o hash publicado no QR Code — então
 * a interface precisa deixar claro, ANTES do clique, que aquilo não tem volta.
 */

const schema = z
  .object({
    // Obrigatório também AQUI, não só no servidor: despesa sem setor não tem
    // ordenador responsável, e o backend recusa com 400 desde a Fase 3.
    departmentId: z.string().min(1, "Selecione o órgão concedente."),
    beneficiaryName: z
      .string()
      .trim()
      .min(1, "Informe o nome do beneficiário.")
      .max(200, "Nome muito longo."),
    destination: z.string().trim().min(1, "Informe o destino."),
    purpose: z.string().trim().min(1, "Informe o motivo do deslocamento."),
    departureDate: z.string().min(1, "Informe a data de saída."),
    returnDate: z.string().min(1, "Informe a data de retorno."),
    dailyRate: z.coerce
      .number({ invalid_type_error: "Informe um valor numérico." })
      .positive("O valor da diária deve ser maior que zero."),
    dayCount: z.coerce
      .number({ invalid_type_error: "Informe um número." })
      .positive("A quantidade de diárias deve ser maior que zero."),
  })
  // Mesma regra do backend, verificada aqui para o usuário saber na hora, sem
  // precisar de uma ida ao servidor para descobrir.
  .refine(data => data.returnDate >= data.departureDate, {
    message: "A data de retorno não pode ser anterior à data de saída.",
    path: ["returnDate"],
  });

type FormValues = z.input<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Registro em edição. Ausente = criação de novo rascunho. */
  allowance?: DailyAllowance | null;
}

const EMPTY: FormValues = {
  departmentId: "",
  beneficiaryName: "",
  destination: "",
  purpose: "",
  departureDate: "",
  returnDate: "",
  dailyRate: "" as unknown as number,
  dayCount: "" as unknown as number,
};

export function DailyAllowanceForm({ open, onOpenChange, allowance }: Props) {
  const { toast } = useToast();
  const { data: me } = useMe(true);

  const create = useCreateDailyAllowance();
  const update = useUpdateDailyAllowance();
  const issue = useIssueDailyAllowance();

  const readOnly = Boolean(allowance && isIssued(allowance));
  const canIssue = hasPermission(me, "dailyAllowances:issue");
  const canWrite = hasPermission(me, "dailyAllowances:write");

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

  // Recarrega os campos ao trocar o registro aberto. Sem isto, reabrir o
  // formulário para outra diária mostraria os dados da anterior.
  useEffect(() => {
    reset(
      allowance
        ? {
            departmentId: allowance.departmentId ?? "",
            beneficiaryName: allowance.beneficiaryName,
            destination: allowance.destination,
            purpose: allowance.purpose,
            departureDate: toDateInputValue(allowance.departureDate),
            returnDate: toDateInputValue(allowance.returnDate),
            dailyRate: Number(allowance.dailyRate) as unknown as number,
            dayCount: Number(allowance.dayCount) as unknown as number,
          }
        : EMPTY
    );
  }, [allowance, reset]);

  // Prévia do total. É apenas informativa: o valor que vale é o que o SERVIDOR
  // calcula, justamente porque este número não pode depender do navegador.
  const dailyRate = Number(watch("dailyRate")) || 0;
  const dayCount = Number(watch("dayCount")) || 0;
  const previewTotal = dailyRate * dayCount;

  const saving = create.isPending || update.isPending;
  const issuing = issue.isPending;

  async function persist(values: FormValues): Promise<string | null> {
    const payload = {
      departmentId: values.departmentId,
      beneficiaryName: values.beneficiaryName,
      destination: values.destination,
      purpose: values.purpose,
      departureDate: values.departureDate,
      returnDate: values.returnDate,
      dailyRate: Number(values.dailyRate),
      dayCount: Number(values.dayCount),
    };

    if (allowance) {
      await update.mutateAsync({ id: allowance.id, data: payload });
      return allowance.id;
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
      "Emitir o documento oficial?\n\n" +
        "Depois de emitida, a diária NÃO poderá mais ser alterada nem excluída, " +
        "e o recibo passará a valer para conferência pública."
    );
    if (!confirmed) return;

    try {
      const id = await persist(values);
      if (!id) return;

      await issue.mutateAsync(id);
      toast({ title: "Documento emitido com sucesso." });
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
              ? "Diária emitida"
              : allowance
                ? "Editar rascunho de diária"
                : "Nova diária"}
          </DialogTitle>
          <DialogDescription>
            {readOnly
              ? "Este documento já foi emitido e não pode ser alterado."
              : "Preencha os dados do deslocamento. O valor total é calculado pelo sistema."}
          </DialogDescription>
        </DialogHeader>

        {readOnly && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Documento oficial em modo somente leitura. Para corrigir alguma
              informação, registre uma nova diária.
            </span>
          </div>
        )}

        <form className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="departmentId">Órgão concedente (setor da despesa)</Label>
            <DepartmentSelect
              id="departmentId"
              value={watch("departmentId") || null}
              onChange={next =>
                setValue("departmentId", next ?? "", { shouldValidate: true })
              }
              disabled={readOnly}
            />
            {errors.departmentId && (
              <p className="text-xs text-red-600">{errors.departmentId.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="beneficiaryName">Beneficiário (quem vai viajar)</Label>
            <BeneficiaryCombobox
              value={watch("beneficiaryName") ?? ""}
              onChange={name =>
                setValue("beneficiaryName", name, { shouldValidate: false })
              }
              disabled={readOnly}
              onSelectBeneficiary={beneficiary => {
                // SUGESTÃO a partir da lotação do servidor, não imposição: só
                // preenche o que está vazio. Sobrescrever um setor já escolhido
                // desfaria, em silêncio, a decisão de quem preenche — servidor
                // cedido viaja a serviço de outra pasta, e a despesa corre por
                // quem a autorizou.
                if (beneficiary.departmentId && !watch("departmentId")) {
                  setValue("departmentId", beneficiary.departmentId, {
                    shouldValidate: true,
                  });
                }
              }}
              error={errors.beneficiaryName?.message}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="destination">Destino</Label>
            <Input
              id="destination"
              placeholder="Brasília/DF"
              disabled={readOnly}
              {...register("destination")}
            />
            {errors.destination && (
              <p className="text-sm text-red-600">{errors.destination.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="purpose">Motivo do deslocamento</Label>
            <Textarea
              id="purpose"
              rows={3}
              placeholder="Reunião no ministério para tratar do convênio"
              disabled={readOnly}
              {...register("purpose")}
            />
            {errors.purpose && (
              <p className="text-sm text-red-600">{errors.purpose.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="departureDate">Data de saída</Label>
              <Input
                id="departureDate"
                type="date"
                disabled={readOnly}
                {...register("departureDate")}
              />
              {errors.departureDate && (
                <p className="text-sm text-red-600">{errors.departureDate.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="returnDate">Data de retorno</Label>
              <Input
                id="returnDate"
                type="date"
                disabled={readOnly}
                {...register("returnDate")}
              />
              {errors.returnDate && (
                <p className="text-sm text-red-600">{errors.returnDate.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="dailyRate">Valor unitário da diária</Label>
              <Input
                id="dailyRate"
                type="number"
                step="0.01"
                min="0"
                placeholder="350,00"
                disabled={readOnly}
                {...register("dailyRate")}
              />
              {errors.dailyRate && (
                <p className="text-sm text-red-600">{errors.dailyRate.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dayCount">Quantidade de diárias</Label>
              <Input
                id="dayCount"
                type="number"
                step="0.5"
                min="0"
                placeholder="2,5"
                disabled={readOnly}
                {...register("dayCount")}
              />
              {/* Meia diária é praxe quando não há pernoite. */}
              <p className="text-xs text-slate-500">Use 0,5 para meia diária.</p>
              {errors.dayCount && (
                <p className="text-sm text-red-600">{errors.dayCount.message}</p>
              )}
            </div>
          </div>

          <div className="rounded-md bg-slate-50 px-3 py-2.5">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Valor total previsto
            </p>
            <p className="text-lg font-semibold text-slate-800">
              {formatCurrency(readOnly && allowance ? allowance.totalAmount : previewTotal)}
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

          {/* Sem a permissão de emissão o botão nem aparece: oferecer uma ação
              que resultaria em 403 é convidar o usuário ao erro. */}
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
