import { CheckCircle2, FileText, Send, Eye } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DocumentHistory({ document }: { document: any }) {
  if (!document) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events: any[] = [];
  // Use o array 'auditTrail' que o backend agora retorna, ou monte manualmente se preferir
  const sourceEvents = document.auditTrail || [];

  if (sourceEvents.length === 0) {
    // Fallback manual se não houver auditTrail
    if (document.createdAt) {
      events.push({
        date: new Date(document.createdAt),
        icon: <FileText className="h-4 w-4 text-blue-500" />,
        text: `DOCUMENTO CRIADO NO DIA ${new Date(document.createdAt).toLocaleDateString('pt-BR')} ÀS ${new Date(document.createdAt).toLocaleTimeString('pt-BR')} POR ${document.creator?.firstName || 'SISTEMA'} ${document.creator?.lastName || ''}`.toUpperCase()
      });
    }
    if (document.sentAt) {
      events.push({
        date: new Date(document.sentAt),
        icon: <Send className="h-4 w-4 text-purple-600" />,
        text: `DOCUMENTO PROTOCOLADO NO DIA ${new Date(document.sentAt).toLocaleDateString('pt-BR')} ÀS ${new Date(document.sentAt).toLocaleTimeString('pt-BR')} POR ${document.creator?.firstName} ${document.creator?.lastName}`.toUpperCase()
      });
    }
  } else {
    // USANDO O NOVO AUDIT TRAIL DO BACKEND
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sourceEvents.forEach((ev: any) => {
      let icon = <FileText className="h-4 w-4 text-slate-500" />;
      let actionText = "EVENTO REGISTRADO";

      if (ev.event === 'CREATED') {
        icon = <FileText className="h-4 w-4 text-blue-500" />;
        actionText = "DOCUMENTO CRIADO";
      }
      if (ev.event === 'SENT') {
        icon = <Send className="h-4 w-4 text-purple-600" />;
        actionText = "DOCUMENTO PROTOCOLADO";
      }
      if (ev.event === 'READ') {
        icon = <Eye className="h-4 w-4 text-yellow-600" />;
        actionText = "DOCUMENTO VISUALIZADO";
      }
      if (ev.event === 'SIGNED') {
        icon = <CheckCircle2 className="h-4 w-4 text-green-600" />;
        actionText = "DOCUMENTO ASSINADO DIGITALMENTE";
      }

      const dateStr = new Date(ev.timestamp).toLocaleDateString('pt-BR');
      const timeStr = new Date(ev.timestamp).toLocaleTimeString('pt-BR');
      const userName = `${ev.user?.firstName || ''} ${ev.user?.lastName || ''}`.trim();

      events.push({
        date: new Date(ev.timestamp),
        icon,
        text: `${actionText} NO DIA ${dateStr} ÀS ${timeStr} POR ${userName}`.toUpperCase()
      });
    });
  }

  return (
    <div className="mt-8 pt-4 border-t-2 border-slate-300 print:mt-0 print:pt-0 avoid-break">
      <h2 className="text-lg font-bold uppercase mb-4 text-center border-b pb-2">
        Histórico de Tramitação e Auditoria
      </h2>
      <div className="space-y-0 text-sm font-mono border-l-2 border-slate-300 ml-4 pl-4">
        {events.map((ev, index) => (
          <div key={index} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0 relative">
            <div className="absolute -left-[21px] bg-white p-1">{ev.icon}</div>
            <p className="text-slate-700 leading-tight">
              {ev.text}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-8 text-center text-[10px] text-slate-400 uppercase">
        Válidado pelo SIMP. Hash Original: {document.originalHash || 'PENDENTE'}
      </div>
    </div>
  );
}