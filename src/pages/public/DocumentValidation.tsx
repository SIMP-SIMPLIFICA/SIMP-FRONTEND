import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Loader2, ShieldQuestion } from "lucide-react";

/**
 * Portal de Validação Pública (Épico 3, Task 3.3).
 *
 * Página ABERTA, sem autenticação: quem chega aqui apontou a câmera do celular
 * para o QR Code impresso no rodapé de um documento oficial.
 *
 * DESENHO PENSADO PARA O CELULAR EM CAMPO:
 *   O fiscal está de pé, na rua, com o papel numa mão e o telefone na outra. O
 *   veredito precisa ser legível à distância de um braço e antes de qualquer
 *   rolagem — por isso o banner ocupa o topo inteiro, com ícone, cor e uma frase
 *   curta. Os metadados vêm depois, para quem quiser conferir detalhe.
 *
 * NÃO usa o cliente `api` autenticado de propósito: aquele anexa token, envia
 * cookies e reage a 401 tentando renovar sessão. Nada disso faz sentido para um
 * cidadão que nunca fez login, e acoplar a página pública ao fluxo de sessão só
 * criaria caminhos de falha que não existem aqui.
 */

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

interface ValidatedDocument {
  type: string;
  typeLabel: string;
  publicId: string;
  sha256Hash: string;
  issuedAt: string | null;
  organization: { name: string };
}

type ValidationState =
  | { status: "loading" }
  | { status: "valid"; document: ValidatedDocument }
  | { status: "invalid" }
  | { status: "error" };

function formatDateTime(iso: string | null): string {
  if (!iso) return "Não informada";

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Não informada";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

export default function DocumentValidation() {
  const { uuid } = useParams<{ uuid: string }>();

  // Estado inicial DERIVADO do parâmetro da URL, e não definido dentro do
  // efeito: um setState síncrono em efeito dispara render em cascata
  // (react-hooks/set-state-in-effect). Sem uuid não há o que consultar, então a
  // página já nasce no veredito negativo.
  const [state, setState] = useState<ValidationState>(() =>
    uuid ? { status: "loading" } : { status: "invalid" }
  );

  useEffect(() => {
    if (!uuid) return;

    // Evita atualizar estado depois que o componente saiu da tela.
    let active = true;

    async function validate() {
      try {
        const response = await fetch(
          `${API_URL}/api/v1/public/documents/validate/${encodeURIComponent(uuid!)}`
        );

        if (!active) return;

        if (response.status === 404) {
          setState({ status: "invalid" });
          return;
        }

        if (!response.ok) {
          // 500, 429 ou indisponibilidade: é diferente de "documento inválido".
          // Dizer "adulterado" quando o servidor apenas falhou seria acusar um
          // documento legítimo por causa de um problema nosso.
          setState({ status: "error" });
          return;
        }

        const data = await response.json();
        setState(
          data?.valid && data?.document
            ? { status: "valid", document: data.document }
            : { status: "invalid" }
        );
      } catch {
        if (active) setState({ status: "error" });
      }
    }

    validate();
    return () => {
      active = false;
    };
  }, [uuid]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-xl">
        <header className="mb-6 text-center">
          <h1 className="text-lg font-semibold text-slate-800 sm:text-xl">
            Verificação de Documento Oficial
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Confira abaixo a autenticidade do documento
          </p>
        </header>

        {state.status === "loading" && <LoadingCard />}
        {state.status === "valid" && <ValidCard document={state.document} />}
        {state.status === "invalid" && <InvalidCard uuid={uuid} />}
        {state.status === "error" && <ErrorCard />}

        <p className="mt-6 text-center text-xs leading-relaxed text-slate-400">
          Esta verificação confirma que o documento foi emitido por este sistema e
          não foi alterado desde a emissão.
        </p>
      </div>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-10 text-slate-500 shadow-sm">
      <Loader2 className="h-7 w-7 animate-spin" />
      <p className="text-sm">Verificando documento...</p>
    </div>
  );
}

function ValidCard({ document }: { document: ValidatedDocument }) {
  return (
    <div className="overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-sm">
      {/* Banner do veredito: cor, ícone e frase curta, legíveis sem rolagem. */}
      <div className="flex items-center gap-3 bg-emerald-600 px-5 py-5 text-white sm:px-6">
        <CheckCircle2 className="h-9 w-9 shrink-0" aria-hidden="true" />
        <div>
          <p className="text-base font-semibold leading-tight sm:text-lg">
            Documento Válido e Oficial
          </p>
          <p className="mt-0.5 text-sm text-emerald-50">
            Emitido por órgão público e íntegro
          </p>
        </div>
      </div>

      <dl className="divide-y divide-slate-100">
        <Field label="Tipo de documento" value={document.typeLabel} />
        <Field label="Órgão emissor" value={document.organization.name} />
        <Field label="Data de emissão" value={formatDateTime(document.issuedAt)} />
        <Field label="Código de verificação" value={document.publicId} mono />
        <Field label="Código de integridade (SHA-256)" value={document.sha256Hash} mono />
      </dl>
    </div>
  );
}

function InvalidCard({ uuid }: { uuid?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-red-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 bg-red-600 px-5 py-5 text-white sm:px-6">
        <AlertTriangle className="h-9 w-9 shrink-0" aria-hidden="true" />
        <div>
          <p className="text-base font-semibold leading-tight sm:text-lg">
            Atenção: Documento Adulterado ou Não Encontrado
          </p>
          <p className="mt-0.5 text-sm text-red-50">
            Não localizamos nenhum documento com este código
          </p>
        </div>
      </div>

      <div className="space-y-3 px-5 py-5 text-sm text-slate-600 sm:px-6">
        <p>
          Isso pode acontecer se o código foi digitado incorretamente, se o QR Code
          está danificado ou se o documento não foi emitido por este sistema.
        </p>
        <p className="font-medium text-slate-700">
          Em caso de dúvida, procure o órgão emissor antes de aceitar o documento.
        </p>
        {uuid && (
          <p className="break-all rounded-md bg-slate-50 px-3 py-2 font-mono text-xs text-slate-500">
            Código consultado: {uuid}
          </p>
        )}
      </div>
    </div>
  );
}

function ErrorCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm">
      {/* Âmbar, e não vermelho: falha do servidor não é acusação ao documento. */}
      <div className="flex items-center gap-3 bg-amber-500 px-5 py-5 text-white sm:px-6">
        <ShieldQuestion className="h-9 w-9 shrink-0" aria-hidden="true" />
        <div>
          <p className="text-base font-semibold leading-tight sm:text-lg">
            Não foi possível verificar agora
          </p>
          <p className="mt-0.5 text-sm text-amber-50">
            Isto não significa que o documento seja inválido
          </p>
        </div>
      </div>

      <div className="px-5 py-5 text-sm text-slate-600 sm:px-6">
        <p>
          O serviço de verificação está indisponível no momento. Aguarde alguns
          instantes e tente novamente.
        </p>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="px-5 py-3.5 sm:px-6">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd
        className={`mt-1 text-slate-800 ${
          mono ? "break-all font-mono text-xs" : "text-sm font-medium"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
