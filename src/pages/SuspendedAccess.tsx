import { useNavigate } from "react-router-dom";
import { ShieldAlert, Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Tela exibida quando a organização do usuário foi suspensa pelo administrador
 * da plataforma. Rota PÚBLICA de propósito: a sessão já foi limpa antes do
 * redirecionamento, então uma rota protegida jogaria o usuário no login e criaria
 * um laço de redirecionamento.
 */
export default function SuspendedAccess() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-sm p-8 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
          <ShieldAlert className="h-8 w-8 text-amber-600" strokeWidth={1.5} />
        </div>

        <h1 className="text-xl font-semibold text-slate-900 mb-2">
          Acesso temporariamente suspenso
        </h1>

        <p className="text-sm text-slate-600 leading-relaxed mb-6">
          O acesso da sua organização ao SIMP está suspenso no momento.
          Enquanto isso, não é possível entrar no sistema.
        </p>

        <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 mb-6 text-left">
          <p className="flex items-start gap-2 text-sm text-slate-600">
            <Mail className="h-4 w-4 mt-0.5 shrink-0 text-slate-400" />
            <span>
              Para regularizar a situação e restabelecer o acesso, entre em contato
              com a administração responsável pelo sistema.
            </span>
          </p>
        </div>

        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => navigate("/login")}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para o login
        </Button>

        <p className="mt-4 text-xs text-slate-400">
          Assim que o acesso for reativado, basta entrar normalmente.
        </p>
      </div>
    </div>
  );
}
