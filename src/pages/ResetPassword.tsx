import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, LayoutGrid, Loader2, Lock, Check, X } from "lucide-react";

import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

const PASSWORD_REQUIREMENTS = [
  { label: "Mínimo 8 caracteres", test: (p: string) => p.length >= 8 },
  { label: "Letra maiúscula", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Letra minúscula", test: (p: string) => /[a-z]/.test(p) },
  { label: "Número", test: (p: string) => /\d/.test(p) },
  { label: "Caractere especial (@$!%*?&)", test: (p: string) => /[@$!%*?&]/.test(p) },
];

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const allRequirementsMet = PASSWORD_REQUIREMENTS.every(r => r.test(password));

  useEffect(() => {
    if (!token) {
      toast({
        title: "Link inválido",
        description: "O link de recuperação parece estar quebrado.",
        variant: "destructive",
      });
    }
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allRequirementsMet) {
      toast({ title: "Senha fraca", description: "Atenda a todos os requisitos antes de continuar.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await apiRequest("/api/v1/auth/reset-password", {
        method: "POST",
        noAuth: true,
        body: JSON.stringify({ token, password, confirmPassword: confirm }),
      });
      toast({ title: "Senha alterada!", description: "Você já pode fazer login com a nova senha." });
      navigate("/login");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast({
        title: "Erro ao redefinir senha",
        description: err.message || "Token inválido ou expirado.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0A5BC4] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="rounded-3xl border-slate-200 p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <Lock className="h-8 w-8 text-slate-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Link inválido</h2>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              Não encontramos o token de segurança necessário.<br />
              Solicite um novo link de recuperação.
            </p>
            <Link to="/forgot-password">
              <Button className="mt-6 h-11 w-full rounded-xl bg-[#0A5BC4] hover:bg-[#094FA8]">
                Solicitar novo link
              </Button>
            </Link>
            <div className="mt-4 flex justify-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#0A5BC4] transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar para o login
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A5BC4] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 backdrop-blur-sm">
            <LayoutGrid className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-semibold tracking-wide text-white">SIMP</span>
        </div>

        <Card className="rounded-3xl border-slate-200 p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Redefinir senha</h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Crie uma nova senha forte para sua conta.
          </p>

          <form onSubmit={onSubmit} className="mt-7 space-y-5" autoComplete="off">
            {/* Nova senha */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Nova Senha</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  className="h-11 rounded-xl pr-10"
                  placeholder="Digite sua nova senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  required
                  disabled={loading}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Requirements checklist */}
              {(passwordFocused || password.length > 0) && (
                <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1.5">
                  {PASSWORD_REQUIREMENTS.map((req) => {
                    const met = req.test(password);
                    return (
                      <div key={req.label} className="flex items-center gap-2">
                        <div className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${met ? "bg-emerald-500" : "bg-slate-200"}`}>
                          {met
                            ? <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                            : <X className="h-2.5 w-2.5 text-slate-400" strokeWidth={3} />
                          }
                        </div>
                        <span className={`text-xs ${met ? "text-emerald-700" : "text-slate-500"}`}>
                          {req.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Confirmar senha */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Confirmar Senha</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  className="h-11 rounded-xl pr-10"
                  placeholder="Repita a nova senha"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="off"
                />
              </div>
              {confirm && password !== confirm && (
                <p className="text-xs text-red-500">As senhas não coincidem.</p>
              )}
            </div>

            <Button
              type="submit"
              className="h-11 w-full rounded-xl bg-[#0A5BC4] text-sm font-medium hover:bg-[#094FA8] transition-colors"
              disabled={loading || !allRequirementsMet || (!!confirm && password !== confirm)}
            >
              {loading
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
                : "Salvar nova senha"
              }
            </Button>
          </form>

          <div className="mt-6 flex justify-center border-t border-slate-100 pt-5">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#0A5BC4] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para o login
            </Link>
          </div>
        </Card>

      </div>
    </div>
  );
}
