import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, LayoutGrid, Loader2 } from "lucide-react";

import { apiRequest } from "@/lib/api";
import { setAuthTokens } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

type LoginResponse = {
  message?: string;
  user?: unknown;
  // Backend sets the refreshToken as an httpOnly cookie — it is NOT in the body.
  tokens?: { accessToken?: string; expiresIn?: number };
  accessToken?: string;
};

export default function Login() {
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await apiRequest<LoginResponse>("/api/v1/auth/login", {
        method: "POST",
        noAuth: true,
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const accessToken = data.tokens?.accessToken || data.accessToken;

      if (!accessToken) {
        throw { message: "Token de acesso não retornado pela API." };
      }

      // refreshToken is in the httpOnly cookie set by the backend — no storage needed.
      setAuthTokens(accessToken);
      queryClient.clear();
      toast({ title: "Login realizado", description: "Bem-vindo ao SIMP." });
      nav("/");
    } catch (err: unknown) {
      let msg = "E-mail ou senha incorretos.";
      if (typeof err === "string") {
        msg = err;
      } else if (err && typeof err === "object") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const e = err as any;
        // Organização suspensa: o interceptor de api.ts já está levando o usuário
        // para /acesso-suspenso, que explica a situação. Um toast de "Falha no
        // login" aqui só piscaria uma mensagem enganosa antes do redirecionamento.
        if (e.error === "ORGANIZATION_SUSPENDED") return;
        msg = e.message || e.error || msg;
      }
      toast({ title: "Falha no login", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A5BC4]">
      <div className="mx-auto grid min-h-screen max-w-[1200px] grid-cols-1 overflow-hidden lg:grid-cols-2">

        {/* Esquerda — Banner */}
        <div className="hidden lg:flex flex-col justify-between px-14 py-16 text-white">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 backdrop-blur-sm">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <span className="text-xl font-semibold tracking-wide">SIMP</span>
          </div>

          <div>
            <h1 className="text-5xl font-semibold leading-tight">
              Gestão Municipal<br />Eficiente e Inovadora.
            </h1>
            <p className="mt-5 max-w-sm text-base text-white/75 leading-relaxed">
              A ferramenta definitiva para governança pública, integrando finanças,
              projetos e transparência em um só lugar.
            </p>
          </div>

          <p className="text-xs text-white/35">
            © {new Date().getFullYear()} SIMP — Sistema Integrado de Gestão Municipal
          </p>
        </div>

        {/* Direita — Formulário */}
        <div className="flex items-center justify-center bg-[#F6F8FC] px-6 py-10 lg:px-12">
          <div className="w-full max-w-md">

            {/* Logo mobile */}
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#0A5BC4]">
                <LayoutGrid className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-slate-800">SIMP</span>
            </div>

            <Card className="rounded-3xl border-slate-200 p-8 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-900">Bem-vindo de volta</h2>
              <p className="mt-1.5 text-sm text-slate-500">
                Acesse sua conta para gerenciar o município.
              </p>

              <form onSubmit={onSubmit} className="mt-7 space-y-5">
                {/* E-mail */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    E-mail Institucional
                  </label>
                  <Input
                    type="email"
                    className="h-11 rounded-xl"
                    placeholder="exemplo@prefeitura.gov.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Senha */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Senha</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      className="h-11 rounded-xl pr-10"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword
                        ? <EyeOff className="h-4 w-4" />
                        : <Eye className="h-4 w-4" />
                      }
                    </button>
                  </div>
                </div>

                {/* Lembrar-me + Esqueci a senha */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={loading}
                      className="h-4 w-4 rounded border-slate-300 text-[#0A5BC4] accent-[#0A5BC4]"
                    />
                    <span className="text-sm text-slate-600">Lembrar-me por 30 dias</span>
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm font-medium text-[#0A5BC4] hover:underline"
                  >
                    Esqueceu a senha?
                  </Link>
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full rounded-xl bg-[#0A5BC4] text-sm font-medium hover:bg-[#094FA8] transition-colors"
                  disabled={loading}
                >
                  {loading
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Entrando...</>
                    : "Entrar no Sistema"
                  }
                </Button>
              </form>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
}
