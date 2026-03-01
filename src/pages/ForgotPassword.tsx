import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, LayoutGrid, Loader2, CheckCircle2 } from "lucide-react";

import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiRequest("/api/v1/auth/forgot-password", {
        method: "POST",
        noAuth: true,
        body: JSON.stringify({ email }),
      });
      setSuccess(true);
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message || "Não foi possível enviar o e-mail.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
          Recuperar Senha
        </h2>
        
        {!success ? (
          <>
            <p className="mt-2 text-center text-sm text-slate-500">
              Informe seu e-mail institucional para receber as instruções.
            </p>

            <form onSubmit={onSubmit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">E-mail</label>
                <Input
                  type="email"
                  className="h-11 rounded-2xl"
                  placeholder="exemplo@prefeitura.gov.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                className="h-11 w-full rounded-2xl bg-[#0A5BC4] hover:bg-[#094FA8]"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar Link
              </Button>
            </form>
          </>
        ) : (
          <div className="mt-6 text-center animate-in fade-in zoom-in duration-300">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">Verifique seu e-mail</h3>
            <p className="mt-2 text-sm text-slate-500">
              Enviamos um link de recuperação para <strong>{email}</strong>.
            </p>
            <Button
              variant="secondary"
              className="mt-6 h-11 w-full rounded-2xl"
              onClick={() => setSuccess(false)}
            >
              Tentar outro e-mail
            </Button>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-[#0A5BC4]"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para o Login
          </Link>
        </div>
      </Card>
    </div>
  );
}