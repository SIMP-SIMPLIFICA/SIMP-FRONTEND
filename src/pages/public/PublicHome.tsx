import { Link } from "react-router-dom";
import {
  FileSearch,
  HelpCircle,
  MessageSquare,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

/**
 * Página inicial do Portal Público do Cidadão.
 *
 * DESENHO DELIBERADAMENTE MINIMALISTA: uma grade de cartões grandes e quadrados,
 * sem menu, sem filtros, sem texto longo. Quem chega aqui costuma vir pelo QR
 * Code de um papel, muitas vezes pelo celular e sem familiaridade com o site —
 * um alvo grande e uma frase curta resolvem melhor que uma navegação rica.
 *
 * Os itens futuros aparecem desabilitados em vez de ocultos: mostrar o que vem
 * por aí orienta a expectativa, e esconder faria o portal parecer vazio.
 */

interface PortalCard {
  title: string
  description: string
  icon: LucideIcon
  to?: string
  comingSoon?: boolean
}

const CARDS: PortalCard[] = [
  {
    title: "Validar Autenticidade de Documentos",
    description: "Confira se um documento foi realmente emitido pelo município.",
    icon: FileSearch,
    to: "/validar-documento",
  },
  {
    title: "Fórum do Cidadão",
    description: "Espaço de participação e acompanhamento de demandas.",
    icon: MessageSquare,
    comingSoon: true,
  },
  {
    title: "Consultas Públicas",
    description: "Processos, protocolos e atos oficiais abertos à consulta.",
    icon: ScrollText,
    comingSoon: true,
  },
  {
    title: "Perguntas Frequentes",
    description: "Dúvidas comuns sobre serviços e documentos municipais.",
    icon: HelpCircle,
    comingSoon: true,
  },
];

export default function PublicHome() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-14">
      <header className="mb-8 text-center sm:mb-12">
        <h1 className="text-2xl font-semibold text-slate-800 sm:text-3xl">
          Como podemos ajudar?
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500 sm:text-base">
          Escolha abaixo o serviço desejado.
        </p>
      </header>

      {/* Duas colunas no celular seriam apertadas para um alvo grande; uma só
          coluna até sm, depois duas. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {CARDS.map(card => (
          <PortalTile key={card.title} card={card} />
        ))}
      </div>
    </div>
  );
}

function PortalTile({ card }: { card: PortalCard }) {
  const Icon = card.icon;

  const content = (
    <>
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-xl ${
          card.comingSoon ? "bg-slate-100 text-slate-400" : "bg-slate-900 text-white"
        }`}
      >
        <Icon className="h-7 w-7" aria-hidden="true" />
      </span>

      <span className="mt-5 block text-lg font-semibold leading-snug">
        {card.title}
      </span>

      <span
        className={`mt-2 block text-sm ${
          card.comingSoon ? "text-slate-400" : "text-slate-500"
        }`}
      >
        {card.description}
      </span>

      {card.comingSoon && (
        <span className="mt-4 inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
          Em breve
        </span>
      )}
    </>
  );

  // `aspect-square` só a partir de sm: num celular estreito, o quadrado viraria
  // um cartão altíssimo com muito vazio no meio.
  const base =
    "flex flex-col rounded-2xl border p-6 text-left sm:aspect-square sm:justify-center";

  if (card.comingSoon || !card.to) {
    return (
      <div
        className={`${base} border-slate-200 bg-white/60 text-slate-400`}
        aria-disabled="true"
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      to={card.to}
      className={`${base} border-slate-200 bg-white text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2`}
    >
      {content}
    </Link>
  );
}
