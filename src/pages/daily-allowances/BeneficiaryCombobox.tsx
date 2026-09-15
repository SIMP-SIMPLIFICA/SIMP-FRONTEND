import { useEffect, useRef, useState } from "react";
import { IdCard, Loader2, Trash2, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  useBeneficiaries,
  useCreateBeneficiary,
  useDeleteBeneficiary,
} from "@/hooks/useBeneficiaries";
import { maskCpfInput, normalizeCpf } from "@/utils/cpf";
import type { Beneficiary, BeneficiaryRegistryInput } from "@/lib/api/beneficiaries";

/**
 * Autocomplete de beneficiários da diária.
 *
 * DIGITAR LIVREMENTE É O COMPORTAMENTO PRINCIPAL, não a exceção: quem opera a
 * tela precisa emitir a diária de um servidor que ainda não está cadastrado, e
 * obrigá-la a abrir outra tela antes seria transformar uma tarefa de trinta
 * segundos em duas. O nome novo entra na lista sozinho, ao sair do campo.
 *
 * Componente próprio em vez de `<datalist>`: o datalist nativo não permite
 * colocar um botão de exclusão ao lado de cada sugestão, e a estilização dele é
 * inconsistente entre navegadores.
 */

interface Props {
  value: string;
  onChange: (value: string) => void;
  /**
   * CPF — elevado ao formulário pai porque hoje alimenta DOIS lugares: o
   * cadastro do beneficiário (mascarado ao ser lido de volta) E o snapshot da
   * PRÓPRIA diária (`beneficiaryCpf`), que é a única exceção do sistema onde o
   * número completo chega a aparecer — dentro do PDF do Anexo I. Por isso o
   * campo abaixo NUNCA fica somente-leitura: mesmo escolhendo um beneficiário
   * que já tem CPF cadastrado, o número precisa ser digitado de novo aqui,
   * porque a API jamais devolve o CPF de um cadastro existente sem máscara.
   */
  cpfValue: string;
  onCpfChange: (masked: string) => void;
  /**
   * Os demais campos de registro (matrícula, RG, cargo, lotação, dados
   * bancários) — vivem como inputs à parte no formulário pai, mas passam por
   * aqui só para irem junto quando um beneficiário NOVO é criado no blur
   * (`registerIfNew`). O backend já é idempotente: preenche apenas o que
   * ainda estava vazio no cadastro, nunca sobrescreve.
   */
  registryDraft?: BeneficiaryRegistryInput;
  /**
   * Disparado ao escolher alguem JA CADASTRADO.
   *
   * Separado de `onChange`, que so carrega o texto: o formulario precisa do
   * registro inteiro para sugerir a lotacao do servidor. Digitar um nome novo
   * nao dispara — nao ha cadastro de onde tirar setor.
   */
  onSelectBeneficiary?: (beneficiary: Beneficiary) => void;
  disabled?: boolean;
  error?: string;
}

export function BeneficiaryCombobox({
  value,
  onChange,
  cpfValue,
  onCpfChange,
  registryDraft,
  onSelectBeneficiary,
  disabled,
  error,
}: Props) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const { data: beneficiaries = [], isLoading } = useBeneficiaries(!disabled);
  const createBeneficiary = useCreateBeneficiary();
  const deleteBeneficiary = useDeleteBeneficiary();

  // Fecha a lista ao clicar fora. Sem isto, a lista ficaria aberta sobre o
  // resto do formulário depois de o usuário desistir da seleção.
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

  const term = value.trim().toLowerCase();
  const suggestions = term
    ? beneficiaries.filter(b => b.name.toLowerCase().includes(term))
    : beneficiaries;

  /** O nome digitado já existe na lista? Comparação sem caixa nem espaços extras. */
  const normalized = value.trim().replace(/\s+/g, " ").toUpperCase();
  const matched = beneficiaries.find(b => b.name === normalized);

  // Beneficiário já tinha CPF no cadastro? Só muda a DICA embaixo do campo —
  // o campo em si continua editável (ver comentário na prop `cpfValue`).
  const cpfAlreadyOnFile = Boolean(matched?.cpf);

  /**
   * Cadastra o nome digitado, e completa o que faltar no cadastro (CPF e os
   * demais campos de registro) com o que já estiver preenchido no formulário.
   *
   * A chamada é segura mesmo com nome repetido: o backend é idempotente,
   * devolve o registro existente e só preenche o que ainda estava vazio —
   * nunca sobrescreve um dado já cadastrado. Por isso dispara sempre que há
   * um nome digitado, cadastrado ou não: não há necessidade de decidir aqui
   * o que já existe, essa decisão já é do servidor.
   */
  async function registerIfNew() {
    if (!normalized || disabled) return;

    const cpfDigits = normalizeCpf(cpfValue);

    try {
      await createBeneficiary.mutateAsync({
        name: normalized,
        cpf: cpfDigits || undefined,
        ...registryDraft,
      });
    } catch {
      // Falhar aqui não pode travar o preenchimento: o nome digitado continua
      // válido para a diária, apenas não entrou na lista de sugestões.
      toast({
        title: "Não foi possível salvar o nome na lista de beneficiários.",
        description: "A diária pode ser salva normalmente.",
        variant: "destructive",
      });
    }
  }

  async function handleDelete(event: React.MouseEvent, id: string, name: string) {
    // Impede que o clique na lixeira também selecione a sugestão.
    event.preventDefault();
    event.stopPropagation();

    if (!window.confirm(`Remover "${name}" da lista de beneficiários?`)) return;

    try {
      await deleteBeneficiary.mutateAsync(id);
      toast({ title: "Beneficiário removido da lista." });
    } catch {
      toast({ title: "Não foi possível remover o beneficiário.", variant: "destructive" });
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <Input
        id="beneficiaryName"
        autoComplete="off"
        placeholder="Digite o nome do servidor"
        value={value}
        disabled={disabled}
        onChange={event => {
          onChange(event.target.value);
          // Trocar de nome descarta o CPF anterior: um CPF digitado para
          // "João" não pode grudar em "Maria" se o campo de nome for
          // corrigido antes de sair do formulário.
          onCpfChange("");
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          // Atraso curto: sem ele, o blur fecharia a lista antes de o clique na
          // sugestão ser registrado, e selecionar um nome ficaria impossível.
          window.setTimeout(() => {
            setIsOpen(false);
            void registerIfNew();
          }, 150);
        }}
      />

      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {isLoading && (
            <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando...
            </div>
          )}

          {!isLoading && suggestions.length === 0 && (
            <div className="px-3 py-2.5 text-sm text-slate-500">
              {normalized ? (
                <>
                  Nenhum resultado. <span className="font-medium">{normalized}</span> será
                  adicionado à lista.
                </>
              ) : (
                "Nenhum beneficiário cadastrado ainda."
              )}
            </div>
          )}

          {!isLoading &&
            suggestions.map(beneficiary => (
              <button
                key={beneficiary.id}
                type="button"
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                onMouseDown={event => {
                  // mousedown, e não click: o blur do input dispara antes do
                  // click e fecharia a lista.
                  event.preventDefault();
                  onChange(beneficiary.name);
                  // Não herda o CPF do cadastro: a API só devolve a forma
                  // mascarada, e o snapshot da diária precisa do número
                  // completo — só quem digita agora tem esse dado.
                  onCpfChange("");
                  onSelectBeneficiary?.(beneficiary);
                  setIsOpen(false);
                }}
              >
                <span className="flex items-center gap-2 truncate text-slate-700">
                  <UserRound className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  <span className="truncate">{beneficiary.name}</span>
                  {/* CPF ja chega mascarado da API — o numero inteiro nunca
                      sai do backend, entao nao ha o que ocultar aqui. */}
                  {beneficiary.cpf && (
                    <span className="shrink-0 text-xs text-slate-400">{beneficiary.cpf}</span>
                  )}
                </span>

                <span
                  role="button"
                  tabIndex={-1}
                  aria-label={`Remover ${beneficiary.name}`}
                  title="Remover da lista"
                  className="shrink-0 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  onMouseDown={event => event.stopPropagation()}
                  onClick={event => handleDelete(event, beneficiary.id, beneficiary.name)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </span>
              </button>
            ))}
        </div>
      )}

      {/* CPF: aparece assim que há um nome, cadastrado ou novo. SEMPRE
          editável — mesmo para um beneficiário já cadastrado, porque este
          número é também o que vai (sem máscara) para o Anexo I desta
          diária, e a API nunca devolve o CPF de um cadastro existente sem
          máscara para pré-preencher aqui. */}
      {normalized && (
        <div className="mt-2 flex items-center gap-1.5">
          <IdCard className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
          <Input
            aria-label="CPF do beneficiário"
            placeholder="CPF"
            inputMode="numeric"
            value={cpfValue}
            disabled={disabled}
            onChange={event => onCpfChange(maskCpfInput(event.target.value))}
            className="h-8 max-w-[180px] text-sm"
          />
          {cpfAlreadyOnFile && (
            <span className="text-xs text-slate-400">
              já cadastrado — confirme para constar no documento
            </span>
          )}
        </div>
      )}

      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}

      {!error && !disabled && (
        <p className="mt-1.5 text-xs text-slate-500">
          Nomes novos são adicionados à lista automaticamente e gravados em caixa alta.
        </p>
      )}
    </div>
  );
}
