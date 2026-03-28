import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, LayoutGrid, Loader2 } from "lucide-react";

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
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 backdrop-blur-sm">
            <LayoutGrid className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-semibold tracking-wide text-white">SIMP</span>
        </div>

        <Card className="rounded-3xl border-slate-200 p-8 shadow-sm">
          {!success ? (
            <>
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Recuperar senha</h2>
                <p className="mt-1.5 text-sm text-slate-500">
                  Informe seu e-mail institucional e enviaremos as instruções de recuperação.
                </p>
              </div>

              <form onSubmit={onSubmit} className="mt-7 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">E-mail Institucional</label>
                  <Input
                    type="email"
                    className="h-11 rounded-xl"
                    placeholder="exemplo@prefeitura.gov.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full rounded-xl bg-[#0A5BC4] text-sm font-medium hover:bg-[#094FA8] transition-colors"
                  disabled={loading}
                >
                  {loading
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</>
                    : "Enviar link de recuperação"
                  }
                </Button>
              </form>
            </>
          ) : (
            <div className="py-4 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Verifique seu e-mail</h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                Enviamos um link de recuperação para{" "}
                <span className="font-medium text-slate-700">{email}</span>.
                <br />Verifique também a caixa de spam.
              </p>
              <Button
                variant="outline"
                className="mt-6 h-11 w-full rounded-xl"
                onClick={() => { setSuccess(false); setEmail(""); }}
              >
                Tentar outro e-mail
              </Button>
            </div>
          )}

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
