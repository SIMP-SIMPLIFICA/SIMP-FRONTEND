import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Loader2, AlertTriangle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

/**
 * Kit compartilhado para telas de "Configurações de Dados" — pequenas listas
 * de cadastro livre (nome, ou nome+CNPJ) com criar/editar/excluir.
 *
 * Extraído do par de componentes quase-idênticos já existentes em
 * `pages/processos-virtuais/Configuracoes.tsx` e
 * `components/processos-virtuais/UniversalProcessModal.tsx` (achado de bug,
 * 2026-09-24 — as duas cópias já divergiram uma vez em produção). Esta versão
 * é a base para novos usos (ex: Convênios, Fase 3) — os dois arquivos de
 * Processos Virtuais continuam como estão por ora; migrá-los para cá é a
 * consolidação recomendada, não feita ainda para não misturar refactor com
 * fix/feature.
 */

// ─── Tipos genéricos ──────────────────────────────────────────────────────────

export interface SimpleItem {
  id: string;
  name: string;
}

export interface EntityItem {
  id: string;
  name: string;
  cnpj?: string | null;
}

// ─── Dialog de criar/editar (nome só) ─────────────────────────────────────────

export interface SimpleFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: SimpleItem | null;
  label: string;
  placeholder: string;
  onSave: (name: string, id?: string) => Promise<void>;
  /**
   * Normaliza o texto ANTES de comparar contra `existingNames` e de salvar
   * (ex: Title Case, ou só limpeza de espaços quando o texto pode ter siglas
   * — ver `@/lib/string-utils`). Sem esta prop, salva exatamente como
   * digitado.
   */
  normalize?: (raw: string) => string;
  /** Nomes já cadastrados — bloqueia duplicata client-side (comparação sem caixa). */
  existingNames?: string[];
  onError?: (error: unknown) => void;
}

export function SimpleFormDialog({
  open,
  onOpenChange,
  item,
  label,
  placeholder,
  onSave,
  normalize,
  existingNames,
  onError,
}: SimpleFormDialogProps) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset ao abrir — via efeito ligado ao PROP `open`, não dentro de um
  // wrapper de `onOpenChange` (achado da revisão final da Fase 1,
  // 2026-09-24): o Radix só chama `onOpenChange` quando é ELE quem pede a
  // mudança (Esc, clique fora) — nunca quando o consumidor muda o prop
  // `open` de fora, como um botão "Nova"/"Editar" externo faz.
  useEffect(() => {
    if (open) setName(item?.name ?? "");
  }, [open, item]);

  const normalizedName = normalize ? normalize(name) : name.trim();
  const alreadyExists = Boolean(
    normalizedName &&
      existingNames?.some(
        n =>
          n.toLowerCase() === normalizedName.toLowerCase() &&
          n.toLowerCase() !== (item?.name ?? "").toLowerCase()
      )
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!normalizedName) return;
    // Defesa igual à do botão desabilitado — Enter no campo pode disparar o
    // submit mesmo com o botão de salvar desabilitado.
    if (alreadyExists) return;
    setSaving(true);
    try {
      await onSave(normalizedName, item?.id);
      onOpenChange(false);
    } catch (err) {
      onError?.(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? `Editar ${label}` : `Novo ${label}`}</DialogTitle>
          <DialogDescription>
            {item ? `Altere o nome de "${item.name}".` : `Informe o nome para o novo ${label.toLowerCase()}.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>
              Nome <span className="text-red-500">*</span>
            </Label>
            <Input required placeholder={placeholder} value={name} onChange={e => setName(e.target.value)} />
            {alreadyExists && (
              <p className="text-xs text-red-600">
                "{normalizedName}" já existe — escolha outro nome ou edite o já cadastrado na lista.
              </p>
            )}
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || alreadyExists}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {item ? "Salvar" : `Criar ${label}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog de criar/editar (nome + CNPJ) ────────────────────────────────────

export interface EntityFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: EntityItem | null;
  label: string;
  onSave: (data: { name: string; cnpj?: string | null }, id?: string) => Promise<void>;
  /** Empresas/entidades já cadastradas — bloqueia CNPJ duplicado (comparação só por dígitos). */
  existingEntities?: EntityItem[];
  onError?: (error: unknown) => void;
}

/** Só dígitos — pra "12.345.678/0001-99" e "12345678000199" compararem iguais. */
function cnpjDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function EntityFormDialog({
  open,
  onOpenChange,
  item,
  label,
  onSave,
  existingEntities,
  onError,
}: EntityFormDialogProps) {
  const [form, setForm] = useState({ name: "", cnpj: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm({ name: item?.name ?? "", cnpj: item?.cnpj ?? "" });
  }, [open, item]);

  const normalizedCnpj = cnpjDigits(form.cnpj);
  const cnpjAlreadyExists = Boolean(
    normalizedCnpj &&
      existingEntities?.some(e => e.id !== item?.id && cnpjDigits(e.cnpj ?? "") === normalizedCnpj)
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = form.name.trim();
    if (!trimmedName) return;
    // Defesa igual à do botão desabilitado — Enter no campo pode disparar o
    // submit mesmo com o botão de salvar desabilitado.
    if (cnpjAlreadyExists) return;
    setSaving(true);
    try {
      await onSave({ name: trimmedName, cnpj: form.cnpj.trim() || null }, item?.id);
      onOpenChange(false);
    } catch (err) {
      onError?.(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? `Editar ${label}` : `Novo ${label}`}</DialogTitle>
          <DialogDescription>
            {item ? `Altere os dados de "${item.name}".` : `Informe os dados do novo ${label.toLowerCase()}.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>
              Nome <span className="text-red-500">*</span>
            </Label>
            <Input required placeholder="Ex: Fundo Municipal de Saúde" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>CNPJ</Label>
            <Input placeholder="00.000.000/0001-00" value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} />
            {cnpjAlreadyExists && <p className="text-xs text-red-600">Já existe um registro com este CNPJ na lista.</p>}
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || cnpjAlreadyExists}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {item ? "Salvar" : `Criar ${label}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Confirmação de exclusão ──────────────────────────────────────────────────

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onOpenChange(false)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <DialogTitle className="text-center">Remover item?</DialogTitle>
          <DialogDescription className="text-center">Esta ação não pode ser desfeita.</DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sim, Remover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Seção colapsável + linha de item ─────────────────────────────────────────

export function ManagerSection({
  title,
  description,
  icon,
  isLoading,
  children,
  onNew,
  newLabel,
  defaultOpen = true,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  isLoading: boolean;
  children: React.ReactNode;
  onNew: () => void;
  newLabel: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer select-none hover:bg-slate-50 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100">{icon}</div>
          <div>
            <div className="text-sm font-semibold text-slate-800">{title}</div>
            <div className="text-xs text-slate-400">{description}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="h-7 px-3 text-xs gap-1.5" onClick={e => { e.stopPropagation(); onNew(); }}>
            <Plus className="h-3.5 w-3.5" />
            {newLabel}
          </Button>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-100">
          {isLoading ? (
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3">
                  <Skeleton className="h-4 w-40" />
                  <div className="flex gap-1">
                    <Skeleton className="h-6 w-6 rounded" />
                    <Skeleton className="h-6 w-6 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  );
}

export function ManagerItemRow({
  primary,
  secondary,
  onEdit,
  onDelete,
}: {
  primary: string;
  secondary?: string | null;
  /** Omitido quando o backend não tem endpoint de atualização para este item (ex: CovenantType/Convenente/Concedente) — some o lápis, não simula um "editar" que na prática criaria duplicata. */
  onEdit?: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-800 truncate">{primary}</div>
        {secondary && <div className="text-xs text-slate-400 truncate">{secondary}</div>}
      </div>
      <div className="flex items-center gap-1 shrink-0 ml-4">
        {onEdit && (
          <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-slate-700" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-500" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function ManagerEmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-slate-400">
      Nenhum {label} cadastrado ainda.
    </div>
  );
}
