import React from 'react';

interface DocumentHistoryPageProps {
    document: any; // Using any for flexibility with backend response, but should be typed ideally
}

export const DocumentHistoryPage: React.FC<DocumentHistoryPageProps> = ({ document }) => {
    // Mock data/Logic to extract interesting events from the document
    // In a real scenario, this would filter specific 'AUDIT' logs or the auditTrail field
    const events = document.auditTrail || [
        { event: "CREATED", label: "CRIADO", date: document.createdAt, user: document.owner || document.author },
        { event: "SENT", label: "PROTOCOLADO", date: document.sentAt, user: document.sender },
        { event: "READ", label: "VISUALIZADO", date: document.recipients?.[0]?.readAt, user: document.recipients?.[0] },
        { event: "SIGNED", label: "ASSINADO", date: document.signatures?.[0]?.signedAt, user: document.signatures?.[0]?.user },
    ];

    // Filter only existing events and sort mainly by date
    const sortedEvents = events
        .filter((e: any) => e.date)
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return (
        <div className="doc-wrapper print:bg-white print:p-0">
            <div className="doc-sheet">
                <div className="border-b-2 border-gray-800 pb-4 mb-8 text-center">
                    <h1 className="text-2xl font-bold uppercase font-serif tracking-wider">Histórico do Documento</h1>
                    <p className="text-sm text-gray-500 mt-2 font-mono">
                        ID: {document.id} • Protocolo: {document.protocolNumber || "N/A"}
                    </p>
                </div>

                <div className="flex-1">
                    <div className="relative border-l-4 border-gray-200 ml-8 space-y-12 py-4">
                        {sortedEvents.map((ev: any, idx: number) => (
                            <div key={idx} className="relative pl-8">
                                {/* Timeline Dot */}
                                <div className="absolute -left-[11px] top-1 h-5 w-5 rounded-full border-4 border-white bg-gray-800 shadow-sm" />

                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-lg uppercase tracking-wide text-gray-800">
                                            {ev.label || ev.event}
                                        </span>
                                        <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                                            {new Date(ev.date).toLocaleDateString('pt-BR')} às {new Date(ev.date).toLocaleTimeString('pt-BR')}
                                        </span>
                                    </div>

                                    {ev.user && (
                                        <div className="text-sm text-gray-600 mt-1">
                                            <span className="font-semibold">Responsável:</span> {ev.user.name || `${ev.user.firstName} ${ev.user.lastName}`}
                                            {ev.user.role && <span className="text-xs opacity-75 ml-2">({ev.user.role})</span>}
                                        </div>
                                    )}

                                    {ev.description && (
                                        <p className="text-sm italic text-gray-500 mt-1">"{ev.description}"</p>
                                    )}
                                </div>
                            </div>
                        ))}

                        {sortedEvents.length === 0 && (
                            <p className="text-center text-gray-400 italic">Nenhum evento registrado.</p>
                        )}
                    </div>
                </div>

                <div className="mt-auto border-t border-gray-300 pt-4 text-center">
                    <p className="text-xs text-gray-400 font-mono">
                        Relatório gerado automaticamente pelo Sistema SIMP
                    </p>
                </div>
            </div>
        </div>
    );
};
