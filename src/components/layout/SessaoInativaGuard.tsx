import { useNavigate } from "react-router-dom";
import { Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useIdleTimer } from "@/hooks/useIdleTimer";
import { clearAuth } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";

/**
 * Guarda de sessão por inatividade (Épico 2, Task 2.2).
 *
 * Montado uma única vez dentro do AppLayout — ou seja, vale para todas as telas
 * autenticadas e não roda no login. Após 30 minutos sem interação, limpa tokens
 * e cache e devolve o usuário ao login; no último minuto exibe um aviso.
 */
export function SessaoInativaGuard() {
  const navigate = useNavigate();

  const { avisoVisivel, segundosRestantes, continuarConectado, sairAgora } = useIdleTimer({
    aoExpirar: () => {
      // Mesma limpeza do logout manual: token em memória, refresh de
      // impersonação e cache de dados. Sem limpar o cache, dados da sessão
      // encerrada continuariam visíveis para quem logasse em seguida.
      clearAuth();
      queryClient.clear();
      navigate("/login", { replace: true });
    },
  });

  return (
    <Dialog open={avisoVisivel} onOpenChange={aberto => { if (!aberto) continuarConectado() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
            <Clock className="h-6 w-6 text-amber-600" />
          </div>
          <DialogTitle className="text-center">Sua sessão vai expirar</DialogTitle>
          <DialogDescription className="text-center">
            Por segurança, sessões inativas são encerradas automaticamente.
            {segundosRestantes > 0 && (
              <>
                {" "}Você será desconectado em{" "}
                <span className="font-semibold text-slate-700">
                  {segundosRestantes} segundo{segundosRestantes === 1 ? "" : "s"}
                </span>.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="sm:justify-center gap-2">
          <Button variant="outline" onClick={sairAgora}>
            Sair agora
          </Button>
          <Button onClick={continuarConectado}>
            Continuar conectado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
