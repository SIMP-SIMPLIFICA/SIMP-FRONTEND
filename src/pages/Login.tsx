import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { setAccessToken } from "@/lib/auth";
import { LayoutGrid } from "lucide-react";

type LoginResponse = {
  message?: string;
  user?: unknown;
  tokens?: { accessToken?: string; refreshToken?: string; expiresIn?: number };
};

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("Admin123!"); // ajuste conforme seu seed
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

      const token = data?.tokens?.accessToken;
      if (!token) throw { message: "Token não retornou no login." };

      // "remember me": se falso, poderia usar sessionStorage (simplificado aqui)
      setAccessToken(token);

      toast({ title: "Login realizado", description: "Bem-vindo ao SIMP." });
      nav("/");
    } catch (err: unknown) {
			let msg = "Não foi possível entrar. Verifique e-mail/senha e tente novamente.";

			if (typeof err === "string") {
				msg = err;
			} else if (err && typeof err === "object") {
				if ("message" in err && typeof (err as { message?: unknown }).message === "string") {
					msg = (err as { message: string }).message;
				} else if ("error" in err && typeof (err as { error?: unknown }).error === "string") {
					msg = (err as { error: string }).error;
				}
			}

			toast({ title: "Falha no login", description: msg, variant: "destructive" });
		} finally {
			setLoading(false);
		}
  }

  return (
    <div className="min-h-screen bg-[#0A5BC4]">
      <div className="mx-auto grid min-h-screen max-w-[1200px] grid-cols-1 overflow-hidden lg:grid-cols-2">
        {/* LEFT */}
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

          <div className="mt-10 flex gap-4">
            <div className="w-[220px] rounded-2xl bg-white/10 p-5 ring-1 ring-white/10">
              <div className="text-2xl font-semibold">100%</div>
              <div className="mt-1 text-sm text-white/80">Transparência Digital</div>
            </div>
            <div className="w-[220px] rounded-2xl bg-white/10 p-5 ring-1 ring-white/10">
              <div className="text-2xl font-semibold">24/7</div>
              <div className="mt-1 text-sm text-white/80">Suporte Técnico</div>
            </div>
          </div>

          <div className="pointer-events-none absolute inset-0 opacity-20">
            <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-white blur-3xl" />
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center justify-center bg-[#F6F8FC] px-6 py-10 lg:px-12">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <div className="flex items-center gap-3 text-white">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15">
                  <LayoutGrid className="h-6 w-6 text-white" />
                </div>
                <div className="text-2xl font-semibold text-white">SIMP</div>
              </div>
            </div>

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
											onCheckedChange={(v: boolean | "indeterminate") => setRemember(v === true)}
										/>
                    Lembrar-me
                  </label>

                  <button
                    type="button"
                    className="text-sm font-semibold text-[#0A5BC4] hover:underline"
                    onClick={() =>
                      toast({
                        title: "Esqueci a senha",
                        description: "Depois conectamos com /forgot-password 😉",
                      })
                    }
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

                <div className="pt-4 text-center text-sm text-slate-500">
                  Novo por aqui?{" "}
                  <span className="font-semibold text-[#0A5BC4]">
                    Solicite acesso ao RH.
                  </span>
                </div>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
