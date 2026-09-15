import { useState } from "react";
import { CalendarDays, Loader2, Plus, Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { HOLIDAY_SCOPE_LABELS, type HolidayScope } from "@/lib/api/holidays";
import { useCreateHoliday, useDeleteHoliday, useHolidays } from "@/hooks/useHolidays";

/**
 * Cadastro de feriados (Épico 8, FR-020).
 *
 * Cada organização mantém seu próprio calendário: feriado nacional é raro
 * gerar diária de fim de semana, mas feriado MUNICIPAL (padroeiro,
 * aniversário da cidade) é o caso real que a regra do TCE precisa cobrir, e
 * nenhuma biblioteca genérica sabe qual é o padroeiro de cada município.
 */

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function HolidaysDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const { data: holidays, isLoading } = useHolidays();
  const create = useCreateHoliday();
  const deleteMut = useDeleteHoliday();

  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [scope, setScope] = useState<HolidayScope>("MUNICIPAL");

  async function handleAdd() {
    if (!date || !name.trim()) {
      toast({ title: "Informe a data e o nome do feriado.", variant: "destructive" });
      return;
    }
    try {
      await create.mutateAsync({ date, name: name.trim(), scope });
      setDate("");
      setName("");
      toast({ title: "Feriado cadastrado." });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Não foi possível cadastrar.";
      toast({ title: "Erro ao cadastrar", description: message, variant: "destructive" });
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMut.mutateAsync(id);
      toast({ title: "Feriado removido." });
    } catch {
      toast({ title: "Não foi possível remover o feriado.", variant: "destructive" });
    }
  }

  // Mais próximo primeiro — é o que interessa na hora de conferir o calendário.
  const sorted = [...(holidays ?? [])].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Feriados
          </DialogTitle>
          <DialogDescription>
            Datas usadas no alerta de diária em fim de semana/feriado (regra do TCE).
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[auto_1fr_auto_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="holiday-date">Data</Label>
            <Input id="holiday-date" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="holiday-name">Nome</Label>
            <Input
              id="holiday-name"
              placeholder="Aniversário do Município"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="holiday-scope">Abrangência</Label>
            <Select value={scope} onValueChange={next => setScope(next as HolidayScope)}>
              <SelectTrigger id="holiday-scope" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(HOLIDAY_SCOPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" size="icon" onClick={handleAdd} disabled={create.isPending}>
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>

        <div className="max-h-64 overflow-y-auto rounded-md border border-slate-100">
          {isLoading && (
            <p className="p-4 text-center text-sm text-slate-400">Carregando...</p>
          )}
          {!isLoading && sorted.length === 0 && (
            <p className="p-4 text-center text-sm text-slate-400">Nenhum feriado cadastrado.</p>
          )}
          {sorted.map(holiday => (
            <div
              key={holiday.id}
              className="flex items-center justify-between border-b border-slate-50 px-3 py-2 text-sm last:border-b-0"
            >
              <div>
                <span className="font-mono text-slate-500">{formatDate(holiday.date)}</span>
                <span className="ml-2 text-slate-700">{holiday.name}</span>
                <span className="ml-2 text-xs text-slate-400">
                  {HOLIDAY_SCOPE_LABELS[holiday.scope]}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(holiday.id)}>
                <Trash2 className="h-3.5 w-3.5 text-red-600" />
              </Button>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
