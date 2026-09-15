import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Receipt, Trash2 } from "lucide-react";
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
import { type DailyAllowance } from "@/lib/api/daily-allowances";
import { useAccountForDailyAllowance } from "@/hooks/useDailyAllowances";
import { describeDocumentError } from "@/lib/official-documents";

/**
 * Prestação de Contas de Diária — Anexo II (Épico 8, FR-001 a FR-005).
 *
 * Reproduz a cartilha oficial: além do relato de atividades já existente,
 * pede os campos que o formulário físico exige — bilhete de passagem,
 * endereço/local do evento, contatos efetuados e a tabela de notas fiscais
 * comprobatórias (linhas dinâmicas, igual à cartilha).
 *
 * A REGRA DE LIBERAÇÃO (hoje >= data de retorno) é decidida por quem abre
 * este diálogo — `DailyAllowanceList` só o renderiza quando `canAccountFor`
 * já deu positivo — e reforçada pelo próprio SERVIDOR: se a data ainda não
 * chegou, o `accountFor` volta com `TOO_EARLY` e o erro aparece no toast.
 */

const receiptSchema = z.object({
  receiptNumber: z.string().trim().min(1, "Informe o número."),
  payeeName: z.string().trim().min(1, "Informe o favorecido."),
  issuedAt: z.string().min(1, "Informe a data."),
  amount: z.coerce.number({ invalid_type_error: "Valor inválido." }).positive("O valor deve ser maior que zero."),
});

const schema = z.object({
  accountabilityDate: z.string().min(1, "Informe a data da prestação de contas."),
  activityReport: z
    .string()
    .trim()
    .min(10, "Descreva a atividade desempenhada em pelo menos 10 caracteres."),
  ticketNumber: z.string().trim().optional(),
  eventAddress: z.string().trim().optional(),
  contactsInfo: z.string().trim().optional(),
  receipts: z.array(receiptSchema),
});

type FormValues = z.input<typeof schema>;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY: FormValues = {
  accountabilityDate: today(),
  activityReport: "",
  ticketNumber: "",
  eventAddress: "",
  contactsInfo: "",
  receipts: [],
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allowance: DailyAllowance | null;
}

export function AccountabilityDialog({ open, onOpenChange, allowance }: Props) {
  const { toast } = useToast();
  const accountFor = useAccountForDailyAllowance();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  const { fields, append, remove } = useFieldArray({ control, name: "receipts" });

  // Reabre sempre em branco (data de hoje) — prestação de contas é ato novo,
  // não há rascunho anterior para recarregar.
  useEffect(() => {
    if (open) reset(EMPTY);
  }, [open, reset]);

  async function onSubmit(values: FormValues) {
    if (!allowance) return;
    try {
      await accountFor.mutateAsync({
        id: allowance.id,
        data: {
          accountabilityDate: values.accountabilityDate,
          activityReport: values.activityReport,
          ticketNumber: values.ticketNumber || undefined,
          eventAddress: values.eventAddress || undefined,
          contactsInfo: values.contactsInfo || undefined,
          receipts: (values.receipts ?? []).map(r => ({
            receiptNumber: r.receiptNumber,
            payeeName: r.payeeName,
            issuedAt: r.issuedAt,
            amount: Number(r.amount),
          })),
        },
      });
      toast({ title: "Prestação de contas registrada." });
      onOpenChange(false);
    } catch (error) {
      toast({ title: describeDocumentError(error), variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Prestar contas da diária</DialogTitle>
          <DialogDescription>
            {allowance?.beneficiaryName}
            {allowance?.formattedNumber && ` · Nº ${allowance.formattedNumber}`} — gera o
            Anexo II, com hash e QR Code próprios.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="accountabilityDate">Data da prestação de contas</Label>
              <Input id="accountabilityDate" type="date" {...register("accountabilityDate")} />
              {errors.accountabilityDate && (
                <p className="text-xs text-red-600">{errors.accountabilityDate.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ticketNumber">Nº do bilhete de passagem</Label>
              <Input id="ticketNumber" placeholder="Opcional" {...register("ticketNumber")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="activityReport">Relatório de atividades desenvolvidas</Label>
            <Textarea
              id="activityReport"
              rows={4}
              placeholder="Descreva a atividade desempenhada durante o deslocamento."
              {...register("activityReport")}
            />
            {errors.activityReport && (
              <p className="text-xs text-red-600">{errors.activityReport.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="eventAddress">Endereço e local do evento/reunião/atividade</Label>
            <Textarea id="eventAddress" rows={2} placeholder="Opcional" {...register("eventAddress")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contactsInfo">Nome, cargo/função e telefone(s) de contato(s)</Label>
            <Textarea id="contactsInfo" rows={2} placeholder="Opcional" {...register("contactsInfo")} />
          </div>

          {/* Notas fiscais comprobatórias — mesma tabela da cartilha física,
              quantas linhas o comprovante exigir. Imutáveis depois de salvas:
              não há edição possível após o Anexo II ser emitido. */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5" />
                Documentos comprobatórios
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => append({ receiptNumber: "", payeeName: "", issuedAt: today(), amount: 0 as unknown as number })}
              >
                <Plus className="h-3.5 w-3.5" />
                Nota fiscal
              </Button>
            </div>

            {fields.length === 0 && (
              <p className="text-xs text-slate-400">Nenhuma nota fiscal informada.</p>
            )}

            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 items-start gap-2 rounded-md border border-slate-100 p-2">
                <div className="col-span-3">
                  <Input placeholder="Número" {...register(`receipts.${index}.receiptNumber`)} />
                </div>
                <div className="col-span-4">
                  <Input placeholder="Favorecido" {...register(`receipts.${index}.payeeName`)} />
                </div>
                <div className="col-span-2">
                  <Input type="date" {...register(`receipts.${index}.issuedAt`)} />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    {...register(`receipts.${index}.amount`)}
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
                {errors.receipts?.[index] && (
                  <p className="col-span-12 text-xs text-red-600">
                    Confira os dados desta nota fiscal.
                  </p>
                )}
              </div>
            ))}
          </div>
        </form>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={accountFor.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={accountFor.isPending}>
            {accountFor.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar Prestação de Contas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
