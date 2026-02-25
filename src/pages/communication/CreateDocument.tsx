import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, Send, X, Paperclip, UploadCloud, Loader2, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

import { useCreateDocument, useSendDocument, useDocument, useUpdateDocument } from "@/hooks/useCommunication";
import { useRecipients } from "@/hooks/useRecipients";
import { useAuth } from "@/hooks/useAuth";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const editId = searchParams.get("id");
  const { toast } = useToast();

  const { mutateAsync: createDocument, isPending: isCreating } = useCreateDocument();
  const { mutateAsync: updateDocument, isPending: isUpdating } = useUpdateDocument();
  const { mutateAsync: sendDocument, isPending: isSending } = useSendDocument();
  const { data: existingDoc } = useDocument(editId || "");

  // Reply Logic
  const replyToId = searchParams.get("replyTo");
  const { data: replyToDoc } = useDocument(replyToId || "");

  const isMessageMode = searchParams.get("mode") === "message" || existingDoc?.documentType === "MENSAGEM";

  const { data: recipientsData } = useRecipients();
  const recipientsList = recipientsData || [];
  const { user } = useAuth();

  // AUTO-SAVE STATES
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"IDLE" | "SAVING" | "SAVED">("IDLE");

  // STATES
  const [title, setTitle] = useState("");
  const [type, setType] = useState<DocumentType>("OFICIO");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  // STATE ALTERADO: Agora armazena objetos { userId }
  const [selectedRecipients, setSelectedRecipients] = useState<{ userId: string }[]>([]);

  // Layout
  const currentYear = new Date().getFullYear();
  const [docNumberPrefix, setDocNumberPrefix] = useState("001");
  const [customHeader, setCustomHeader] = useState("");
  const [editorContent, setEditorContent] = useState("");

  // Anexos
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // ... (Layout handlers omitted)

  // --- HELPER PARA NOMES ---
  const getRecipientName = (u: any) => {
    const target = u.user || u;
    if (!target) return "Usuário Desconhecido";
    return target.firstName ? `${target.firstName} ${target.lastName}` : target.username;
  };

  // Carregar dados na edição
  useEffect(() => {
    if (existingDoc && editId && !isInitialized) {
      setTitle(existingDoc.title);
      // ... (existing number logic remains)
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

      if (existingDoc.recipients) {
        const filteredRecipients = existingDoc.recipients.filter((r: any) => r.userId !== user?.id);
        setSelectedRecipients(filteredRecipients.map((r: any) => ({
          userId: r.userId
        })));
      }

      if (existingDoc.attachments) {
        setAttachments(existingDoc.attachments);
      }
      setIsInitialized(true);
    }
  }, [existingDoc, editId, isInitialized, user?.id]);

  // Carregar dados na resposta (Reply)
  useEffect(() => {
    if (replyToDoc && replyToId && !isInitialized && !existingDoc) {
      setTitle(`RE: ${replyToDoc.title}`);

      // Auto-preenche o remetente original como destinatário
      if (replyToDoc.createdBy && replyToDoc.createdBy !== user?.id) {
        setSelectedRecipients([{ userId: replyToDoc.createdBy }]);
      }

      // Constrói o histórico da citação (blockquote)
      const senderName = replyToDoc.creator?.firstName
        ? `${replyToDoc.creator.firstName} ${replyToDoc.creator.lastName}`
        : 'Remetente';
      const sendDate = replyToDoc.sentAt || replyToDoc.createdAt;
      const formattedDate = new Date(sendDate).toLocaleString('pt-BR');

      const quoteHtml = `
        <p><br></p>
        <p><br></p>
        <blockquote style="border-left: 3px solid #cbd5e1; padding-left: 1rem; color: #475569; margin-left: 0; background-color: #f8fafc; padding: 1rem; border-radius: 0 0.5rem 0.5rem 0;">
          <strong>Em ${formattedDate}, ${senderName} escreveu <a href="/communication/document/${replyToDoc.id}" target="_blank">no documento original</a>:</strong><br><br>
          ${replyToDoc.content}
        </blockquote>
      `;
      setEditorContent(quoteHtml);
      setIsInitialized(true);
      setIsDirty(true);
    }
  }, [replyToDoc, replyToId, isInitialized, existingDoc, user?.id]);

  // --- HANDLERS ---
  const addRecipient = (userId: string) => {
    if (!userId || selectedRecipients.some(r => r.userId === userId)) return;

    const newRecipient = { userId };
    const newRecipients = [...selectedRecipients, newRecipient];
    setSelectedRecipients(newRecipients);
    setIsDirty(true);

    if (newRecipients.length === 1 && !customHeader && recipientsList) {
      const userObj = recipientsList.find((u: any) => u.id === userId);
      if (userObj) {
        const name = getRecipientName(userObj).toUpperCase();
        setCustomHeader(`À SUA SENHORIA O(A) SENHOR(A)\n${name}\nCARGO NÃO INFORMADO`);
      }
    }
  };

  const removeRecipient = (userId: string) => {
    setSelectedRecipients(prev => prev.filter(r => r.userId !== userId));
    setIsDirty(true);
  };



  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setIsUploading(true);
    const file = e.target.files[0];
    try {
      const uploaded = await uploadApi.uploadFile(file);
      setAttachments(prev => [...prev, uploaded]);
      setIsDirty(true);
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
    setIsDirty(true);
  };

  const buildPayload = async (): Promise<CreateDocumentDTO> => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(editorContent, 'text/html');
    const paragraphsArray = Array.from(doc.body.querySelectorAll('p, h1, h2, li'))
      .map(el => ({ id: crypto.randomUUID(), texto: el.textContent?.trim() || "" }))
      .filter(p => p.texto !== "");

    if (paragraphsArray.length === 0 && editorContent.trim()) paragraphsArray.push({ id: crypto.randomUUID(), texto: doc.body.textContent || "" });

    // 1. Tenta converter a logo para Base64
    const logoBase64 = await convertImageToBase64("/logo.png");

    // 2. Garante que o número do documento seja o editado
    const finalDocNumber = `${docNumberPrefix}/${currentYear}`;

    return {
      title,
      content: editorContent || '<p><br></p>',
      documentType: isMessageMode ? "MENSAGEM" as any : type,
      priority: priority,
      documentNumber: finalDocNumber, // Envia no campo padrão
      recipients: selectedRecipients.map(r => ({ userId: r.userId, role: "TO" })),
      attachments: attachments,
      metadata: {
        // Envia dados cruciais para o gerador de PDF
        customHeader: customHeader,
        paragrafos: paragraphsArray,
        logoBase64: logoBase64, // Logo embutida
        useCustomLayout: true, // Flag para avisar o backend (se implementado)
        manualDocumentNumber: finalDocNumber, // Redundância para garantir
        generated_file: true,
        ...(replyToId && replyToDoc ? { replyToId: replyToDoc.id, replyToTitle: replyToDoc.title } : {})
      }
    };
  };

  const handleAutoSave = async () => {
    if (!title) return; // Ignora silenciosamente se não houver título durante o Auto-Save
    setSaveStatus("SAVING");
    try {
      const payload = await buildPayload();
      let docId = editId;
      if (docId) {
        await updateDocument({ id: docId, data: payload });
      } else {
        const newDoc = await createDocument(payload);
        searchParams.set("id", newDoc.id);
        setSearchParams(searchParams, { replace: true });
      }
      setIsDirty(false);
      setSaveStatus("SAVED");
      setTimeout(() => setSaveStatus("IDLE"), 2500);
    } catch (e) {
      console.error("Auto-save failed", e);
      setSaveStatus("IDLE");
    }
  };

  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(() => {
      handleAutoSave();
    }, 2500); // 2.5s debounce
    return () => clearTimeout(timer);
  }, [isDirty, title, editorContent, customHeader, selectedRecipients, type, docNumberPrefix, attachments]);

  const handleAction = async (action: 'DRAFT' | 'SEND') => {
    if (!title) return toast({ title: "Erro", description: "Assunto obrigatório.", variant: "destructive" });

    try {
      const payload = await buildPayload();
      let docId = editId;
      if (!docId) {
        const newDoc = await createDocument(payload);
        docId = newDoc.id;
        searchParams.set("id", docId);
        setSearchParams(searchParams, { replace: true });
      } else if (isDirty || action === 'DRAFT') {
        await updateDocument({ id: docId, data: payload });
      }

      if (action === 'SEND' && docId) {
        if (selectedRecipients.length === 0) return toast({ title: "Erro", description: "Adicione um destinatário.", variant: "destructive" });
        await sendDocument(docId);
        toast({ title: "Sucesso!", description: "Protocolado e Assinado." });
        navigate("/communication");
      } else {
        toast({ title: "Salvo", description: "Rascunho atualizado." });
        setIsDirty(false);
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

          {/* Visual Feedback de Auto-Save */}
          <div className="ml-4 flex items-center h-full">
            {saveStatus === 'SAVING' && <span className="text-xs font-medium text-slate-400 flex items-center animate-pulse"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Salvando...</span>}
            {saveStatus === 'SAVED' && <span className="text-xs font-medium text-green-500 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1" /> Salvo</span>}
            {saveStatus === 'IDLE' && isDirty && <span className="text-xs font-medium text-amber-500 italic">Alterações não salvas</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleAction('DRAFT')} disabled={isCreating || isSending}><Save className="w-4 h-4 mr-2" /> Rascunho</Button>
          <Button onClick={() => handleAction('SEND')} disabled={isCreating || isSending} className="bg-blue-600 hover:bg-blue-700">
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> {isMessageMode ? "Enviar Mensagem" : "Assinar Digitalmente"}</>}
          </Button>
        </div>
      </div>

      <div className="max-w-[210mm] mx-auto mt-8 bg-white shadow-lg min-h-[297mm] p-[20mm] flex flex-col relative">
        {/* LOGO (Visualização no Editor) */}
        {!isMessageMode && (
          <div className="flex justify-center mb-8">
            <img src="/logo.png" alt="Logo" className="h-24 object-contain" onError={(e) => console.error("Erro ao carregar logo no editor", e)} />
          </div>
        )}

        {/* NUMERAÇÃO */}
        {!isMessageMode && (
          <div className="flex justify-between items-end mb-8">
            <div className="flex items-center gap-1 font-bold text-lg uppercase">
              <Select value={type} onValueChange={(v: DocumentType) => { setType(v); setIsDirty(true); }}>
                <SelectTrigger className="w-[180px] border-none font-bold text-lg uppercase shadow-none focus:ring-0 pl-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OFICIO">OFÍCIO</SelectItem>
                  <SelectItem value="MEMORANDO">MEMORANDO</SelectItem>
                  <SelectItem value="OFICIO_CIRCULAR">CIRCULAR</SelectItem>
                  <SelectItem value="DECRETO">DECRETO</SelectItem>
                  <SelectItem value="PORTARIA">PORTARIA</SelectItem>
                  <SelectItem value="REQUERIMENTO">REQUERIMENTO</SelectItem>
                </SelectContent>
              </Select>
              <span className="mx-1">Nº</span>
              <div className="flex items-center bg-slate-50 border border-slate-300 rounded px-2">
                <input className="w-16 bg-transparent border-none text-right focus:ring-0 p-1" value={docNumberPrefix} onChange={e => { setDocNumberPrefix(e.target.value); setIsDirty(true); }} />
                <span className="text-slate-500">/{currentYear}</span>
              </div>
            </div>
            <div className="text-right text-sm">Pequizeiro - TO, {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.</div>
          </div>
        )}

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
            {selectedRecipients.length === 0 && <span className="text-xs text-slate-400 italic">Ninguém selecionado.</span>}
            {selectedRecipients.map(recipient => {
              const u = recipientsList.find((r: any) => r.id === recipient.userId);
              return (
                <div key={recipient.userId} className="flex items-center gap-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full border border-blue-200">
                  <span className="font-medium">{u ? getRecipientName(u) : "Usuário"}</span>



                  <button onClick={() => removeRecipient(recipient.userId)} className="hover:text-red-600 ml-1"><X className="w-3 h-3" /></button>
                </div>
              );
            })}
          </div>
          {!isMessageMode && (
            <>
              <label className="text-xs text-blue-600 font-bold uppercase mb-1 block">2. Cabeçalho do Texto (Editável)</label>
              <Textarea value={customHeader} onChange={e => { setCustomHeader(e.target.value); setIsDirty(true); }} className="font-bold uppercase border-none bg-transparent p-0 resize-none min-h-[80px] focus-visible:ring-0 text-base" placeholder="À SUA SENHORIA..." />
            </>
          )}
        </div>

        {/* ASSUNTO */}
        <div className="mb-6 flex gap-2 items-center border-b pb-1">
          <span className="font-bold uppercase">ASSUNTO:</span>
          <Input value={title} onChange={e => { setTitle(e.target.value); setIsDirty(true); }} className="font-bold uppercase border-none px-0 h-auto focus-visible:ring-0" placeholder="DIGITE O ASSUNTO..." />
        </div>

        {/* EDITOR */}
        <div className="flex-1 mb-8">
          <RichTextEditor content={editorContent} onChange={c => { setEditorContent(c); setIsDirty(true); }} disabled={isCreating || isSending || saveStatus === 'SAVING'} />
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
        {!isMessageMode && (
          <div className="mt-auto pt-8 flex flex-col items-center justify-center text-center">
            <div className="w-64 border-t border-black mb-2"></div>
            <p className="font-bold uppercase">ADMIN USER</p>
            <p className="text-sm">Cargo Administrativo</p>
            <p className="text-xs text-slate-400 mt-2">Assinado Digitalmente via SIMP</p>
          </div>
        )}
      </div>
    </div>
  );
}