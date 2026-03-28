import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, LayoutGrid, Loader2, Lock } from "lucide-react";

import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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
    if (password !== confirm) {
      toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await apiRequest("/api/v1/auth/reset-password", {
        method: "POST",
        noAuth: true,
        body: JSON.stringify({ token, password }),
      });
      toast({ title: "Senha alterada!", description: "Você já pode fazer login com a nova senha." });
      navigate("/login");
    } catch (err: any) {
      toast({
        title: "Erro",
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

          <form onSubmit={onSubmit} className="mt-7 space-y-5">
            {/* Nova senha */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Nova Senha</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  className="h-11 rounded-xl pr-10"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={loading}
                  autoComplete="new-password"
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
                  autoComplete="new-password"
                />
              </div>
              {confirm && password !== confirm && (
                <p className="text-xs text-red-500">As senhas não coincidem.</p>
              )}
            </div>

            <Button
              type="submit"
              className="h-11 w-full rounded-xl bg-[#0A5BC4] text-sm font-medium hover:bg-[#094FA8] transition-colors"
              disabled={loading || (!!confirm && password !== confirm)}
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
