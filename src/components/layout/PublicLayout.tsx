import { Link, Outlet } from "react-router-dom";
import { Landmark, ShieldCheck } from "lucide-react";

/**
 * Layout do Portal Público do Cidadão (monólito modular).
 *
 * SEM sidebar administrativa, SEM contexto de autenticação e SEM qualquer
 * chamada a `/me`. Quem navega aqui é o cidadão, que não tem conta — montar o
 * shell autenticado em volta dele traria o guarda de sessão, o timer de
 * inatividade e o interceptor de refresh para uma página que nada disso atende.
 *
 * Fica no MESMO repositório e no mesmo bundle do sistema administrativo; o que
 * separa os dois é a árvore de layouts e o prefixo das rotas, não um segundo
 * projeto.
 */
export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
          <Link to="/portal" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Landmark className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold text-slate-800">
                Portal do Cidadão
              </span>
              <span className="block text-xs text-slate-500">
                Transparência e serviços públicos
              </span>
            </span>
          </Link>

          {/* Acesso dos servidores: discreto, porque não é o público desta área. */}
          <Link
            to="/login"
            className="rounded-md px-3 py-1.5 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            Acesso restrito
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-2 px-4 py-5 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-xs text-slate-500">
            Este portal permite conferir a autenticidade de documentos emitidos
            pelo município.
          </p>
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Verificação por QR Code e código SHA-256
          </p>
        </div>
      </footer>
    </div>
  );
}
