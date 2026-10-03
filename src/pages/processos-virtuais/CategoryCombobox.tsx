import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, Plus, Search, Settings2, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  useVirtualProcessCategories,
  useCreateVirtualProcessCategory,
} from "@/hooks/useVirtualProcesses";
import { toTitleCase } from "@/lib/string-utils";

interface Props {
  value: string;
  onSelect: (name: string) => void;
  onManage: () => void;
}

/**
 * Combobox de categoria de processo virtual (`VirtualProcessCategory`) —
 * NÃO é a mesma tabela de categorias do Financeiro (decisão do usuário,
 * 2026-09-23): continua servindo só Processos Virtuais.
 *
 * Title Case + bloqueio de duplicata são impostos AQUI, client-side, antes
 * de chamar a API — o banco só garante unicidade exata
 * (`@@unique([organizationId, name])`), sem normalizar capitalização
 * sozinho.
 */
export function CategoryCombobox({ value, onSelect, onManage }: Props) {
  const { data: categories = [], isLoading, isError } = useVirtualProcessCategories(undefined);
  const { mutateAsync: createCategory, isPending: creating } = useCreateVirtualProcessCategory(undefined);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const term = query.trim().toLowerCase();
  const suggestions = term
    ? categories.filter(c => c.name.toLowerCase().includes(term))
    : categories;

  const normalizedQuery = toTitleCase(query);
  const alreadyExists =
    normalizedQuery.length > 0 &&
    categories.some(c => c.name.toLowerCase() === normalizedQuery.toLowerCase());
  const canCreate = normalizedQuery.length > 0 && !alreadyExists;

  async function handleCreate() {
    if (!canCreate) return;
    try {
      const created = await createCategory({ name: normalizedQuery });
      onSelect(created.name);
      setQuery("");
      setIsOpen(false);
      toast({ title: "Categoria criada com sucesso" });
    } catch {
      toast({ title: "Erro ao criar categoria", variant: "destructive" });
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-8"
            placeholder={isLoading ? "Carregando..." : "Buscar ou criar categoria..."}
            value={isOpen ? query : value}
            onFocus={() => { setQuery(""); setIsOpen(true); }}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              // Achado da revisão final (Importante #1): sem isto, Enter aqui
              // borbulha e também submete o <form> externo de "Autuar
              // Processo" — o Select do Radix que isto substituiu não tinha
              // esse risco por não ser um <input> de texto dentro do form.
              if (e.key === "Enter") {
                e.preventDefault();
                if (canCreate) {
                  void handleCreate();
                } else if (suggestions.length === 1) {
                  onSelect(suggestions[0].name);
                  setIsOpen(false);
                }
              }
            }}
            onBlur={() => {
              // Atraso curto: sem ele, o blur fecharia a lista antes de um
              // clique numa sugestão ser registrado (mesmo padrão de
              // BeneficiaryCombobox). Também resolve o campo "sumir" ao focar
              // e depois sair sem escolher nada — sem isto, `isOpen` só
              // voltava a `false` pelo listener de clique fora.
              window.setTimeout(() => setIsOpen(false), 150);
            }}
            disabled={isLoading}
          />
        </div>
        <button
          type="button"
          onClick={onManage}
          tabIndex={-1}
          className="flex shrink-0 items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
        >
          <Settings2 className="h-3.5 w-3.5" /> Gerenciar
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {query.trim() && (
            <button
              type="button"
              disabled={!canCreate || creating}
              onMouseDown={e => { e.preventDefault(); void handleCreate(); }}
              className="flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {alreadyExists
                ? `"${normalizedQuery}" já existe — selecione na lista abaixo`
                : `Criar categoria "${normalizedQuery}"`}
            </button>
          )}

          {isError && (
            <div className="flex items-start gap-2 px-3 py-2.5 text-xs text-red-600">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Não foi possível carregar as categorias. Recarregue a página.</span>
            </div>
          )}

          {!isError && suggestions.length === 0 && !query.trim() && (
            <div className="px-3 py-2.5 text-sm text-slate-500">Nenhuma categoria cadastrada.</div>
          )}

          {suggestions.map(c => (
            <button
              key={c.id}
              type="button"
              onMouseDown={e => { e.preventDefault(); onSelect(c.name); setIsOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
            >
              <Tag className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="truncate text-slate-700">{c.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
