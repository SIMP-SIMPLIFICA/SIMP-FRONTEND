import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, FileCheck2, Loader2, Lock, Save } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMe } from "@/hooks/useMe";
import { hasPermission } from "@/lib/permissions";
import {
  type DailyAllowance,
  FUNDING_SOURCE_LABELS,
  TRANSPORT_MEANS_LABELS,
  isIssued,
} from "@/lib/api/daily-allowances";
import {
  useCreateDailyAllowance,
  useIssueDailyAllowance,
  useUpdateDailyAllowance,
} from "@/hooks/useDailyAllowances";
import { useDepartment } from "@/hooks/useDepartments";
import { useHolidays } from "@/hooks/useHolidays";
import {
  describeDocumentError,
  formatCurrency,
  toDateInputValue,
} from "@/lib/official-documents";
import { formatCnpj } from "@/utils/cnpj";
import { normalizeCpf } from "@/utils/cpf";
import { touchesWeekendOrHoliday } from "@/utils/weekend-holiday";
import { BeneficiaryCombobox } from "./BeneficiaryCombobox";
import { QddItemSelect } from "./QddItemSelect";
import { DepartmentSelect } from "@/components/departments/DepartmentSelect";

/** Sentinela do item "não informado" — o Radix não aceita value vazio. */
const NONE = "__none__";

/**
 * Formulário de Diária (Épico 3, FE.2; Épico 4, Fase 3).
 *
 * DOIS ESTADOS, NÃO UM: rascunho editável e documento emitido em somente
 * leitura. A emissão é irreversível — gera o hash publicado no QR Code — então
 * a interface precisa deixar claro, ANTES do clique, que aquilo não tem volta.
 *
 * QUATRO BLOCOS, na ordem em que a decisão se desenrola na prática: primeiro
 * QUEM concede (o órgão, com o CNPJ e o Ordenador que vão carimbar o
 * documento), depois QUEM viaja, depois O QUÊ (a viagem em si), e por último
 * COM QUE DINHEIRO — a dotação só faz sentido depois de já se saber o setor.
 */

const schema = z
  .object({
    // Obrigatório também AQUI, não só no servidor: despesa sem setor não tem
    // ordenador responsável, e o backend recusa com 400 desde a Fase 3.
    departmentId: z.string().min(1, "Selecione o órgão concedente."),
    // Opcional de propósito: nem todo setor já tem QDD lançado, e travar a
    // diária por isso engessaria o município — o backend apenas deixa de
    // computar estouro de dotação quando a ficha não é informada.
    qddItemId: z.string().optional(),
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

    // ── Matriz de 20 campos do Anexo I — todos opcionais AQUI pelo mesmo
    // motivo do backend: o formulário físico tem casos legítimos de campo em
    // branco ("EM ABERTO"), e travar a diária por um RG que ainda não se sabe
    // engessaria o município. O CPF é o único com uma regra de FORMATO: se
    // for informado, precisa ter os 11 dígitos — mesma checagem do servidor,
    // só que na hora, sem esperar o 400 de volta.
    beneficiaryCpf: z
      .string()
      .optional()
      .refine(v => !v || normalizeCpf(v).length === 11, {
        message: "CPF inválido. Confira os 11 dígitos.",
      }),
    beneficiaryRegistrationNumber: z.string().trim().optional(),
    beneficiaryRg: z.string().trim().optional(),
    beneficiaryRgIssuer: z.string().trim().optional(),
    beneficiaryJobTitle: z.string().trim().optional(),
    beneficiaryLotacao: z.string().trim().optional(),
    beneficiaryBankName: z.string().trim().optional(),
    beneficiaryBankAgency: z.string().trim().optional(),
    beneficiaryBankAccount: z.string().trim().optional(),
    departureTime: z.string().trim().optional(),
    arrivalTime: z.string().trim().optional(),
    transportMeans: z.enum(["RODOVIARIO", "AEREO", "VEICULO_OFICIAL", "OUTRO"]).optional(),
    fundingSource: z.enum(["PROPRIO", "CONVENIO"]).optional(),
    // Regra do TCE (Épico 8, FR-021/FR-022) — a EXIGÊNCIA de verdade é do
    // servidor, na emissão; aqui é só o texto que a tela envia quando visível.
    weekendHolidayJustification: z.string().trim().optional(),
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
  qddItemId: "",
  beneficiaryName: "",
  destination: "",
  purpose: "",
  departureDate: "",
  returnDate: "",
  dailyRate: "" as unknown as number,
  dayCount: "" as unknown as number,
  beneficiaryCpf: "",
  beneficiaryRegistrationNumber: "",
  beneficiaryRg: "",
  beneficiaryRgIssuer: "",
  beneficiaryJobTitle: "",
  beneficiaryLotacao: "",
  beneficiaryBankName: "",
  beneficiaryBankAgency: "",
  beneficiaryBankAccount: "",
  departureTime: "",
  arrivalTime: "",
  transportMeans: undefined,
  fundingSource: undefined,
  weekendHolidayJustification: "",
};

/** Cabeçalho numerado de bloco — a separação visual que a Cartilha exige. */
function FormBlock({
  number,
  title,
  description,
  children,
}: {
  number: number;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold text-white">
          {number}
        </span>
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          {description && <p className="text-xs text-slate-400">{description}</p>}
        </div>
      </div>
      {/* A régua vertical acompanha o conteúdo do bloco: é o que amarra
          visualmente "isto pertence a este passo", sem depender só do
          espaçamento entre blocos. */}
      <div className="space-y-4 border-l-2 border-slate-100 pl-4 sm:pl-[1.4rem]">
        {children}
      </div>
    </div>
  );
}

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
            qddItemId: allowance.qddItemId ?? "",
            beneficiaryName: allowance.beneficiaryName,
            destination: allowance.destination,
            purpose: allowance.purpose,
            departureDate: toDateInputValue(allowance.departureDate),
            returnDate: toDateInputValue(allowance.returnDate),
            dailyRate: Number(allowance.dailyRate) as unknown as number,
            dayCount: Number(allowance.dayCount) as unknown as number,
            beneficiaryCpf: allowance.beneficiaryCpf ?? "",
            beneficiaryRegistrationNumber: allowance.beneficiaryRegistrationNumber ?? "",
            beneficiaryRg: allowance.beneficiaryRg ?? "",
            beneficiaryRgIssuer: allowance.beneficiaryRgIssuer ?? "",
            beneficiaryJobTitle: allowance.beneficiaryJobTitle ?? "",
            beneficiaryLotacao: allowance.beneficiaryLotacao ?? "",
            beneficiaryBankName: allowance.beneficiaryBankName ?? "",
            beneficiaryBankAgency: allowance.beneficiaryBankAgency ?? "",
            beneficiaryBankAccount: allowance.beneficiaryBankAccount ?? "",
            departureTime: allowance.departureTime ?? "",
            arrivalTime: allowance.arrivalTime ?? "",
            transportMeans: allowance.transportMeans ?? undefined,
            fundingSource: allowance.fundingSource ?? undefined,
            weekendHolidayJustification: allowance.weekendHolidayJustification ?? "",
          }
        : EMPTY
    );
  }, [allowance, reset]);

  const departmentId = watch("departmentId");

  // Bloco 1 — cabeçalho do órgão concedente. `enabled` interno ao hook cuida
  // de não consultar nada enquanto não há setor escolhido.
  const { data: department, isLoading: loadingDepartment } = useDepartment(
    departmentId || undefined
  );

  // Prévia do total. É apenas informativa: o valor que vale é o que o SERVIDOR
  // calcula, justamente porque este número não pode depender do navegador.
  const dailyRate = Number(watch("dailyRate")) || 0;
  const dayCount = Number(watch("dayCount")) || 0;
  const previewTotal = dailyRate * dayCount;

  // Alerta de fim de semana/feriado (Épico 8, FR-021/FR-022) — regra do TCE.
  // Só um AVISO nesta tela: quem trava de verdade é o servidor, na emissão.
  const departureDate = watch("departureDate");
  const returnDate = watch("returnDate");
  const { data: holidays } = useHolidays();
  const showsWeekendAlert = useMemo(
    () => touchesWeekendOrHoliday(departureDate, returnDate, holidays ?? []),
    [departureDate, returnDate, holidays]
  );

  const saving = create.isPending || update.isPending;
  const issuing = issue.isPending;

  async function persist(values: FormValues): Promise<string | null> {
    const payload = {
      departmentId: values.departmentId,
      qddItemId: values.qddItemId || undefined,
      beneficiaryName: values.beneficiaryName,
      destination: values.destination,
      purpose: values.purpose,
      departureDate: values.departureDate,
      returnDate: values.returnDate,
      dailyRate: Number(values.dailyRate),
      dayCount: Number(values.dayCount),
      beneficiaryCpf: values.beneficiaryCpf || undefined,
      beneficiaryRegistrationNumber: values.beneficiaryRegistrationNumber || undefined,
      beneficiaryRg: values.beneficiaryRg || undefined,
      beneficiaryRgIssuer: values.beneficiaryRgIssuer || undefined,
      beneficiaryJobTitle: values.beneficiaryJobTitle || undefined,
      beneficiaryLotacao: values.beneficiaryLotacao || undefined,
      beneficiaryBankName: values.beneficiaryBankName || undefined,
      beneficiaryBankAgency: values.beneficiaryBankAgency || undefined,
      beneficiaryBankAccount: values.beneficiaryBankAccount || undefined,
      departureTime: values.departureTime || undefined,
      arrivalTime: values.arrivalTime || undefined,
      transportMeans: values.transportMeans || undefined,
      fundingSource: values.fundingSource || undefined,
      weekendHolidayJustification: values.weekendHolidayJustification || undefined,
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {readOnly
              ? "Diária emitida"
              : allowance
                ? "Editar rascunho de diária"
                : "Nova diária"}
            {/* "Número da Diária" (Épico 8, FR-002) — só existe depois de criado o rascunho. */}
            {allowance?.formattedNumber && (
              <span className="ml-2 font-mono text-sm font-normal text-slate-400">
                Nº {allowance.formattedNumber}
              </span>
            )}
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

        <form className="space-y-6">
          {/* ── Bloco 1: Órgão Concedente ── */}
          <FormBlock
            number={1}
            title="Órgão concedente"
            description="Setor que autoriza e responde pela despesa."
          >
            <div className="space-y-1.5">
              <Label htmlFor="departmentId">Secretaria / Departamento</Label>
              <DepartmentSelect
                id="departmentId"
                value={departmentId || null}
                onChange={next => {
                  const changed = (next ?? "") !== departmentId;
                  setValue("departmentId", next ?? "", { shouldValidate: true });
                  // Trocar de setor invalida a ficha escolhida no Bloco 4: uma
                  // dotação de outra secretaria não pode lastrear esta despesa.
                  // Atrelado ao onChange, não a um efeito — é o próprio evento
                  // de mudança que decide, sem re-sincronizar por baixo.
                  if (changed) {
                    setValue("qddItemId", "", { shouldValidate: false });
                  }
                }}
                disabled={readOnly}
              />
              {errors.departmentId && (
                <p className="text-xs text-red-600">{errors.departmentId.message}</p>
              )}
            </div>

            {/* Espelho, não campo: CNPJ e Ordenador vêm do cadastro do setor
                e não entram no payload da diária — o backend já resolve o
                Ordenador a partir do departamentId na hora de montar o PDF. */}
            {departmentId && (
              <div className="grid grid-cols-1 gap-3 rounded-md bg-slate-50 px-3 py-2.5 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">CNPJ</p>
                  <p className="text-sm text-slate-700">
                    {loadingDepartment
                      ? "Carregando..."
                      : formatCnpj(department?.cnpj) || "Não informado"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">
                    Ordenador de despesa
                  </p>
                  <p className="text-sm text-slate-700">
                    {loadingDepartment ? "Carregando..." : department?.chiefName || "Não informado"}
                  </p>
                </div>
              </div>
            )}
          </FormBlock>

          {/* ── Bloco 2: Beneficiário ── */}
          <FormBlock
            number={2}
            title="Beneficiário"
            description="Quem vai viajar. Nomes novos entram na lista automaticamente."
          >
            <div className="space-y-1.5">
              <Label htmlFor="beneficiaryName">Nome do servidor</Label>
              <BeneficiaryCombobox
                value={watch("beneficiaryName") ?? ""}
                onChange={name =>
                  setValue("beneficiaryName", name, { shouldValidate: false })
                }
                cpfValue={watch("beneficiaryCpf") ?? ""}
                onCpfChange={cpf => setValue("beneficiaryCpf", cpf, { shouldValidate: false })}
                registryDraft={{
                  registrationNumber: watch("beneficiaryRegistrationNumber") || undefined,
                  rg: watch("beneficiaryRg") || undefined,
                  jobTitle: watch("beneficiaryJobTitle") || undefined,
                  lotacao: watch("beneficiaryLotacao") || undefined,
                  bankName: watch("beneficiaryBankName") || undefined,
                  bankAgency: watch("beneficiaryBankAgency") || undefined,
                  bankAccount: watch("beneficiaryBankAccount") || undefined,
                }}
                disabled={readOnly}
                onSelectBeneficiary={beneficiary => {
                  // SUGESTÃO a partir do cadastro, não imposição: só preenche o
                  // que está vazio. Sobrescrever um dado já digitado desfaria,
                  // em silêncio, uma correção de quem preenche — servidor
                  // cedido viaja a serviço de outra pasta, ou muda de cargo
                  // entre uma diária e outra, e a despesa corre por quem a
                  // autorizou agora, não por quem autorizou da última vez.
                  if (beneficiary.departmentId && !departmentId) {
                    setValue("departmentId", beneficiary.departmentId, {
                      shouldValidate: true,
                    });
                  }
                  if (beneficiary.registrationNumber && !watch("beneficiaryRegistrationNumber")) {
                    setValue("beneficiaryRegistrationNumber", beneficiary.registrationNumber);
                  }
                  if (beneficiary.rg && !watch("beneficiaryRg")) {
                    setValue("beneficiaryRg", beneficiary.rg);
                  }
                  if (beneficiary.jobTitle && !watch("beneficiaryJobTitle")) {
                    setValue("beneficiaryJobTitle", beneficiary.jobTitle);
                  }
                  if (beneficiary.lotacao && !watch("beneficiaryLotacao")) {
                    setValue("beneficiaryLotacao", beneficiary.lotacao);
                  }
                  if (beneficiary.bankName && !watch("beneficiaryBankName")) {
                    setValue("beneficiaryBankName", beneficiary.bankName);
                  }
                  if (beneficiary.bankAgency && !watch("beneficiaryBankAgency")) {
                    setValue("beneficiaryBankAgency", beneficiary.bankAgency);
                  }
                  if (beneficiary.bankAccount && !watch("beneficiaryBankAccount")) {
                    setValue("beneficiaryBankAccount", beneficiary.bankAccount);
                  }
                }}
                error={errors.beneficiaryName?.message}
              />
              {errors.beneficiaryCpf && (
                <p className="text-xs text-red-600">{errors.beneficiaryCpf.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="beneficiaryRegistrationNumber">Matrícula funcional</Label>
                <Input
                  id="beneficiaryRegistrationNumber"
                  placeholder="5240"
                  disabled={readOnly}
                  {...register("beneficiaryRegistrationNumber")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="beneficiaryRg">RG</Label>
                <Input
                  id="beneficiaryRg"
                  placeholder="32000002"
                  disabled={readOnly}
                  {...register("beneficiaryRg")}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                {/* Campo da cartilha oficial de prestação de contas (Épico 8) —
                    ausente do cadastro original do beneficiário. */}
                <Label htmlFor="beneficiaryRgIssuer">Órgão emissor do RG</Label>
                <Input
                  id="beneficiaryRgIssuer"
                  placeholder="SSP/GO"
                  disabled={readOnly}
                  {...register("beneficiaryRgIssuer")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="beneficiaryJobTitle">Cargo / Função</Label>
                <Input
                  id="beneficiaryJobTitle"
                  placeholder="Coordenadora do Bolsa Família"
                  disabled={readOnly}
                  {...register("beneficiaryJobTitle")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="beneficiaryLotacao">Lotação</Label>
                <Input
                  id="beneficiaryLotacao"
                  placeholder="Fundo Municipal de Assistência Social"
                  disabled={readOnly}
                  {...register("beneficiaryLotacao")}
                />
              </div>
            </div>

            {/* Dados bancários: uma célula só no formulário físico (campo 10),
                mas três campos aqui — digitar tudo junto seria pedir para o
                usuário inventar a formatação "Banco · AG: x · Conta: y" de
                cabeça. O servidor é quem junta na hora de montar o PDF. */}
            <div className="space-y-1.5">
              <Label>Dados bancários</Label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Input
                  aria-label="Banco"
                  placeholder="Banco"
                  disabled={readOnly}
                  {...register("beneficiaryBankName")}
                />
                <Input
                  aria-label="Agência"
                  placeholder="Agência"
                  disabled={readOnly}
                  {...register("beneficiaryBankAgency")}
                />
                <Input
                  aria-label="Conta"
                  placeholder="Conta"
                  disabled={readOnly}
                  {...register("beneficiaryBankAccount")}
                />
              </div>
            </div>
          </FormBlock>

          {/* ── Bloco 3: Descrição da Viagem ── */}
          <FormBlock number={3} title="Descrição da viagem">
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

            {/* Regra do TCE (Épico 8, FR-021/FR-022): período em fim de semana
                ou feriado cadastrado exige justificativa — o servidor recusa a
                EMISSÃO sem ela, este bloco só antecipa o aviso. */}
            {showsWeekendAlert && (
              <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
                <div className="flex items-start gap-2 text-sm text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    O período cai em sábado, domingo ou feriado cadastrado. O
                    Tribunal de Contas exige uma justificativa legal para
                    emitir a diária nessas condições.
                  </span>
                </div>
                <Textarea
                  id="weekendHolidayJustification"
                  rows={2}
                  placeholder="Ex: Evento com início no sábado, conforme convocação oficial."
                  disabled={readOnly}
                  {...register("weekendHolidayJustification")}
                />
              </div>
            )}

            {/* Horários e meio de transporte ficam em branco quando ainda não
                se sabe — "EM ABERTO" é a convenção do papel físico, não erro
                de preenchimento, e é assim que o PDF mostra também. */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="departureTime">Horário de saída</Label>
                <Input
                  id="departureTime"
                  type="time"
                  disabled={readOnly}
                  {...register("departureTime")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="arrivalTime">Horário de chegada</Label>
                <Input
                  id="arrivalTime"
                  type="time"
                  disabled={readOnly}
                  {...register("arrivalTime")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="transportMeans">Meio de transporte</Label>
                <Select
                  value={watch("transportMeans") || NONE}
                  onValueChange={next =>
                    setValue(
                      "transportMeans",
                      next === NONE ? undefined : (next as FormValues["transportMeans"]),
                      { shouldValidate: false }
                    )
                  }
                  disabled={readOnly}
                >
                  <SelectTrigger id="transportMeans">
                    <SelectValue placeholder="Não informado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Não informado</SelectItem>
                    {Object.entries(TRANSPORT_MEANS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

            <div className="space-y-1.5">
              <Label htmlFor="fundingSource">Recursos</Label>
              <Select
                value={watch("fundingSource") || NONE}
                onValueChange={next =>
                  setValue(
                    "fundingSource",
                    next === NONE ? undefined : (next as FormValues["fundingSource"]),
                    { shouldValidate: false }
                  )
                }
                disabled={readOnly}
              >
                <SelectTrigger id="fundingSource" className="sm:max-w-xs">
                  <SelectValue placeholder="Não informado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Não informado</SelectItem>
                  {Object.entries(FUNDING_SOURCE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md bg-slate-50 px-3 py-2.5">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Valor total previsto
              </p>
              <p className="text-lg font-semibold text-slate-800">
                {formatCurrency(readOnly && allowance ? allowance.totalAmount : previewTotal)}
              </p>
            </div>
          </FormBlock>

          {/* ── Bloco 4: Controle Orçamentário ── */}
          <FormBlock
            number={4}
            title="Controle orçamentário"
            description="A ficha do QDD que lastreia esta despesa. Opcional, mas é o que aciona o alerta de estouro de dotação."
          >
            <div className="space-y-1.5">
              <Label htmlFor="qddItemId">Ficha orçamentária (QDD)</Label>
              <QddItemSelect
                departmentId={departmentId || null}
                value={watch("qddItemId") || null}
                onChange={next => setValue("qddItemId", next ?? "", { shouldValidate: false })}
                disabled={readOnly}
              />
              {!departmentId && (
                <p className="text-xs text-slate-400">
                  Escolha o órgão concedente no Bloco 1 para ver as fichas dele.
                </p>
              )}
            </div>
          </FormBlock>
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
