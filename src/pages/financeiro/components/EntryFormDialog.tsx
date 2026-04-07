import { useEffect, useState, useCallback } from "react";
import { useUniversalFinanceModal } from "@/context/UniversalFinanceModalContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { FinanceEntry, EntryType } from "../types";

import { useToast } from "@/hooks/use-toast";
import {
    useFinanceCategories,
    useCreateFinanceCategory,
    useCreateFinanceEntry,
    useUpdateFinanceEntry,
    useFinanceAttachments,
    useDeleteAttachment,
    useFinanceBankAccounts,
    useCreateBankAccount,
} from "@/hooks/useFinance";
import { useQueryClient } from "@tanstack/react-query";
import {
    Paperclip, X, Image as ImageIcon, FileText, Trash2,
    Loader2, AlertTriangle, Plus, Settings2, Check, CalendarIcon,
} from "lucide-react";

interface EntryFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entry: FinanceEntry | null;
    onSuccessSave: () => void;
}

// --- HELPERS ---

function formatCurrencyInput(val: string) {
    const digits = val.replace(/\D/g, "");
    if (!digits) return "";
    return (parseInt(digits, 10) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

/** Formata CPF (000.000.000-00) ou CNPJ (00.000.000/0001-00) conforme o usuário digita.
 *  Funciona mesmo ao colar valores já formatados. */
function formatDocument(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 14);
    if (digits.length <= 11) {
        return digits
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    return digits
        .replace(/(\d{2})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1/$2")
        .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function fieldCls(invalid: boolean) {
    return invalid ? "border-red-400 ring-1 ring-red-200 focus-visible:ring-red-300" : "";
}

// --- DATE PICKER REUTILIZÁVEL ---
function DatePickerField({
    label, required, date, onChange, invalid, errorMsg,
}: {
    label: string;
    required?: boolean;
    date: Date | undefined;
    onChange: (d: Date | undefined) => void;
    invalid: boolean;
    errorMsg?: string;
}) {
    return (
        <div className="space-y-1.5">
            <Label className="text-xs">
                {label} {required && <span className="text-red-500">*</span>}
            </Label>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        className={cn(
                            "w-full justify-start text-left font-normal",
                            !date && "text-muted-foreground",
                            invalid && "border-red-400 ring-1 ring-red-200"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                        {date ? format(date, "dd/MM/yyyy") : "Selecionar data"}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={onChange}
                        locale={ptBR}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>
            {invalid && <p className="text-xs text-red-500">{errorMsg ?? "Data obrigatória."}</p>}
        </div>
    );
}

// --- COMPONENTE PRINCIPAL ---
export function EntryFormDialog({ open, onOpenChange, entry, onSuccessSave }: EntryFormDialogProps) {
    // Campos principais
    const [type, setType] = useState<EntryType>("EXPENSE");
    const [occurredAt, setOccurredAt] = useState<Date | undefined>(undefined);
    const [description, setDescription] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [subcategoryName, setSubcategoryName] = useState("");
    const [accountId, setAccountId] = useState("");
    const [amountStr, setAmountStr] = useState("");

    // Rastreabilidade fiscal
    const [providerDocument, setProviderDocument] = useState("");
    const [nfeNumber, setNfeNumber] = useState("");
    const [empenhoNumber, setEmpenhoNumber] = useState("");
    const [liquidacaoNumber, setLiquidacaoNumber] = useState("");
    const [issueDate, setIssueDate] = useState<Date | undefined>(undefined);
    const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(undefined);

    const { open: openFinanceModal } = useUniversalFinanceModal();

    // Criação inline — categoria
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [isCreatingCat, setIsCreatingCat] = useState(false);

    // Criação inline — conta bancária
    const [isAddingAccount, setIsAddingAccount] = useState(false);
    const [newAccountName, setNewAccountName] = useState("");
    const [isCreatingAccount, setIsCreatingAccount] = useState(false);

    // UI
    const [attempted, setAttempted] = useState(false);
    const [shaking, setShaking] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [deletingAttId, setDeletingAttId] = useState<string | null>(null);

    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: categories = [] } = useFinanceCategories();
    const { data: bankAccounts = [] } = useFinanceBankAccounts();
    const { data: existingAttachments = [], isLoading: loadingAttachments } = useFinanceAttachments(entry?.id);
    const { mutate: deleteAttachment } = useDeleteAttachment(entry?.id);
    const { mutateAsync: createCategory } = useCreateFinanceCategory();
    const { mutateAsync: createBankAccount } = useCreateBankAccount();
    const { mutateAsync: createEntry } = useCreateFinanceEntry();
    const { mutateAsync: updateEntry } = useUpdateFinanceEntry();

    const triggerShake = useCallback(() => {
        setShaking(true);
        setTimeout(() => setShaking(false), 500);
    }, []);

    // Inicializa / reseta o formulário
    useEffect(() => {
        if (!open) return;
        setAttempted(false);
        setIsAddingCategory(false);
        setIsAddingAccount(false);
        setNewCategoryName("");
        setNewAccountName("");
        setSelectedFiles([]);

        if (entry) {
            setType(entry.type);
            setDescription(entry.description);
            setAmountStr((entry.amountCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 }));
            setAccountId((entry as FinanceEntry & { accountId?: string }).accountId ?? "");
            setSubcategoryName(entry.subcategoryName || "");
            setProviderDocument(entry.providerDocument ? formatDocument(entry.providerDocument) : "");
            setNfeNumber(entry.nfeNumber || "");
            setEmpenhoNumber(entry.empenhoNumber || "");
            setLiquidacaoNumber(entry.liquidacaoNumber || "");
            setOccurredAt(new Date(entry.occurredAt));
            setIssueDate(entry.issueDate ? new Date(entry.issueDate) : undefined);
            setDeliveryDate(entry.deliveryDate ? new Date(entry.deliveryDate) : undefined);

            const found = categories.find(c => c.name === entry.categoryName);
            setCategoryId(found?.id || "");
        } else {
            setType("EXPENSE");
            setDescription("");
            setAmountStr("");
            setAccountId("");
            setCategoryId("");
            setSubcategoryName("");
            setProviderDocument("");
            setNfeNumber("");
            setEmpenhoNumber("");
            setLiquidacaoNumber("");
            setOccurredAt(new Date());
            setIssueDate(undefined);
            setDeliveryDate(undefined);
        }
    }, [open, entry]); // eslint-disable-line react-hooks/exhaustive-deps

    // Resolve categoryId quando categorias carregam em modo edição
    useEffect(() => {
        if (entry && categories.length > 0 && !categoryId) {
            const found = categories.find(c => c.name === entry.categoryName);
            if (found) setCategoryId(found.id);
        }
    }, [categories]); // eslint-disable-line react-hooks/exhaustive-deps

    // Criação inline de categoria
    async function handleCreateCategory() {
        if (!newCategoryName.trim()) return;
        setIsCreatingCat(true);
        try {
            const newCat = await createCategory({ name: newCategoryName.trim() });
            setCategoryId(newCat.id);
            setNewCategoryName("");
            setIsAddingCategory(false);
            queryClient.invalidateQueries({ queryKey: ["financeCategories"] });
            toast({ title: "Categoria criada", description: `"${newCat.name}" adicionada com sucesso.` });
        } catch {
            toast({ title: "Erro", description: "Falha ao criar categoria.", variant: "destructive" });
        } finally {
            setIsCreatingCat(false);
        }
    }

    // Criação inline de conta bancária
    async function handleCreateAccount() {
        if (!newAccountName.trim()) return;
        setIsCreatingAccount(true);
        try {
            const newAcc = await createBankAccount({ name: newAccountName.trim() });
            setAccountId(newAcc.id);
            setNewAccountName("");
            setIsAddingAccount(false);
            queryClient.invalidateQueries({ queryKey: ["financeBankAccounts"] });
            toast({ title: "Conta criada", description: `"${newAcc.name}" adicionada com sucesso.` });
        } catch {
            toast({ title: "Erro", description: "Falha ao criar conta.", variant: "destructive" });
        } finally {
            setIsCreatingAccount(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const cents = parseInt(amountStr.replace(/\D/g, ""), 10) || 0;
        const hasError =
            !description.trim() || !categoryId || !accountId || !subcategoryName.trim() ||
            !occurredAt || !providerDocument.trim() || !nfeNumber.trim() ||
            !empenhoNumber.trim() || !liquidacaoNumber.trim() ||
            !issueDate || !deliveryDate || cents <= 0;

        if (hasError) {
            setAttempted(true);
            triggerShake();
            toast({ title: "Campos obrigatórios", description: "Preencha todos os campos marcados com *.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                description, type, categoryId, accountId,
                amountCents: cents,
                occurredAt: occurredAt!.toISOString(),
                subcategoryName, nfeNumber, providerDocument, empenhoNumber, liquidacaoNumber,
                issueDate: issueDate!.toISOString(),
                deliveryDate: deliveryDate!.toISOString(),
            };

            let savedEntry: FinanceEntry;
            if (entry) {
                savedEntry = await updateEntry({ id: entry.id, data: payload }) as FinanceEntry;
            } else {
                savedEntry = await createEntry(payload) as FinanceEntry;
            }

            if (selectedFiles.length > 0 && savedEntry?.id) {
                try {
                    const { financeService } = await import("../../../lib/api/finance");
                    await Promise.all(selectedFiles.map(f => financeService.uploadAttachment(savedEntry.id, f)));
                    queryClient.invalidateQueries({ queryKey: ["financeEntries"] });
                } catch {
                    toast({ title: "Atenção", description: "Lançamento salvo, mas algum anexo falhou.", variant: "destructive" });
                    return onSuccessSave();
                }
            } else {
                queryClient.invalidateQueries({ queryKey: ["financeEntries"] });
            }

            toast({ title: "Sucesso", description: entry ? "Lançamento atualizado." : "Lançamento criado." });
            onSuccessSave();
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "";
            toast({
                title: "Erro ao salvar",
                description: msg.length <= 120 ? msg : "Verifique os campos e tente novamente.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files?.length) return;
        const incoming = Array.from(e.target.files);
        setSelectedFiles(prev => {
            const names = new Set(prev.map(f => f.name));
            return [...prev, ...incoming.filter(f => !names.has(f.name))];
        });
    }

    function confirmDeleteAttachment() {
        if (!deletingAttId) return;
        deleteAttachment(deletingAttId, {
            onSuccess: () => {
                toast({ title: "Sucesso", description: "Anexo removido da nuvem." });
                setDeletingAttId(null);
            },
            onError: () => toast({ title: "Erro", description: "Falha ao remover anexo.", variant: "destructive" }),
        });
    }

    const err = {
        description:      attempted && !description.trim(),
        occurredAt:       attempted && !occurredAt,
        categoryId:       attempted && !categoryId,
        accountId:        attempted && !accountId,
        subcategoryName:  attempted && !subcategoryName.trim(),
        providerDocument: attempted && !providerDocument.trim(),
        nfeNumber:        attempted && !nfeNumber.trim(),
        empenhoNumber:    attempted && !empenhoNumber.trim(),
        liquidacaoNumber: attempted && !liquidacaoNumber.trim(),
        issueDate:        attempted && !issueDate,
        deliveryDate:     attempted && !deliveryDate,
        amountStr:        attempted && !(parseInt(amountStr.replace(/\D/g, ""), 10) > 0),
    };

    return (
        <>
            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    15%       { transform: translateX(-6px); }
                    30%       { transform: translateX(6px); }
                    45%       { transform: translateX(-4px); }
                    60%       { transform: translateX(4px); }
                    75%       { transform: translateX(-2px); }
                    90%       { transform: translateX(2px); }
                }
                .shake { animation: shake 0.5s ease; }
            `}</style>

            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{entry ? "Editar Lançamento" : "Novo Lançamento"}</DialogTitle>
                        <DialogDescription>
                            {entry ? "Altere as informações do lançamento abaixo." : "Preencha os dados do novo lançamento financeiro."}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className={cn("space-y-5 pt-2", shaking && "shake")}>

                        {/* Tipo + Data do lançamento */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Tipo</Label>
                                <Select value={type} onValueChange={(v) => setType(v as EntryType)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="EXPENSE">Despesa</SelectItem>
                                        <SelectItem value="INCOME">Receita</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <DatePickerField
                                label="Data do Lançamento" required
                                date={occurredAt} onChange={setOccurredAt}
                                invalid={err.occurredAt} errorMsg="Data obrigatória."
                            />
                        </div>

                        {/* Descrição */}
                        <div className="space-y-1.5">
                            <Label>Descrição <span className="text-red-500">*</span></Label>
                            <Input
                                placeholder="Ex: Compra de materiais de escritório..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className={fieldCls(err.description)}
                            />
                            {err.description && <p className="text-xs text-red-500">Campo obrigatório.</p>}
                        </div>

                        {/* Classificação — Categoria + Subcategoria */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Classificação</span>
                                <button
                                    type="button"
                                    onClick={() => openFinanceModal("categorias")}
                                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                    tabIndex={-1}
                                >
                                    <Settings2 className="h-3 w-3" /> Gerenciar categorias
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-slate-500">Categoria <span className="text-red-500">*</span></Label>
                                    <div className="flex gap-1.5">
                                        <Select value={categoryId} onValueChange={setCategoryId}>
                                            <SelectTrigger className={cn("flex-1", fieldCls(err.categoryId))}>
                                                <SelectValue placeholder="Selecione..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {categories.length === 0
                                                    ? <div className="px-3 py-4 text-sm text-slate-500 text-center">Nenhuma categoria.</div>
                                                    : categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)
                                                }
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            type="button" variant="outline" size="icon" title="Nova categoria"
                                            onClick={() => { setIsAddingCategory(v => !v); setIsAddingAccount(false); setNewCategoryName(""); }}
                                            className={cn("shrink-0", isAddingCategory && "border-blue-500 text-blue-600")}
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    {err.categoryId && <p className="text-xs text-red-500">Selecione ou crie uma categoria.</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs text-slate-500">Subcategoria <span className="text-red-500">*</span></Label>
                                    <Input
                                        placeholder="Ex: Geral, Preventiva..."
                                        value={subcategoryName}
                                        onChange={(e) => setSubcategoryName(e.target.value)}
                                        className={fieldCls(err.subcategoryName)}
                                    />
                                    {err.subcategoryName && <p className="text-xs text-red-500">Campo obrigatório.</p>}
                                </div>
                            </div>

                            {isAddingCategory && (
                                <div className="flex gap-2 items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <Input
                                        placeholder="Nome da nova categoria..."
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        className="flex-1 bg-white"
                                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleCreateCategory(); } }}
                                        autoFocus
                                    />
                                    <Button type="button" size="sm" onClick={() => void handleCreateCategory()}
                                        disabled={isCreatingCat || !newCategoryName.trim()}
                                        className="bg-blue-600 hover:bg-blue-700 shrink-0">
                                        {isCreatingCat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                        Criar
                                    </Button>
                                    <Button type="button" size="sm" variant="ghost" onClick={() => setIsAddingCategory(false)} disabled={isCreatingCat}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Conta Bancária */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label>Conta Bancária <span className="text-red-500">*</span></Label>
                                <button
                                    type="button"
                                    onClick={() => openFinanceModal("contas")}
                                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                    tabIndex={-1}
                                >
                                    <Settings2 className="h-3 w-3" /> Gerenciar contas
                                </button>
                            </div>

                            <div className="flex gap-2">
                                <Select value={accountId} onValueChange={setAccountId}>
                                    <SelectTrigger className={cn("flex-1", fieldCls(err.accountId))}>
                                        <SelectValue placeholder="Selecione uma conta..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {bankAccounts.length === 0
                                            ? <div className="px-3 py-4 text-sm text-slate-500 text-center">Nenhuma conta cadastrada.</div>
                                            : bankAccounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)
                                        }
                                    </SelectContent>
                                </Select>
                                <Button
                                    type="button" variant="outline" size="icon" title="Nova conta"
                                    onClick={() => { setIsAddingAccount(v => !v); setIsAddingCategory(false); setNewAccountName(""); }}
                                    className={cn("shrink-0", isAddingAccount && "border-blue-500 text-blue-600")}
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            {err.accountId && <p className="text-xs text-red-500">Selecione ou crie uma conta bancária.</p>}

                            {isAddingAccount && (
                                <div className="flex gap-2 items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <Input
                                        placeholder="Nome da conta (ex: Caixa, BB, CEF...)"
                                        value={newAccountName}
                                        onChange={(e) => setNewAccountName(e.target.value)}
                                        className="flex-1 bg-white"
                                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleCreateAccount(); } }}
                                        autoFocus
                                    />
                                    <Button type="button" size="sm" onClick={() => void handleCreateAccount()}
                                        disabled={isCreatingAccount || !newAccountName.trim()}
                                        className="bg-blue-600 hover:bg-blue-700 shrink-0">
                                        {isCreatingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                        Criar
                                    </Button>
                                    <Button type="button" size="sm" variant="ghost" onClick={() => setIsAddingAccount(false)} disabled={isCreatingAccount}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Rastreabilidade Fiscal */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Separator className="flex-1" />
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5">
                                    <FileText className="h-3.5 w-3.5" />
                                    Rastreabilidade Fiscal
                                </span>
                                <Separator className="flex-1" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* CPF/CNPJ com máscara automática */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs">CPF/CNPJ do Fornecedor <span className="text-red-500">*</span></Label>
                                    <Input
                                        placeholder="000.000.000-00 ou 00.000.000/0001-00"
                                        value={providerDocument}
                                        onChange={(e) => setProviderDocument(formatDocument(e.target.value))}
                                        className={fieldCls(err.providerDocument)}
                                        inputMode="numeric"
                                    />
                                    {err.providerDocument
                                        ? <p className="text-xs text-red-500">Campo obrigatório.</p>
                                        : providerDocument.length > 0 && (
                                            <p className="text-xs text-slate-400">
                                                {providerDocument.replace(/\D/g, "").length <= 11 ? "CPF" : "CNPJ"}
                                            </p>
                                        )
                                    }
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Número da NF-e <span className="text-red-500">*</span></Label>
                                    <Input
                                        placeholder="Ex: 123456"
                                        value={nfeNumber}
                                        onChange={(e) => setNfeNumber(e.target.value)}
                                        className={fieldCls(err.nfeNumber)}
                                    />
                                    {err.nfeNumber && <p className="text-xs text-red-500">Campo obrigatório.</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">N° Empenho <span className="text-red-500">*</span></Label>
                                    <Input
                                        placeholder="Ex: 2026NE001"
                                        value={empenhoNumber}
                                        onChange={(e) => setEmpenhoNumber(e.target.value)}
                                        className={fieldCls(err.empenhoNumber)}
                                    />
                                    {err.empenhoNumber && <p className="text-xs text-red-500">Campo obrigatório.</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">N° Liquidação <span className="text-red-500">*</span></Label>
                                    <Input
                                        placeholder="Ex: 2026NL001"
                                        value={liquidacaoNumber}
                                        onChange={(e) => setLiquidacaoNumber(e.target.value)}
                                        className={fieldCls(err.liquidacaoNumber)}
                                    />
                                    {err.liquidacaoNumber && <p className="text-xs text-red-500">Campo obrigatório.</p>}
                                </div>
                            </div>

                            {/* Datas fiscais com datepicker */}
                            <div className="grid grid-cols-2 gap-4">
                                <DatePickerField
                                    label="Data de Emissão (NF-e)" required
                                    date={issueDate} onChange={setIssueDate}
                                    invalid={err.issueDate}
                                />
                                <DatePickerField
                                    label="Data de Entrega" required
                                    date={deliveryDate} onChange={setDeliveryDate}
                                    invalid={err.deliveryDate}
                                />
                            </div>
                        </div>

                        {/* Valor */}
                        <div className="space-y-1.5">
                            <Label>Valor (R$) <span className="text-red-500">*</span></Label>
                            <Input
                                placeholder="0,00"
                                type="text"
                                value={amountStr}
                                onChange={(e) => setAmountStr(formatCurrencyInput(e.target.value))}
                                className={cn("text-lg font-semibold", fieldCls(err.amountStr))}
                            />
                            {err.amountStr && <p className="text-xs text-red-500">Informe um valor maior que zero.</p>}
                        </div>

                        {/* Anexos */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <Separator className="flex-1" />
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5">
                                    <Paperclip className="h-3.5 w-3.5" />
                                    Anexos
                                </span>
                                <Separator className="flex-1" />
                            </div>

                            {entry && loadingAttachments && (
                                <div className="flex items-center gap-2 text-sm text-slate-500 py-1">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Carregando anexos salvos...
                                </div>
                            )}

                            {entry && existingAttachments.length > 0 && (
                                <ul className="space-y-2">
                                    {existingAttachments.map(att => {
                                        const isImage = att.contentType?.startsWith("image/");
                                        return (
                                            <li key={att.id} className="flex items-center justify-between p-2.5 border border-slate-200 bg-slate-50 rounded-lg">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    {isImage ? <ImageIcon className="h-4 w-4 text-emerald-500 shrink-0" /> : <FileText className="h-4 w-4 text-blue-500 shrink-0" />}
                                                    <div className="flex flex-col truncate">
                                                        <a href={att.url || "#"} target="_blank" rel="noreferrer"
                                                            className="text-sm font-medium text-slate-700 hover:underline hover:text-blue-600 truncate">
                                                            {att.fileName}
                                                        </a>
                                                        <span className="text-xs text-slate-400">{(att.fileSize / 1024).toFixed(1)} KB • Salvo na nuvem</span>
                                                    </div>
                                                </div>
                                                <Button type="button" size="icon" variant="ghost"
                                                    className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                                                    onClick={() => setDeletingAttId(att.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}

                            {selectedFiles.length > 0 && (
                                <ul className="space-y-2">
                                    {selectedFiles.map((file, index) => (
                                        <li key={`${file.name}-${index}`}
                                            className="flex items-center justify-between p-2.5 border border-emerald-200 bg-emerald-50 rounded-lg">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <Paperclip className="h-4 w-4 text-emerald-600 shrink-0" />
                                                <div className="flex flex-col truncate">
                                                    <span className="text-sm font-medium text-emerald-800 truncate">{file.name}</span>
                                                    <span className="text-xs text-emerald-600/70">{(file.size / 1024).toFixed(1)} KB • Aguardando salvamento</span>
                                                </div>
                                            </div>
                                            <button type="button"
                                                onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
                                                className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 rounded-full shrink-0">
                                                <X className="h-4 w-4" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            <label htmlFor="file-upload"
                                className="flex items-center justify-center w-full h-14 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50/30 transition-colors">
                                <span className="flex items-center gap-2 text-sm text-slate-500">
                                    <Paperclip className="h-4 w-4" />
                                    Anexar comprovantes ou notas fiscais (PDF, imagem)
                                </span>
                                <input id="file-upload" type="file" multiple className="hidden"
                                    accept="image/*,application/pdf" onChange={handleFileChange} />
                            </label>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                                Cancelar
                            </Button>
                            <Button type="submit" className="bg-[#0A5BC4] hover:bg-[#094FA8]" disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {entry ? "Salvar Alterações" : "Criar Lançamento"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={!!deletingAttId} onOpenChange={(o) => !o && setDeletingAttId(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-red-100">
                            <AlertTriangle className="h-6 w-6 text-red-600" />
                        </div>
                        <DialogTitle className="text-center">Remover Anexo?</DialogTitle>
                        <DialogDescription className="text-center">
                            O arquivo será excluído permanentemente da nuvem.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-center gap-2">
                        <Button variant="outline" onClick={() => setDeletingAttId(null)}>Cancelar</Button>
                        <Button variant="destructive" onClick={confirmDeleteAttachment}>Sim, Remover</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
