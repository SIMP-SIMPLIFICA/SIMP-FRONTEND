import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { publicApi, type PublicValidationResult } from "@/lib/services/public";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, XCircle, Loader2, FileText, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DigitalValidator() {
    const { hash } = useParams<{ hash: string }>();
    const navigate = useNavigate();

    const [result, setResult] = useState<PublicValidationResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (hash) {
            validate(hash);
        } else {
            setLoading(false);
            setError("Código de verificação não fornecido.");
        }
    }, [hash]);

    const validate = async (hashToVerify: string) => {
        try {
            const data = await publicApi.validate(hashToVerify);
            setResult(data);
        } catch (err: unknown) {
            console.error(err);
            const e = err as { response?: { data?: { message?: string } } };
            setError(e.response?.data?.message || "Não foi possível validar o documento.");
            setResult({ valid: false });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
                    <p className="text-slate-600 font-medium">Verificando autenticidade...</p>
                </div>
            </div>
        );
    }

    if (!result?.valid || error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
                <Card className="w-full max-w-md border-red-200 shadow-lg">
                    <CardHeader className="text-center pb-2">
                        <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                        <CardTitle className="text-xl text-red-700">Validação Falhou</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-6">
                        <p className="text-slate-600">
                            {error || "O documento não pôde ser encontrado ou o código é inválido."}
                        </p>
                        <div className="bg-white p-3 rounded border font-mono text-xs text-slate-500 break-all">
                            Hash: {hash}
                        </div>
                        <Button onClick={() => navigate("/login")} variant="secondary" className="w-full">
                            Voltar ao Início
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 flex justify-center items-start">
            <Card className="w-full max-w-2xl shadow-xl border-t-4 border-t-green-600 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <CardHeader className="text-center border-b bg-white pb-6">
                    <div className="mx-auto bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                        <ShieldCheck className="h-10 w-10 text-green-600" />
                    </div>
                    <CardTitle className="text-2xl text-green-800">Documento Autêntico</CardTitle>
                    <p className="text-slate-500 mt-2">
                        A integridade deste documento foi verificada digitalmente.
                    </p>
                </CardHeader>

                <CardContent className="space-y-8 pt-8">

                    {/* INFO PRINCIPAL */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Protocolo</span>
                            <div className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <FileText className="h-4 w-4 text-slate-400" />
                                {result.protocol}
                            </div>
                        </div>
                        <div className="space-y-1 md:text-right">
                            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Data de Emissão</span>
                            <div className="text-lg font-semibold text-slate-900 flex items-center gap-2 md:justify-end">
                                <Calendar className="h-4 w-4 text-slate-400" />
                                {result.date ? new Date(result.date).toLocaleString() : '-'}
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg border space-y-2">
                        <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Assinante Original</span>
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                                {result.signer?.charAt(0)}
                            </div>
                            <div>
                                <p className="font-medium text-slate-900">{result.signer}</p>
                                <Badge variant="secondary" className="text-[10px] h-5">Emissor</Badge>
                            </div>
                        </div>
                    </div>

                    {/* ASSINATURAS */}
                    {result.signatures && result.signatures.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">Assinaturas Digitais Registradas</h3>
                            <div className="space-y-3">
                                {result.signatures.map((sig, idx) => (
                                    <div key={idx} className="flex items-start gap-4 p-3 bg-green-50/50 rounded-lg border border-green-100">
                                        <ShieldCheck className="h-5 w-5 text-green-600 mt-1 shrink-0" />
                                        <div className="space-y-1 flex-1">
                                            <p className="font-semibold text-sm text-slate-800">{sig.name}</p>
                                            <p className="text-xs text-slate-500">{sig.role}</p>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] text-slate-400 font-mono">
                                                <span>Data: {new Date(sig.date).toLocaleString()}</span>
                                                {sig.hash && <span title={sig.hash}>Hash: {sig.hash.substring(0, 16)}...</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="pt-6 border-t text-center space-y-2">
                        <p className="text-xs text-slate-400 font-mono break-all">Original Hash: {hash}</p>
                        <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
                            Acessar Sistema
                        </Button>
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}
