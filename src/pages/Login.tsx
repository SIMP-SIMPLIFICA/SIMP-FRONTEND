import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { setAuthTokens } from "@/lib/auth"; 
import { LayoutGrid } from "lucide-react";

type LoginResponse = {
  message?: string;
  user?: unknown;
  tokens?: { accessToken?: string; refreshToken?: string; expiresIn?: number };
  accessToken?: string;
  refreshToken?: string;
};

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("Admin123!");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await apiRequest<LoginResponse>("/api/v1/auth/login", {
        method: "POST",
        noAuth: true,
        body: JSON.stringify({ email, password }),
      });

      const accessToken = data.tokens?.accessToken || data.accessToken;
      const refreshToken = data.tokens?.refreshToken || data.refreshToken;

      if (!accessToken) {
        throw { message: "Token de acesso não retornado pela API." };
      }

      setAuthTokens(accessToken, refreshToken);

      toast({ title: "Login realizado", description: "Bem-vindo ao SIMP." });
      nav("/");
    } catch (err: unknown) {
      let msg = "Não foi possível entrar.";

      if (typeof err === "string") {
        msg = err;
      } else if (err && typeof err === "object") {
        const e = err as any;
        msg = e.message || e.error || JSON.stringify(e);
      }

      toast({ title: "Falha no login", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A5BC4]">
      <div className="mx-auto grid min-h-screen max-w-[1200px] grid-cols-1 overflow-hidden lg:grid-cols-2">
        {/* LEFT - Banner */}
        <div className="relative hidden lg:flex flex-col justify-center px-14 text-white">
          <div className="mb-10 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15">
              <LayoutGrid className="h-6 w-6" />
            </div>
            <div className="text-2xl font-semibold tracking-wide">SIMP</div>
          </div>

          <h1 className="text-5xl font-semibold leading-tight">
            Gestão Municipal <br />
            Eficiente e Inovadora.
          </h1>

          <p className="mt-6 max-w-md text-white/85">
            A ferramenta definitiva para governança pública, integrando finanças,
            projetos e transparência em um só lugar.
          </p>
        </div>

        {/* RIGHT - Form */}
        <div className="flex items-center justify-center bg-[#F6F8FC] px-6 py-10 lg:px-12">
          <div className="w-full max-w-md">
            <Card className="rounded-3xl border-slate-200 p-8 shadow-sm">
              <h2 className="text-3xl font-semibold text-slate-900">Bem-vindo</h2>
              <p className="mt-2 text-slate-500">
                Acesse sua conta para gerenciar o município.
              </p>

              <form onSubmit={onSubmit} className="mt-8 space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    E-mail Institucional
                  </label>
                  <Input
                    className="h-11 rounded-2xl"
                    placeholder="exemplo@prefeitura.gov.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Senha</label>
                  <Input
                    className="h-11 rounded-2xl"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <Checkbox
                      checked={remember}
                      onCheckedChange={(v) => setRemember(v === true)}
                    />
                    Lembrar-me
                  </label>

                  <button
                    type="button"
                    className="text-sm font-semibold text-[#0A5BC4] hover:underline"
                    onClick={() => nav("/forgot-password")}
                  >
                    Esqueceu a senha?
                  </button>
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full rounded-2xl bg-[#0A5BC4] text-base hover:bg-[#094FA8]"
                  disabled={loading}
                >
                  {loading ? "Entrando..." : "Entrar no Sistema"}
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}