import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FinanceEntry, EntryType } from "../types";

import { useToast } from "@/hooks/use-toast";
import { useParams } from "react-router-dom";
import { useFinanceCategories, useCreateFinanceCategory, useCreateFinanceEntry, useUpdateFinanceEntry } from "@/hooks/useFinance";

interface EntryFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entry: FinanceEntry | null;
    onSuccessSave: () => void;
}

export function EntryFormDialog({ open, onOpenChange, entry, onSuccessSave }: EntryFormDialogProps) {
    const [description, setDescription] = useState("");
    const [occurredAt, setOccurredAt] = useState("");
    const [type, setType] = useState<EntryType>("EXPENSE");
    const [categoryName, setCategoryName] = useState("");
    const [amountStr, setAmountStr] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const { workspaceId } = useParams();
    const { toast } = useToast();
    const { data: categories = [] } = useFinanceCategories(workspaceId);
    const { mutateAsync: createCategory } = useCreateFinanceCategory(workspaceId);
    const { mutateAsync: createEntry } = useCreateFinanceEntry(workspaceId);
    const { mutateAsync: updateEntry } = useUpdateFinanceEntry(workspaceId);

    useEffect(() => {
        if (open) {
            if (entry) {
                setDescription(entry.description);
                setType(entry.type);
                setCategoryName(entry.categoryName);
                setAmountStr((entry.amountCents / 100).toFixed(2));
                setOccurredAt(entry.occurredAt.split("T")[0]); // YYYY-MM-DD
            } else {
                setDescription("");
                setType("EXPENSE");
                setCategoryName("");
                setAmountStr("");
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                setOccurredAt(`${yyyy}-${mm}-${dd}`);
            }
        }
    }, [open, entry]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!description || !categoryName || !amountStr || !occurredAt) return;

        setIsSaving(true);
        try {
            // Convert BRL float string (e.g. "150.50" or "150,50") to cents
            let parsedAmount = amountStr.replace(",", ".");
            let cents = Math.round(parseFloat(parsedAmount) * 100);
            if (isNaN(cents)) cents = 0;

            // Build ISO Date from date string
            const isoDate = new Date(occurredAt).toISOString();

            // Find or create category on the fly
            let categoryId: string | undefined;
            const existingCat = categories.find(c => c.name === categoryName);
            if (existingCat) {
                categoryId = existingCat.id;
            } else {
                const newCat = await createCategory({ name: categoryName });
                categoryId = newCat.id;
            }

            const payload = {
                description,
                type,
                categoryId,
                amountCents: cents,
                occurredAt: isoDate,
            };

            if (entry) {
                await updateEntry({ id: entry.id, data: payload });
            } else {
                await createEntry(payload);
            }

            toast({ title: "Sucesso", description: entry ? "Lançamento atualizado." : "Lançamento criado." });
            onSuccessSave();
        } catch (error: any) {
            console.error("Save entry error:", error);
            toast({ title: "Erro", description: error?.message || "Ocorreu um erro ao salvar.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
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
                                type="date"
                                required
                                value={occurredAt}
                                onChange={(e) => setOccurredAt(e.target.value)}
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
                            <Label htmlFor="amountStr">Valor (R$)</Label>
                            <Input
                                id="amountStr"
                                required
                                placeholder="0.00"
                                step="0.01"
                                type="number"
                                value={amountStr}
                                onChange={(e) => setAmountStr(e.target.value)}
                            />
                        </div>
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
        </Dialog>
    );
}
