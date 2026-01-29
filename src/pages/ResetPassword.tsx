import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { LayoutGrid, Loader2, Eye, EyeOff, Lock } from "lucide-react";

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
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      toast({ title: "Link inválido", description: "O link de recuperação parece estar quebrado.", variant: "destructive" });
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
        <Card className="w-full max-w-md rounded-3xl p-8 text-center">
          <Lock className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <h2 className="text-xl font-semibold text-slate-900">Link Inválido</h2>
          <p className="mt-2 text-slate-500 mb-6">Não encontramos o token de segurança necessário.</p>
          <Link to="/login"><Button>Voltar ao Login</Button></Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A5BC4] flex items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-3xl border-slate-200 p-8 shadow-xl">
        <div className="mb-6 flex justify-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#0A5BC4]/10">
            <LayoutGrid className="h-6 w-6 text-[#0A5BC4]" />
          </div>
        </div>

        <h2 className="text-center text-2xl font-semibold text-slate-900">
          Redefinir Senha
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          Crie uma nova senha forte para sua conta.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Nova Senha</label>
            <div className="relative">
              <Input
                type={showPass ? "text" : "password"}
                className="h-11 rounded-2xl pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Confirmar Senha</label>
            <Input
              type={showPass ? "text" : "password"}
              className="h-11 rounded-2xl"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            className="h-11 w-full rounded-2xl bg-[#0A5BC4] hover:bg-[#094FA8]"
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Nova Senha
          </Button>
        </form>
      </Card>
    </div>
  );
}