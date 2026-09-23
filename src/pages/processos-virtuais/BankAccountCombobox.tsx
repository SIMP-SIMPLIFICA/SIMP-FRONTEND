import { useEffect, useRef, useState } from "react";
import { Landmark, Plus, Search, Settings2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useFinanceBankAccounts } from "@/hooks/useFinance";
import { AccountFormDialog } from "@/pages/financeiro/AccountFormDialog";
import type { BankAccount } from "@/lib/api/finance";

interface Props {
  departmentId: string | null | undefined;
  value: string | null | undefined; // bankAccountId selecionado
  onSelect: (account: BankAccount | null) => void;
}

/**
 * Combobox de conta bancária para o modal "Autuar Novo Processo".
 *
 * Filtra client-side por `departmentId` — `useFinanceBankAccounts` não tem
 * (nem precisa de) parâmetro de filtro: a lista de contas de uma prefeitura
 * é pequena, e filtrar aqui evita inventar um endpoint novo pra isso.
 *
 * Sem `departmentId`, fica desabilitado com uma instrução — mesmo padrão de
 * `QddItemSelect`: nunca mostra a lista inteira do município antes do
 * departamento ser escolhido.
 */
export function BankAccountCombobox({ departmentId, value, onSelect }: Props) {
  const { data: allAccounts = [], isLoading } = useFinanceBankAccounts();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const accounts = departmentId ? allAccounts.filter(a => a.departmentId === departmentId) : [];
  const selected = accounts.find(a => a.id === value) ?? null;

  // Departamento mudou e a conta selecionada não é mais dele — limpa, senão
  // o formulário submeteria a conta de outro setor.
  useEffect(() => {
    if (value && !accounts.some(a => a.id === value)) onSelect(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentId]);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const term = query.trim().toLowerCase();
  const suggestions = term ? accounts.filter(a => a.name.toLowerCase().includes(term)) : accounts;

  function label(a: BankAccount): string {
    return [a.name, a.agency && `Ag. ${a.agency}`, a.accountNumber && `Cc ${a.accountNumber}`]
      .filter(Boolean)
      .join(" · ");
  }

  if (!departmentId) {
    return (
      <Input disabled placeholder="Selecione a secretaria primeiro" className="text-slate-400" />
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-8"
            placeholder={isLoading ? "Carregando..." : "Buscar conta bancária..."}
            value={isOpen ? query : selected ? label(selected) : ""}
            onFocus={() => { setQuery(""); setIsOpen(true); }}
            onChange={e => setQuery(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <a
          href="/financeiro/contas"
          target="_blank"
          rel="noreferrer"
          className="flex shrink-0 items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
          title="Abre Contas Bancárias em outra aba — o que você já preencheu aqui não se perde"
        >
          <Settings2 className="h-3.5 w-3.5" /> Gerenciar
        </a>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); setIsOpen(false); setCreateOpen(true); }}
            className="flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50"
          >
            <Plus className="h-4 w-4" /> Criar nova conta bancária
          </button>

          {suggestions.length === 0 && (
            <div className="px-3 py-2.5 text-sm text-slate-500">
              Nenhuma conta encontrada para esta secretaria.
            </div>
          )}

          {suggestions.map(a => (
            <button
              key={a.id}
              type="button"
              onMouseDown={e => { e.preventDefault(); onSelect(a); setIsOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
            >
              <Landmark className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="truncate text-slate-700">{label(a)}</span>
            </button>
          ))}
        </div>
      )}

      <AccountFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        account={null}
        lockedDepartmentId={departmentId}
      />
    </div>
  );
}
