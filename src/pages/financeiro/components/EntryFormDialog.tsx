import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FinanceEntry, EntryType } from "../types";

import { useToast } from "@/hooks/use-toast";
import { useParams } from "react-router-dom";
import { useFinanceCategories, useCreateFinanceCategory, useCreateFinanceEntry, useUpdateFinanceEntry, useFinanceAttachments, useDeleteAttachment, useFinanceBankAccounts } from "@/hooks/useFinance";
import { useQueryClient } from "@tanstack/react-query";
import { Paperclip, X, Image as ImageIcon, FileText, Trash2, Loader2, AlertTriangle } from "lucide-react";

interface EntryFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entry: FinanceEntry | null;
    onSuccessSave: () => void;
}

// --- HELPERS DE FORMATAÇÃO ---
function formatCurrencyInput(val: string) {
    const digits = val.replace(/\D/g, "");
    if (!digits) return "";
    const cents = parseInt(digits, 10);
    return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

function formatDateInput(val: string) {
    let digits = val.replace(/\D/g, "");
    if (digits.length > 8) digits = digits.substring(0, 8);
    if (digits.length >= 5) {
        return `${digits.substring(0, 2)}/${digits.substring(2, 4)}/${digits.substring(4)}`;
    } else if (digits.length >= 3) {
        return `${digits.substring(0, 2)}/${digits.substring(2)}`;
    }
    return digits;
}

export function EntryFormDialog({ open, onOpenChange, entry, onSuccessSave }: EntryFormDialogProps) {
    const [description, setDescription] = useState("");
    const [occurredAt, setOccurredAt] = useState("");
    const [type, setType] = useState<EntryType>("EXPENSE");
    const [categoryName, setCategoryName] = useState("");
    const [amountStr, setAmountStr] = useState("");

    // Novas Metas (Campos Opcionais na tipagem, mas exigidos em regra de negócio)
    const [subcategoryName, setSubcategoryName] = useState("");
    const [nfeNumber, setNfeNumber] = useState("");
    const [providerDocument, setProviderDocument] = useState(""); // CPF/CNPJ
    const [empenhoNumber, setEmpenhoNumber] = useState("");
    const [liquidacaoNumber, setLiquidacaoNumber] = useState("");
    const [issueDate, setIssueDate] = useState(""); // Data Emissão NF (DD/MM/AAAA)
    const [deliveryDate, setDeliveryDate] = useState(""); // Data Entrega (DD/MM/AAAA)

    const [accountId, setAccountId] = useState<string>("");
    const [isSaving, setIsSaving] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [deletingAttId, setDeletingAttId] = useState<string | null>(null);

    const { data: existingAttachments = [], isLoading: loadingAttachments } = useFinanceAttachments(entry?.id || "");
    const { mutate: deleteAttachment } = useDeleteAttachment(entry?.id || "");

    const { workspaceId } = useParams();
    const { toast } = useToast();
    const { data: categories = [] } = useFinanceCategories(workspaceId);
    const { data: bankAccounts = [] } = useFinanceBankAccounts(workspaceId);
    const { mutateAsync: createCategory } = useCreateFinanceCategory(workspaceId);
    const { mutateAsync: createEntry } = useCreateFinanceEntry(workspaceId);
    const { mutateAsync: updateEntry } = useUpdateFinanceEntry(workspaceId);
    const queryClient = useQueryClient();

    useEffect(() => {
        if (open) {
            if (entry) {
                setDescription(entry.description);
                setType(entry.type);
                setCategoryName(entry.categoryName);
                setAmountStr((entry.amountCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 }));
                setAccountId((entry as FinanceEntry & { accountId?: string }).accountId ?? "");
                const [y, m, d] = entry.occurredAt.split("T")[0].split("-");
                setOccurredAt(`${d}/${m}/${y}`);

                setSubcategoryName(entry.subcategoryName || "");
                setNfeNumber(entry.nfeNumber || "");
                setProviderDocument(entry.providerDocument || "");
                setEmpenhoNumber(entry.empenhoNumber || "");
                setLiquidacaoNumber(entry.liquidacaoNumber || "");

                if (entry.issueDate) {
                    const [iy, im, id] = entry.issueDate.split("T")[0].split("-");
                    setIssueDate(`${id}/${im}/${iy}`);
                } else setIssueDate("");

                if (entry.deliveryDate) {
                    const [dy, dm, dd] = entry.deliveryDate.split("T")[0].split("-");
                    setDeliveryDate(`${dd}/${dm}/${dy}`);
                } else setDeliveryDate("");

                setSelectedFiles([]);
            } else {
                setDescription("");
                setType("EXPENSE");
                setCategoryName("");
                setAmountStr("");
                setAccountId("");
                const today = new Date();
                const dd = String(today.getDate()).padStart(2, '0');
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const yyyy = today.getFullYear();
                setOccurredAt(`${dd}/${mm}/${yyyy}`);

                setSubcategoryName("");
                setNfeNumber("");
                setProviderDocument("");
                setEmpenhoNumber("");
                setLiquidacaoNumber("");
                setIssueDate("");
                setDeliveryDate("");

                setSelectedFiles([]);
            }
        }
    }, [open, entry]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!description || !categoryName || !amountStr || !occurredAt) return;

        setIsSaving(true);
        try {
            // Convert BRL format string (e.g. "1.000,50") to cents safely
            const digits = amountStr.replace(/\D/g, "");
            let cents = parseInt(digits, 10);
            if (isNaN(cents)) cents = 0;

            // Build ISO Date from DD/MM/YYYY text
            const [dd, mm, yyyy] = occurredAt.split("/");
            if (!dd || !mm || !yyyy || yyyy.length !== 4) {
                toast({ title: "Atenção", description: "Data inválida ou incompleta.", variant: "destructive" });
                setIsSaving(false);
                return;
            }
            const isoDate = new Date(`${yyyy}-${mm}-${dd}T12:00:00Z`).toISOString();

            // Find or create category on the fly
            let categoryId: string | undefined;
            const existingCat = categories.find(c => c.name === categoryName);
            if (existingCat) {
                categoryId = existingCat.id;
            } else {
                const newCat = await createCategory({ name: categoryName });
                categoryId = newCat.id;
            }

            // Build ISO Date from DD/MM/YYYY text para campos auxiliares
            let isoIssueDate, isoDeliveryDate;
            if (issueDate) {
                const [dd, mm, yyyy] = issueDate.split("/");
                if (dd && mm && yyyy?.length === 4) isoIssueDate = new Date(`${yyyy}-${mm}-${dd}T12:00:00Z`).toISOString();
            }
            if (deliveryDate) {
                const [dd, mm, yyyy] = deliveryDate.split("/");
                if (dd && mm && yyyy?.length === 4) isoDeliveryDate = new Date(`${yyyy}-${mm}-${dd}T12:00:00Z`).toISOString();
            }

            const payload = {
                description,
                type,
                categoryId,
                accountId: accountId || undefined,
                amountCents: cents,
                occurredAt: isoDate,
                subcategoryName: subcategoryName || undefined,
                nfeNumber: nfeNumber || undefined,
                providerDocument: providerDocument || undefined,
                empenhoNumber: empenhoNumber || undefined,
                liquidacaoNumber: liquidacaoNumber || undefined,
                issueDate: isoIssueDate,
                deliveryDate: isoDeliveryDate,
            };

            let savedEntry: FinanceEntry;

            if (entry) {
                savedEntry = await updateEntry({ id: entry.id, data: payload }) as FinanceEntry;
            } else {
                savedEntry = await createEntry(payload) as FinanceEntry;
            }

            // Upload Attachments se existirem novos
            if (selectedFiles.length > 0 && savedEntry?.id) {
                try {
                    const { financeService } = await import("../../../lib/api/finance");
                    await Promise.all(
                        selectedFiles.map(file => financeService.uploadAttachment(savedEntry.id, file))
                    );
                    queryClient.invalidateQueries({ queryKey: ["financeEntries"] });
                } catch (uploadError) {
                    console.error("Erro ao subir anexo", uploadError);
                    toast({ title: "Atenção", description: "Lançamento salvo, mas algum anexo falhou.", variant: "destructive" });
                    queryClient.invalidateQueries({ queryKey: ["financeEntries"] });
                    return onSuccessSave();
                }
            } else {
                // If it was just an update without new files, invalidate it anyway to be safe
                queryClient.invalidateQueries({ queryKey: ["financeEntries"] });
            }

            toast({ title: "Sucesso", description: entry ? "Lançamento atualizado." : "Lançamento criado." });
            onSuccessSave();
        } catch (error: any) {
            console.error("Save entry error:", error);
            const raw = error?.message;
            const msg = typeof raw === 'string' && raw.length <= 100
                ? raw
                : "Verifique os campos e tente novamente.";
            toast({ title: "Erro ao salvar lançamento", description: msg, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setSelectedFiles(prev => {
                const existingNames = new Set(prev.map(f => f.name));
                const filteredNew = newFiles.filter(f => !existingNames.has(f.name));
                return [...prev, ...filteredNew];
            });
        }
    }

    function removeSelectedFile(index: number) {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    }

    function handleDeleteExistingAttachment(attId: string) {
        setDeletingAttId(attId);
    }

    function confirmDeleteAttachment() {
        if (!deletingAttId) return;
        deleteAttachment(deletingAttId, {
            onSuccess: () => {
                toast({ title: "Sucesso", description: "Anexo removido da nuvem." });
                setDeletingAttId(null);
            },
            onError: () => toast({ title: "Erro", description: "Falha ao remover anexo.", variant: "destructive" })
        });
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{entry ? "Editar Lançamento" : "Novo Lançamento"}</DialogTitle>
                        <DialogDescription>
                            {entry ? "Altere as informações do lançamento abaixo." : "Preencha os dados do novo lançamento financeiro."}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="type">Tipo</Label>
                                <Select value={type} onValueChange={(v) => setType(v as EntryType)}>
                                    <SelectTrigger id="type">
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="EXPENSE">Despesa</SelectItem>
                                        <SelectItem value="INCOME">Receita</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="occurredAt">Data</Label>
                                <Input
                                    id="occurredAt"
                                    type="text"
                                    required
                                    placeholder="DD/MM/AAAA"
                                    maxLength={10}
                                    value={occurredAt}
                                    onChange={(e) => setOccurredAt(formatDateInput(e.target.value))}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Descrição</Label>
                            <Input
                                id="description"
                                required
                                placeholder="Ex: Compra de materiais..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="categoryName">Categoria</Label>
                                <Input
                                    id="categoryName"
                                    list="categories-list"
                                    required
                                    placeholder="Ex: Manutenção, TI..."
                                    value={categoryName}
                                    onChange={(e) => setCategoryName(e.target.value)}
                                />
                                <datalist id="categories-list">
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.name} />
                                    ))}
                                </datalist>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="subcategoryName">Subcategoria <span className="text-red-500">*</span></Label>
                                <Input
                                    id="subcategoryName"
                                    placeholder="Ex: Geral, Manutenção Preventiva..."
                                    value={subcategoryName}
                                    onChange={(e) => setSubcategoryName(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {bankAccounts.length > 0 && (
                            <div className="space-y-2">
                                <Label htmlFor="accountId">Conta Bancária</Label>
                                <Select value={accountId} onValueChange={setAccountId}>
                                    <SelectTrigger id="accountId">
                                        <SelectValue placeholder="Selecionar conta (opcional)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {bankAccounts.map(acc => (
                                            <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* --- INÍCIO: NOVOS CAMPOS PARA RASTREABILIDADE PÚBLICA (OPCIONAIS NA UI, MAS EXIGIDOS NA ROTINA) --- */}
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 space-y-4">
                            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-slate-500" />
                                Rastreabilidade Fiscal
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="providerDocument" className="text-xs">CPF/CNPJ do Fornecedor <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="providerDocument"
                                        placeholder="00.000.000/0001-00"
                                        value={providerDocument}
                                        onChange={(e) => setProviderDocument(e.target.value)}
                                        className="bg-white"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="nfeNumber" className="text-xs">Número da NF-e <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="nfeNumber"
                                        placeholder="Ex: 123456"
                                        value={nfeNumber}
                                        onChange={(e) => setNfeNumber(e.target.value)}
                                        className="bg-white"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="empenhoNumber" className="text-xs">N° Empenho <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="empenhoNumber"
                                        placeholder="Ex: 2024NE001"
                                        value={empenhoNumber}
                                        onChange={(e) => setEmpenhoNumber(e.target.value)}
                                        className="bg-white"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="liquidacaoNumber" className="text-xs">N° Liquidação <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="liquidacaoNumber"
                                        placeholder="Ex: 2024NL002"
                                        value={liquidacaoNumber}
                                        onChange={(e) => setLiquidacaoNumber(e.target.value)}
                                        className="bg-white"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="issueDate" className="text-xs">Data de Emissão (NF-e) <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="issueDate"
                                        placeholder="DD/MM/AAAA"
                                        maxLength={10}
                                        value={issueDate}
                                        onChange={(e) => setIssueDate(formatDateInput(e.target.value))}
                                        className="bg-white"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="deliveryDate" className="text-xs">Data de Entrega <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="deliveryDate"
                                        placeholder="DD/MM/AAAA"
                                        maxLength={10}
                                        value={deliveryDate}
                                        onChange={(e) => setDeliveryDate(formatDateInput(e.target.value))}
                                        className="bg-white"
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                        {/* --- FIM: NOVOS CAMPOS --- */}
                        <div className="space-y-2">
                            <Label htmlFor="amountStr">Valor (R$)</Label>
                            <Input
                                id="amountStr"
                                required
                                placeholder="0,00"
                                type="text"
                                value={amountStr}
                                onChange={(e) => setAmountStr(formatCurrencyInput(e.target.value))}
                            />
                        </div>

                        {/* Area de Upload de Anexo */}
                        <div className="space-y-3 pt-2">
                            <Label>Anexos (Comprovantes ou Notas Fiscais)</Label>

                            {/* Lista de Anexos Existentes (já na nuvem) */}
                            {entry && loadingAttachments && (
                                <div className="flex items-center justify-center py-2 text-sm text-slate-500">
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Carregando anexos salvos...
                                </div>
                            )}
                            {entry && existingAttachments.length > 0 && (
                                <ul className="space-y-2">
                                    {existingAttachments.map(att => {
                                        const isImage = att.contentType?.startsWith('image/');
                                        return (
                                            <li key={att.id} className="flex items-center justify-between p-2.5 border border-slate-200 bg-slate-50 rounded-md">
                                                <div className="flex items-center space-x-3 overflow-hidden">
                                                    {isImage ? (
                                                        <ImageIcon className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                                                    ) : (
                                                        <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                                    )}
                                                    <div className="flex flex-col truncate">
                                                        <a href={att.url || "#"} target="_blank" rel="noreferrer" className="text-sm font-medium text-slate-700 hover:underline hover:text-blue-600 truncate">
                                                            {att.fileName}
                                                        </a>
                                                        <span className="text-xs text-slate-400">{(att.fileSize / 1024).toFixed(1)} KB • Salvo na Nuvem</span>
                                                    </div>
                                                </div>
                                                <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0" onClick={() => handleDeleteExistingAttachment(att.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}

                            {/* Lista de Novos Arquivos Selecionados */}
                            {selectedFiles.length > 0 && (
                                <ul className="space-y-2 mt-2">
                                    {selectedFiles.map((file, index) => (
                                        <li key={`${file.name}-${index}`} className="flex items-center justify-between p-2.5 border border-emerald-200 bg-emerald-50 rounded-md">
                                            <div className="flex items-center space-x-3 overflow-hidden">
                                                <Paperclip className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                                <div className="flex flex-col truncate">
                                                    <span className="text-sm font-medium text-emerald-800 truncate">
                                                        {file.name}
                                                    </span>
                                                    <span className="text-xs text-emerald-600/70">{(file.size / 1024).toFixed(1)} KB • Aguardando salvamento</span>
                                                </div>
                                            </div>
                                            <button type="button" onClick={() => removeSelectedFile(index)} className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 rounded-full transition-colors flex-shrink-0">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            <label htmlFor="file-upload" className="flex items-center justify-center w-full h-16 mt-2 transition bg-white border-2 border-dashed border-gray-300 rounded-md appearance-none cursor-pointer hover:border-[#0A5BC4] focus:outline-none focus:ring-2 focus:ring-[#0A5BC4]">
                                <span className="flex items-center space-x-2 text-sm text-gray-600">
                                    <Paperclip className="w-4 h-4 text-gray-400" />
                                    <span>Anexar mais arquivos (PDF ou Imagem)</span>
                                </span>
                                <input id="file-upload" type="file" multiple className="hidden" accept="image/*,application/pdf" onChange={handleFileChange} />
                            </label>
                        </div>

                        <DialogFooter className="mt-6">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                                Cancelar
                            </Button>
                            <Button type="submit" className="bg-[#0A5BC4] hover:bg-[#094FA8] text-white" disabled={isSaving}>
                                {isSaving ? "Salvando..." : "Salvar"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog >

            {/* Modal de Confirmação de Exclusão do Anexo */}
            < Dialog open={!!deletingAttId
            } onOpenChange={(open) => !open && setDeletingAttId(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-red-100">
                            <AlertTriangle className="h-6 w-6 text-red-600" />
                        </div>
                        <DialogTitle className="text-center">Remover Anexo Existente?</DialogTitle>
                        <DialogDescription className="text-center">
                            Tem certeza que deseja remover este anexo? O arquivo será excluído da nuvem permanentemente.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-center gap-2">
                        <Button variant="outline" onClick={() => setDeletingAttId(null)}>Cancelar</Button>
                        <Button variant="destructive" onClick={confirmDeleteAttachment}>
                            Sim, Remover
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >
        </>
    );
}
