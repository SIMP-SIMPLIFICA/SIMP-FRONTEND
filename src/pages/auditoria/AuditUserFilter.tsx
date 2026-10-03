import { useEffect, useRef, useState } from "react";
import { Loader2, Search, UserRound, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  useOrganizationUsers,
  formatUserLabel,
  type OrganizationUser,
} from "@/hooks/useOrganizationUsers";

interface Props {
  /** Chamado com (userId, rótulo) ao selecionar, ou (null, null) ao limpar. */
  onChange: (userId: string | null, label: string | null) => void;
  disabled?: boolean;
}

/**
 * Filtro de usuário da auditoria (FR-003): campo de texto que busca por
 * nome/e-mail e resolve para `userId` — reaproveita `useOrganizationUsers`
 * (mesmo endpoint já usado no formulário de Diárias) em vez de inventar uma
 * rota nova. `action`/`resource` são texto livre no banco (spec §4) e por
 * isso NÃO usam este padrão — só usuário tem uma lista fechada para resolver.
 *
 * Sem prop `value`: o componente é não controlado de propósito — sincronizar
 * o texto digitado com um id resolvido por fora, a cada tecla, é a receita
 * clássica do cursor "pulando" no meio da digitação. Quem usa isto
 * (`AuditLogPage`) força um reset limpo trocando a `key` no "Limpar filtros".
 */
export function AuditUserFilter({ onChange, disabled }: Props) {
  const { data: users = [], isLoading } = useOrganizationUsers();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const term = query.trim().toLowerCase();
  const suggestions = term
    ? users.filter(
        u =>
          formatUserLabel(u).toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term)
      )
    : users;

  function select(user: OrganizationUser) {
    const label = formatUserLabel(user);
    setQuery(label);
    setSelectedId(user.id);
    onChange(user.id, label);
    setIsOpen(false);
  }

  function clear() {
    setQuery("");
    setSelectedId(null);
    onChange(null, null);
    setIsOpen(false);
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <Input
          type="text"
          aria-label="Filtrar por usuário"
          placeholder="Usuário (nome ou e-mail)"
          value={query}
          disabled={disabled}
          onChange={event => {
            setQuery(event.target.value);
            // Digitar de novo desfaz a seleção anterior — só quando havia uma,
            // para não disparar onChange(null,null) a cada tecla.
            if (selectedId) {
              setSelectedId(null);
              onChange(null, null);
            }
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-8 pr-8"
        />
        {query && !disabled && (
          <button
            type="button"
            aria-label="Limpar filtro de usuário"
            onClick={clear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {isLoading && (
            <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando usuários...
            </div>
          )}

          {!isLoading && suggestions.length === 0 && (
            <div className="px-3 py-2.5 text-sm text-slate-500">
              Nenhum usuário encontrado.
            </div>
          )}

          {!isLoading &&
            suggestions.map(user => (
              <button
                key={user.id}
                type="button"
                onMouseDown={event => {
                  // mousedown, e não click: o blur do input dispara antes do
                  // click e fecharia a lista antes de registrar a escolha.
                  event.preventDefault();
                  select(user);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <UserRound className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                <span className="truncate font-medium text-slate-700">{formatUserLabel(user)}</span>
                <span className="ml-auto shrink-0 truncate text-xs text-slate-400">
                  {user.email}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
