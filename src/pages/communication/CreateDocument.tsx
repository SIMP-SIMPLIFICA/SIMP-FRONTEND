import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, Send, X, Paperclip, UploadCloud, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

import { useCreateDocument, useSendDocument, useDocument } from "@/hooks/useCommunication";
import { useRecipients } from "@/hooks/useRecipients";
import type { CreateDocumentDTO, DocumentType, Priority } from "@/lib/services/communication";
import { uploadApi } from "@/lib/services/communication";

import RichTextEditor from "@/components/ui/RichTextEditor";

// Função mais robusta para converter imagem da pasta public em Base64
const convertImageToBase64 = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject("Canvas context error");
        return;
      }
      ctx.drawImage(img, 0, 0);
      const dataURL = canvas.toDataURL('image/png');
      resolve(dataURL);
    };
    img.onerror = (error) => {
      console.error("Erro ao carregar imagem para Base64:", error);
      // Retorna string vazia para não quebrar o fluxo, mas avisa no console
      resolve("");
    };
  });
};

export default function CreateDocument() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("id");
  const { toast } = useToast();

  const { mutateAsync: createDocument, isPending: isCreating } = useCreateDocument();
  const { mutateAsync: sendDocument, isPending: isSending } = useSendDocument();
  const { data: existingDoc } = useDocument(editId || "");

  const { data: recipientsData } = useRecipients();
  const recipientsList = recipientsData || [];

  // STATES
  const [title, setTitle] = useState("");
  const [type, setType] = useState<DocumentType>("OFICIO");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);

  // Layout
  const currentYear = new Date().getFullYear();
  const [docNumberPrefix, setDocNumberPrefix] = useState("001");
  const [customHeader, setCustomHeader] = useState("");
  const [editorContent, setEditorContent] = useState("");

  // Anexos
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // --- HELPER PARA NOMES ---
  const getRecipientName = (u: any) => {
    const target = u.user || u;
    if (!target) return "Usuário Desconhecido";
    return target.firstName ? `${target.firstName} ${target.lastName}` : target.username;
  };

  // Carregar dados na edição
  useEffect(() => {
    if (existingDoc && editId) {
      setTitle(existingDoc.title);
      // Tenta recuperar o número editado
      if (existingDoc.documentNumber) {
        const parts = existingDoc.documentNumber.split('/');
        setDocNumberPrefix(parts[0] || "001");
      }
      if (existingDoc.metadata?.customHeader) setCustomHeader(existingDoc.metadata.customHeader);

      if (existingDoc.metadata?.paragrafos) {
        // @ts-ignore
        const html = existingDoc.metadata.paragrafos.map((p) => `<p>${p.texto}</p>`).join("");
        setEditorContent(html);
      } else {
        setEditorContent(existingDoc.content || "");
      }

      if (existingDoc.recipients) setSelectedRecipientIds(existingDoc.recipients.map((r: any) => r.userId));

      if (existingDoc.attachments) {
        setAttachments(existingDoc.attachments);
      }
    }
  }, [existingDoc, editId]);

  // --- HANDLERS ---
  const addRecipient = (userId: string) => {
    if (!userId || selectedRecipientIds.includes(userId)) return;
    const newIds = [...selectedRecipientIds, userId];
    setSelectedRecipientIds(newIds);

    if (newIds.length === 1 && !customHeader && recipientsList) {
      const userObj = recipientsList.find((u: any) => u.id === userId);
      if (userObj) {
        const name = getRecipientName(userObj).toUpperCase();
        setCustomHeader(`À SUA SENHORIA O(A) SENHOR(A)\n${name}\nCARGO NÃO INFORMADO`);
      }
    }
  };

  const removeRecipient = (userId: string) => setSelectedRecipientIds(ids => ids.filter(id => id !== userId));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setIsUploading(true);
    const file = e.target.files[0];
    try {
      const uploaded = await uploadApi.uploadFile(file);
      setAttachments(prev => [...prev, uploaded]);
      toast({ title: "Anexo adicionado", description: file.name });
    } catch (error) {
      toast({ title: "Erro no upload", description: "Não foi possível enviar o arquivo.", variant: "destructive" });
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleAction = async (action: 'DRAFT' | 'SEND') => {
    if (!title) return toast({ title: "Erro", description: "Assunto obrigatório.", variant: "destructive" });

    // Preparação dos dados para envio
    const parser = new DOMParser();
    const doc = parser.parseFromString(editorContent, 'text/html');
    const paragraphsArray = Array.from(doc.body.querySelectorAll('p, h1, h2, li'))
      .map(el => ({ id: crypto.randomUUID(), texto: el.textContent?.trim() || "" }))
      .filter(p => p.texto !== "");

    if (paragraphsArray.length === 0 && editorContent.trim()) paragraphsArray.push({ id: crypto.randomUUID(), texto: doc.body.textContent || "" });

    // 1. Tenta converter a logo para Base64
    console.log("Gerando Base64 da logo...");
    const logoBase64 = await convertImageToBase64("/logo.png");
    if (!logoBase64) {
      console.warn("Atenção: Logo retornou vazia. Verifique se 'public/logo.png' existe.");
    } else {
      console.log("Logo gerada com sucesso. Tamanho:", logoBase64.length);
    }

    // 2. Garante que o número do documento seja o editado
    const finalDocNumber = `${docNumberPrefix}/${currentYear}`;

    const payload: CreateDocumentDTO = {
      title,
      content: editorContent,
      documentType: type,
      priority: priority,
      documentNumber: finalDocNumber, // Envia no campo padrão
      recipients: selectedRecipientIds.map(id => ({ userId: id, role: "TO" })),
      attachments: attachments,
      metadata: {
        // Envia dados cruciais para o gerador de PDF
        customHeader: customHeader,
        paragrafos: paragraphsArray,
        logoBase64: logoBase64, // Logo embutida
        useCustomLayout: true, // Flag para avisar o backend (se implementado)
        manualDocumentNumber: finalDocNumber, // Redundância para garantir
        generated_file: true
      }
    };

    try {
      let docId = editId;
      if (!docId) {
        const newDoc = await createDocument(payload);
        docId = newDoc.id;
      }

      if (action === 'SEND' && docId) {
        if (selectedRecipientIds.length === 0) return toast({ title: "Erro", description: "Adicione um destinatário.", variant: "destructive" });
        await sendDocument(docId);
        toast({ title: "Sucesso!", description: "Protocolado e Assinado." });
        navigate("/communication");
      } else {
        toast({ title: "Salvo", description: "Rascunho atualizado." });
        navigate("/communication");
      }
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast({ title: "Erro", description: error.message || "Falha ao processar.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-20">
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/communication")}><ArrowLeft className="h-5 w-5" /></Button>
          <span className="font-semibold text-slate-700">Editor de Ofício</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleAction('DRAFT')} disabled={isCreating || isSending}><Save className="w-4 h-4 mr-2" /> Rascunho</Button>
          <Button onClick={() => handleAction('SEND')} disabled={isCreating || isSending} className="bg-blue-600 hover:bg-blue-700">
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Assinar Digitalmente</>}
          </Button>
        </div>
      </div>

      <div className="max-w-[210mm] mx-auto mt-8 bg-white shadow-lg min-h-[297mm] p-[20mm] flex flex-col relative">
        {/* LOGO (Visualização no Editor) */}
        <div className="flex justify-center mb-8">
          <img src="/logo.png" alt="Logo" className="h-24 object-contain" onError={(e) => console.error("Erro ao carregar logo no editor", e)} />
        </div>

        {/* NUMERAÇÃO */}
        <div className="flex justify-between items-end mb-8">
          <div className="flex items-center gap-1 font-bold text-lg uppercase">
            <span>{type} Nº</span>
            <div className="flex items-center bg-slate-50 border border-slate-300 rounded px-2">
              <input className="w-16 bg-transparent border-none text-right focus:ring-0 p-1" value={docNumberPrefix} onChange={e => setDocNumberPrefix(e.target.value)} />
              <span className="text-slate-500">/{currentYear}</span>
            </div>
          </div>
          <div className="text-right text-sm">Pequizeiro - TO, {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.</div>
        </div>

        {/* DESTINATÁRIOS */}
        <div className="mb-6 p-4 border border-dashed border-slate-300 rounded bg-slate-50/50">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs text-blue-600 font-bold uppercase">1. Adicionar Destinatários</label>
            <Select onValueChange={addRecipient}>
              <SelectTrigger className="h-8 w-[250px] text-xs bg-white"><SelectValue placeholder="Selecione para adicionar à lista..." /></SelectTrigger>
              <SelectContent>
                {recipientsList.map((u: any) => (
                  <SelectItem key={u.id} value={u.id}>
                    {getRecipientName(u)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2 mb-4 min-h-[24px]">
            {selectedRecipientIds.length === 0 && <span className="text-xs text-slate-400 italic">Ninguém selecionado.</span>}
            {selectedRecipientIds.map(id => {
              const u = recipientsList.find((r: any) => r.id === id);
              return (
                <div key={id} className="flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full border border-blue-200">
                  <span>{u ? getRecipientName(u) : "Usuário"}</span>
                  <button onClick={() => removeRecipient(id)} className="hover:text-red-600"><X className="w-3 h-3" /></button>
                </div>
              );
            })}
          </div>
          <label className="text-xs text-blue-600 font-bold uppercase mb-1 block">2. Cabeçalho do Texto (Editável)</label>
          <Textarea value={customHeader} onChange={e => setCustomHeader(e.target.value)} className="font-bold uppercase border-none bg-transparent p-0 resize-none min-h-[80px] focus-visible:ring-0 text-base" placeholder="À SUA SENHORIA..." />
        </div>

        {/* ASSUNTO */}
        <div className="mb-6 flex gap-2 items-center border-b pb-1">
          <span className="font-bold uppercase">ASSUNTO:</span>
          <Input value={title} onChange={e => setTitle(e.target.value)} className="font-bold uppercase border-none px-0 h-auto focus-visible:ring-0" placeholder="DIGITE O ASSUNTO..." />
        </div>

        {/* EDITOR */}
        <div className="flex-1 mb-8">
          <RichTextEditor content={editorContent} onChange={setEditorContent} disabled={isCreating || isSending} />
        </div>

        {/* ANEXOS */}
        <div className="mb-8 border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-slate-600 flex items-center gap-2"><Paperclip className="w-4 h-4" /> Documentos Anexos</label>
            <div className="relative">
              <input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" disabled={isUploading} />
              <Button variant="outline" size="sm" disabled={isUploading}>
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UploadCloud className="w-4 h-4 mr-2" />}
                {isUploading ? "Enviando..." : "Anexar Arquivo"}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {attachments.map((att, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm bg-slate-50 p-2 rounded border">
                <span className="truncate max-w-[300px]">{att.fileName}</span>
                <button onClick={() => removeAttachment(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded"><X className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>

        {/* RODAPÉ (Visualização) */}
        <div className="mt-auto pt-8 flex flex-col items-center justify-center text-center">
          <div className="w-64 border-t border-black mb-2"></div>
          <p className="font-bold uppercase">ADMIN USER</p>
          <p className="text-sm">Cargo Administrativo</p>
          <p className="text-xs text-slate-400 mt-2">Assinado Digitalmente via SIMP</p>
        </div>
      </div>
    </div>
  );
}