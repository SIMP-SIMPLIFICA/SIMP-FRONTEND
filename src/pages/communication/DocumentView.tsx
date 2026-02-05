import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Printer,
    Clock,
    FileSignature,
    CheckCircle2,
    Hash,
    FileText,
    Send,
    AlertCircle
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { useDocument } from "@/hooks/useCommunication";
import { useMe } from "@/hooks/useMe";
import { LegalReceiptModal } from "@/components/documents/LegalReceiptModal";
import { useState } from "react";

export default function DocumentView() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const printRef = useRef<HTMLDivElement>(null);
    const [showReceipt, setShowReceipt] = useState(false);

    const { data: document, isLoading, isError } = useDocument(id || "");
    const { data: user } = useMe();

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: document?.documentNumber || "Documento",
    });

    if (isLoading) {
        return (
            <div className="p-8 space-y-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-[500px] w-full" />
            </div>
        );
    }

    if (isError || !document) {
        return (
            <div className="p-8">
                <div className="flex items-center gap-2 p-4 text-red-800 bg-red-50 rounded-lg border border-red-200">
                    <AlertCircle className="h-4 w-4" />
                    <div>
                        <h5 className="font-medium">Erro</h5>
                        <p className="text-sm">Não foi possível carregar o documento.</p>
                    </div>
                </div>
                <Button variant="outline" className="mt-4" onClick={() => navigate("/communication")}>
                    Voltar
                </Button>
            </div>
        );
    }

    const isAutoSigned = document.signatures?.some(
        (sig) => sig.userId === user?.user?.id && sig.signatureType === "AUTO"
    );

    const steps = [
        { status: "DRAFT", label: "Criado", icon: FileText, date: document.createdAt },
        { status: "SENT", label: "Enviado", icon: Send, date: document.sentAt },
        { status: "READ", label: "Lido", icon: CheckCircle2, date: null }, // TODO: Add readAt
        { status: "SIGNED", label: "Assinado", icon: FileSignature, date: document.signatures?.[0]?.signedAt },
    ];



    return (
        <div className="max-w-5xl mx-auto p-6 space-y-8">

            {/* Header e Ações */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/communication")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {document.documentNumber || document.title}
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{document.documentType}</Badge>
                            <span className="text-sm text-muted-foreground">
                                Criado em {new Date(document.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    {document.verification?.valid && (
                        <Button variant="secondary" onClick={() => setShowReceipt(true)}>
                            <FileSignature className="mr-2 h-4 w-4" />
                            Ver Comprovante
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => handlePrint()}>
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimir
                    </Button>
                </div>
            </div>

            {/* Alerta de Auto-Assinatura */}
            {isAutoSigned && (
                <div className="flex items-center gap-2 p-4 text-blue-800 bg-blue-50 rounded-lg border border-blue-200">
                    <FileSignature className="h-4 w-4" />
                    <div>
                        <h5 className="font-medium">Documento Assinado Automaticamente</h5>
                        <p className="text-sm">
                            Este documento foi assinado digitalmente por você no momento do envio.
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Conteúdo do Documento */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardContent className="p-8 min-h-[500px]">
                            {/* Área de Impressão (Simplificada para visualização) */}
                            <div ref={printRef} className="print:p-8">
                                <div className="text-center mb-8 hidden print:block">
                                    <h2 className="font-bold text-xl uppercase">Prefeitura Municipal de Pequizeiro</h2>
                                    <h3 className="font-bold text-lg">Gabinete do Prefeito</h3>
                                </div>

                                <div className="text-center mb-8">
                                    <h1 className="font-bold text-2xl uppercase border-b-2 border-black inline-block pb-1 px-4">
                                        {document.documentNumber || `${document.documentType} (SEM NÚMERO)`}
                                    </h1>
                                </div>

                                <div className="space-y-4 mb-8">
                                    <div className="flex">
                                        <span className="font-bold w-24">ASSUNTO:</span>
                                        <span className="uppercase flex-1 font-bold">{document.title}</span>
                                    </div>
                                </div>

                                <div
                                    className="text-justify leading-relaxed text-lg"
                                    dangerouslySetInnerHTML={{ __html: document.content }}
                                />

                                {/* Assinaturas no Documento */}
                                {document.signatures && document.signatures.length > 0 && (
                                    <div className="mt-16 pt-8 border-t border-gray-200 print:border-black">
                                        <h4 className="font-bold mb-4 uppercase text-sm text-gray-500 print:text-black">Assinaturas Digitais</h4>
                                        <div className="space-y-4">
                                            {document.signatures.map((sig) => (
                                                <div key={sig.id} className="flex items-center gap-3">
                                                    <CheckCircle2 className="h-5 w-5 text-green-600 print:hidden" />
                                                    <div>
                                                        <p className="font-bold uppercase">{sig.userName}</p>
                                                        <p className="text-xs text-muted-foreground print:text-black">
                                                            Assinado em {new Date(sig.signedAt).toLocaleString('pt-BR')} via SIMP
                                                            {sig.signatureType === 'AUTO' && ' (Auto-Assinado)'}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Hash no Rodapé */}
                                {document.originalHash && (
                                    <div className="mt-8 pt-4 border-t border-dashed text-xs text-gray-400 font-mono text-center print:text-black">
                                        HASH ORIGINAL: {document.originalHash}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar: Timeline e Metadados */}
                <div className="space-y-6">

                    {/* Timeline */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Linha do Tempo
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="relative pl-4 border-l-2 border-muted space-y-6">
                                {steps.map((step) => {
                                    const isCompleted = step.date;

                                    return (
                                        <div key={step.status} className="relative">
                                            <span className={`absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 ${isCompleted ? 'bg-blue-600 border-blue-600' : 'bg-background border-muted'
                                                }`} />
                                            <div className="text-sm font-medium">{step.label}</div>
                                            {step.date && (
                                                <div className="text-xs text-muted-foreground">
                                                    {new Date(step.date).toLocaleString('pt-BR')}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Metadados Técnicos */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Hash className="h-4 w-4" />
                                Metadados
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <span className="text-xs font-semibold text-muted-foreground block">ID do Documento</span>
                                <code className="text-xs bg-muted p-1 rounded">{document.id}</code>
                            </div>
                            <div>
                                <span className="text-xs font-semibold text-muted-foreground block">Hash Original</span>
                                <code className="text-xs bg-muted p-1 rounded break-all">
                                    {document.originalHash || "Ainda não gerado"}
                                </code>
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                                <img src="/placeholder-qr.png" alt="QR Code" className="h-16 w-16 bg-slate-100 rounded" />
                                <div className="text-xs text-muted-foreground">
                                    Escaneie para validar a autenticidade deste documento.
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </div>

            {showReceipt && (
                <LegalReceiptModal
                    document={document}
                    onClose={() => setShowReceipt(false)}
                />
            )}
        </div>
    );
}
