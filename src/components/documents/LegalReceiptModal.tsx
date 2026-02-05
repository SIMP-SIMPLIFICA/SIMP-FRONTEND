
import { QRCodeCanvas } from 'qrcode.react';
import { format } from 'date-fns';
import type { CommunicationDocument } from '@/lib/api/communication';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface LegalReceiptModalProps {
    document: CommunicationDocument;
    onClose: () => void;
}

export const LegalReceiptModal = ({ document, onClose }: LegalReceiptModalProps) => {
    if (!document || !document.verification || !document.verification.valid) return null;

    const { protocol, hash, url, timestamp } = document.verification;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-slate-50">
                    <h3 className="text-lg font-semibold text-slate-800">
                        Comprovante de Protocolo Digital
                    </h3>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">

                    {/* QR Code Section */}
                    <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="bg-white p-2 rounded-lg border shadow-sm">
                            <QRCodeCanvas value={url} size={150} level={"H"} />
                        </div>
                        <p className="text-xs text-center text-muted-foreground max-w-[200px]">
                            Escaneie o QR Code para validar a autenticidade deste documento.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-b py-4">
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Número do Protocolo</label>
                            <div className="text-lg font-bold text-slate-900 mt-1">{protocol}</div>
                        </div>
                        <div className="text-right">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data de Emissão</label>
                            <div className="text-sm font-medium text-slate-900 mt-1">
                                {timestamp ? format(new Date(timestamp), 'dd/MM/yyyy HH:mm:ss') : '-'}
                            </div>
                        </div>
                    </div>

                    {/* Hash Section */}
                    <div className="space-y-1">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hash SHA-256 (Original)</span>
                        <div className="bg-slate-100 p-2 rounded border font-mono text-[10px] break-all text-slate-600">
                            {hash}
                        </div>
                    </div>

                    {/* Footer Info */}
                    <div className="text-center text-xs text-muted-foreground bg-slate-50 -mx-6 -mb-6 p-4 mt-6 border-t">
                        Verifique a autenticidade em: <br />
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium break-all"
                        >
                            {url}
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};
