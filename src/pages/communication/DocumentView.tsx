import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    FileSignature,
    Clock,
    Send,
    FileText,
    Paperclip,
    Download,
    Eye,
    ShieldCheck,
    Loader2,
    AlertCircle,
    PenTool
} from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { communicationApi } from "@/lib/services/communication";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { useDocument, useSignDocument } from "@/hooks/useCommunication";
import { LegalReceiptModal } from "@/components/documents/LegalReceiptModal";
import { useAuth } from "@/hooks/useAuth";
import { PrintableDocument } from "@/components/documents/PrintableDocument";
import { DocumentHistoryPage } from "@/components/documents/DocumentHistoryPage";

export default function DocumentView() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { user } = useAuth();

    const { data: document, isLoading, isError } = useDocument(id || "");
    const signMutation = useSignDocument();

    const [showReceipt, setShowReceipt] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    // Identifica o PDF Oficial
    const officialPdf = document?.attachments?.find((att: any) =>
        att.fileType === 'application/pdf' && (att.fileName.startsWith('OFICIO_') || att.fileName.startsWith('DOC_'))
    );

    // Carrega prévia segura via Backend
    useEffect(() => {
        const loadPdfPreview = async () => {
            if (officialPdf && document?.id) {
                try {
                    const blobUrl = await communicationApi.getAttachmentPreviewUrl(document.id, officialPdf.id);
                    setPreviewUrl(blobUrl);
                } catch (error) {
                    console.error("Erro ao carregar prévia", error);
                }
            }
        };
        loadPdfPreview();
        return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }
    }, [officialPdf, document?.id]); // Re-run when officialPdf changes (e.g. after signing)

    const handleDownload = async (attachment: any) => {
        if (!document) return;
        try {
            setDownloadingId(attachment.id);
            await communicationApi.downloadAttachment(document.id, attachment.id, attachment.fileName);
            toast({ title: "Sucesso", description: "Download iniciado." });
        } catch (error) {
            toast({ title: "Erro", description: "Falha ao baixar.", variant: "destructive" });
        } finally {
            setDownloadingId(null);
        }
    };

    const handleSign = async () => {
        if (!document) return;
        signMutation.mutate(document.id);
    };

    if (isLoading) return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;

    if (isError || !document) return (
        <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
            <div className="p-4 bg-red-50 text-red-800 rounded-full">
                <AlertCircle className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold">Documento não encontrado</h2>
            <Button variant="outline" onClick={() => navigate("/communication")}>
                Voltar para Lista
            </Button>
        </div>
    );

    // Verifica Permissão de Assinatura
    const recipientRecord = document.recipients?.find(r => r.userId === user?.id);
    const canSign = (document.createdBy === user?.id) || (recipientRecord?.role === 'TO');
    // Nota: O backend valida `canSign` e `isCreator`. Aqui simplificamos a UX.
    const alreadySigned = document.signatures?.some(s => s.userId === user?.id);
    const needsSignature = canSign && !alreadySigned && document.status !== 'DRAFT';

    // Timeline Dinâmica (Audit Trail ou Fallback)
    const timelineEvents = document.auditTrail || [
        { event: "CREATED", label: "Criado", icon: FileText, date: document.createdAt, description: "Documento criado" },
        { event: "SENT", label: "Protocolado", icon: Send, date: document.sentAt, description: "Enviado oficialmente" },
        { event: "READ", label: "Lido", icon: Eye, date: document.recipients?.[0]?.readAt, description: "Visualizado pelo destinatário" },
        { event: "SIGNED", label: "Assinado", icon: FileSignature, date: document.signatures?.[0]?.signedAt, description: "Assinado digitalmente" },
    ].filter(e => e.date);

    return (
        <div className="max-w-[1600px] mx-auto p-6 space-y-6 h-[calc(100vh-4rem)] flex flex-col">
            <div className="flex items-center justify-between bg-white p-4 rounded-lg border shadow-sm shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/communication")}><ArrowLeft className="h-5 w-5" /></Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-bold text-slate-900">{document.documentNumber || document.title}</h1>
                            <Badge variant={document.status === 'SENT' ? 'default' : 'secondary'}>{document.status === 'SENT' ? 'OFICIAL' : 'RASCUNHO'}</Badge>
                            {needsSignature && <Badge variant="destructive" className="animate-pulse">Assinatura Pendente</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{document.documentType} • {document.protocolNumber}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {needsSignature && (
                        <Button onClick={handleSign} disabled={signMutation.isPending} className="bg-green-700 hover:bg-green-800 text-white">
                            {signMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PenTool className="mr-2 h-4 w-4" />}
                            Assinar Digitalmente
                        </Button>
                    )}
                    {document.verification?.valid && (
                        <Button variant="outline" onClick={() => setShowReceipt(true)} className="text-blue-700 border-blue-200"><ShieldCheck className="mr-2 h-4 w-4" /> Comprovante</Button>
                    )}
                    {officialPdf && (
                        <Button onClick={() => handleDownload(officialPdf)} className="bg-slate-800"><Download className="mr-2 h-4 w-4" /> Baixar PDF</Button>
                    )}
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
                <div className="flex-1 bg-slate-100 rounded-xl border border-slate-200 shadow-inner overflow-y-auto max-h-[calc(100vh-12rem)] p-4 md:p-8 flex flex-col items-center gap-8">
                    {officialPdf && previewUrl ? (
                        <iframe src={`${previewUrl}#toolbar=0&view=FitH`} className="w-full h-[80vh] bg-slate-200 shadow-lg rounded" title="PDF Preview" />
                    ) : (
                        <>
                            <PrintableDocument
                                data={{
                                    title: document.title,
                                    documentNumber: document.documentNumber,
                                    protocolNumber: document.protocolNumber,
                                    type: document.documentType,
                                    documentType: document.documentType,
                                    subject: document.title
                                }}
                                user={user}
                                content={document.content}
                                fullDocumentData={document}
                                recipientsList={document.recipients?.map(r => ({
                                    ...r,
                                    name: r.user ? `${r.user.firstName} ${r.user.lastName}` : "Destinatário"
                                })) || []}
                            />

                            <div className="w-full max-w-[210mm] print:break-before-page">
                                <DocumentHistoryPage document={document} />
                            </div>
                        </>
                    )}
                </div>

                <div className="w-full lg:w-96 space-y-6 overflow-auto pr-1">
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex gap-2"><Clock className="h-4 w-4" /> Rastreamento</CardTitle></CardHeader>
                        <CardContent>
                            <div className="relative pl-4 border-l-2 border-slate-100 space-y-6 ml-1 py-1">
                                {timelineEvents.map((step: any, idx: number) => (
                                    <div key={idx} className="relative">
                                        <span className={`absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 bg-blue-500 border-blue-500`} />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">{step.description || step.event}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {step.timestamp ? new Date(step.timestamp).toLocaleString() : (step.date ? new Date(step.date).toLocaleString() : 'Pendente')}
                                                {step.user && ` • ${step.user.firstName} ${step.user.lastName}`}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {document.attachments && document.attachments.length > 0 && (
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex gap-2"><Paperclip className="h-4 w-4" /> Anexos</CardTitle></CardHeader>
                            <CardContent className="space-y-2">
                                {document.attachments.map((att: any) => (
                                    <div key={att.id} className="flex items-center justify-between p-2 rounded border bg-slate-50">
                                        <div className="flex items-center gap-2 truncate">
                                            <Paperclip className="h-4 w-4 text-blue-500" />
                                            <span className="text-sm truncate max-w-[150px]" title={att.fileName}>{att.fileName}</span>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDownload(att)}>
                                            {downloadingId === att.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                                        </Button>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {document.signatures && document.signatures.length > 0 && (
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex gap-2"><ShieldCheck className="h-4 w-4" /> Assinaturas Digitais</CardTitle></CardHeader>
                            <CardContent className="space-y-2">
                                {document.signatures.map((sig: any) => (
                                    <div key={sig.id} className="flex flex-col gap-1 text-xs bg-green-50 text-green-700 p-3 rounded border border-green-200">
                                        <div className="flex items-center gap-2 font-bold">
                                            <ShieldCheck className="h-3 w-3" />
                                            {sig.user?.firstName} {sig.user?.lastName}
                                        </div>
                                        <div className="pl-5 text-[10px] opacity-75">
                                            Em: {new Date(sig.signedAt).toLocaleString()}
                                        </div>
                                        <div className="pl-5 text-[10px] opacity-75 font-mono">
                                            Hash: {sig.sealData?.hash || "---"}
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {showReceipt && <LegalReceiptModal document={document} onClose={() => setShowReceipt(false)} />}
        </div>
    );
}