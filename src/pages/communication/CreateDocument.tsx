import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Send, Printer, Settings } from "lucide-react";
import { useReactToPrint } from "react-to-print";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { useCreateDocument, useSendDocument } from "@/hooks/useCommunication";
import { useMe } from "@/hooks/useMe";
import { useRecipients } from "@/hooks/useRecipients";
import { Separator } from "@/components/ui/separator";
import { hasPermission } from "@/lib/permissions";

// --- COMPONENTE DE IMPRESSÃO (O SEGREDO DO PDF) ---
const PrintableDocument = ({ data, user, content, recipientsList, settings }: any) => {
  const { fontFamily, header } = settings;

  return (
    <div className="hidden print:block p-12 max-w-[210mm] mx-auto text-black bg-white" style={{ fontFamily }}>
      {/* Cabeçalho / Logo */}
      <div className="text-center mb-8">
        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Brasao_Pequizeiro_Tocantins.png/120px-Brasao_Pequizeiro_Tocantins.png" alt="Brasão" className="h-24 mx-auto mb-3" />
        <h2 className="font-bold text-xl uppercase mb-1">{header.municipality}</h2>
        <h3 className="font-bold text-lg mb-1">{header.department}</h3>
        <p className="text-sm mt-1">E-mail: {header.email}</p>
        <p className="text-sm">{header.address}</p>
      </div>

      {/* Título Oficial */}
      <div className="text-center mb-12 mt-8">
        <h1 className="font-bold text-2xl uppercase border-b-2 border-black inline-block pb-1 px-4">
          {data.documentNumber || `${data.type} (SEM NÚMERO)`}
        </h1>
      </div>

      {/* Data e Local */}
      <div className="text-right mb-10 italic text-lg">
        Pequizeiro - TO, {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.
      </div>

      {/* Cabeçalho do Ofício */}
      <div className="space-y-6 mb-10 text-justify text-lg leading-relaxed">
        <div className="flex">
          <span className="font-bold w-28">PARA:</span>
          <span className="uppercase flex-1">
            {recipientsList?.length > 0
              ? recipientsList.map((u: any) => u.name).join(", ")
              : "A QUEM POSSA INTERESSAR"}
          </span>
        </div>
        <div className="flex">
          <span className="font-bold w-28">DE:</span>
          <span className="uppercase flex-1">
            {user?.firstName} {user?.lastName} - {user?.email}
          </span>
        </div>
        <div className="flex">
          <span className="font-bold w-28">ASSUNTO:</span>
          <span className="uppercase flex-1 font-bold">{data.title}</span>
        </div>
      </div>

      {/* Conteúdo Rico */}
      <div
        className="text-justify leading-relaxed mb-12 min-h-[300px] text-lg"
        dangerouslySetInnerHTML={{ __html: content }}
      />

      {/* Assinatura */}
      <div className="mt-20 text-center">
        <div className="w-80 mx-auto border-t border-black pt-2">
          <p className="font-bold uppercase text-lg">{user?.firstName} {user?.lastName}</p>
          <p className="text-md">Assinado Digitalmente pelo SIMP</p>
        </div>
      </div>
    </div>
  );
};

// --- PÁGINA PRINCIPAL ---

interface UserWithProfile {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}

export default function CreateDocument() {
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  // Hooks
  const { mutateAsync: createDocument, isPending: isCreating } = useCreateDocument();
  const { mutateAsync: sendDocument, isPending: isSending } = useSendDocument();
  const { data: rawUser } = useMe();

  // Search state for recipients
  const [recipientSearch, setRecipientSearch] = useState("");
  const { data: recipientsList } = useRecipients(recipientSearch);

  const user = rawUser as unknown as UserWithProfile | undefined;

  // Permissions
  // const canCreate = hasPermission(rawUser, "documents:create");
  // const canSend = hasPermission(rawUser, "documents:send");

  // States
  const [title, setTitle] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [type, setType] = useState("MEMORANDO");
  const [priority, setPriority] = useState("MEDIUM");
  const [content, setContent] = useState("<p>...</p>");
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>("");

  // Settings States
  const [fontFamily, setFontFamily] = useState('"Times New Roman", Times, serif');
  const [headerMunicipality, setHeaderMunicipality] = useState("Prefeitura Municipal de Pequizeiro");
  const [headerDepartment, setHeaderDepartment] = useState("Gabinete do Prefeito");
  const [headerEmail, setHeaderEmail] = useState("prefeiturapequizeiroto@gmail.com");
  const [headerAddress, setHeaderAddress] = useState("Avenida Salgado Filho, s/n, Centro, Pequizeiro/TO, CEP 77730-000");
  const [showSettings, setShowSettings] = useState(false);

  const isLoading = isCreating || isSending;

  // Função de Impressão
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: documentNumber || "Documento",
  });

  const handleSave = async (isDraft: boolean) => {
    try {
      const recipients = selectedRecipientId
        ? [{ userId: selectedRecipientId, role: "TO" as const }]
        : [];

      // Aqui você juntaria as configs de header/font no payload se o backend suportar,
      // ou apenas usa para geração do documento
      const newDoc = await createDocument({
        title,
        content,
        documentType: type,
        priority: priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
        recipients,
        // @ts-ignore
        documentNumber: documentNumber,
        // Enviar flag de email removida pois agora é automático
      });

      if (!isDraft && newDoc?.id) {
        await sendDocument(newDoc.id);
      }
      navigate("/communication");
    } catch (error) {
      console.error(error);
    }
  };

  const selectedRecipientUser = recipientsList?.find((u: any) => u.id === selectedRecipientId);
  const recipientsForPrint = selectedRecipientUser
    ? [{ name: selectedRecipientUser.name || selectedRecipientUser.username || selectedRecipientUser.email }]
    : [];

  const printSettings = {
    fontFamily,
    header: {
      municipality: headerMunicipality,
      department: headerDepartment,
      email: headerEmail,
      address: headerAddress
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">

      {/* --- COMPONENTE OCULTO DE IMPRESSÃO --- */}
      <div className="hidden">
        <div ref={printRef}>
          <PrintableDocument
            data={{ title, documentNumber, type }}
            user={user}
            content={content}
            recipientsList={recipientsForPrint}
            settings={printSettings}
          />
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/communication")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Nova Documentação</h1>
            <p className="text-sm text-muted-foreground">Preencha os dados oficiais.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setShowSettings(!showSettings)}>
            <Settings className="mr-2 h-4 w-4" />
            Configurações
          </Button>
          <Button variant="secondary" onClick={() => handlePrint()}>
            <Printer className="mr-2 h-4 w-4" />
            Visualizar / Imprimir
          </Button>

          <Button variant="outline" onClick={() => handleSave(true)} disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            Salvar como Rascunho
          </Button>

          <Button onClick={() => handleSave(false)} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
            <Send className="mr-2 h-4 w-4" />
            Salvar e Protocolar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">

          {/* Settings Area */}
          {showSettings && (
            <Card className="bg-slate-50 border-slate-200">
              <CardHeader><CardTitle className="text-base">Configurações do Documento</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fonte do Documento</Label>
                    <Select value={fontFamily} onValueChange={setFontFamily}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value='"Times New Roman", Times, serif'>Times New Roman</SelectItem>
                        <SelectItem value="Arial, Helvetica, sans-serif">Arial</SelectItem>
                        <SelectItem value='"Bookman Old Style", Georgia, serif'>Bookman Old Style</SelectItem>
                        <SelectItem value="Georgia, serif">Georgia</SelectItem>
                        <SelectItem value="Verdana, sans-serif">Verdana</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Órgão / Prefeitura</Label>
                    <Input value={headerMunicipality} onChange={e => setHeaderMunicipality(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Departamento</Label>
                    <Input value={headerDepartment} onChange={e => setHeaderDepartment(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email do Cabeçalho</Label>
                    <Input value={headerEmail} onChange={e => setHeaderEmail(e.target.value)} />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Endereço Completo</Label>
                    <Input value={headerAddress} onChange={e => setHeaderAddress(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-6 space-y-4">
              {/* Linha 1 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEMORANDO">Memorando</SelectItem>
                      <SelectItem value="OFICIO">Ofício</SelectItem>
                      <SelectItem value="DECRETO">Decreto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="docNumber">Número Oficial</Label>
                  <Input
                    id="docNumber"
                    placeholder="Ex: MEMORANDO Nº 01/2026"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                  />
                </div>
              </div>

              {/* Linha 2 */}
              <div className="space-y-2">
                <Label htmlFor="title">Assunto (Ementa)</Label>
                <Input
                  id="title"
                  placeholder="Ex: PRESTAÇÃO DE CONTAS DO CONVÊNIO..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* Editor */}
              <div className="space-y-2">
                <Label>Conteúdo</Label>
                <RichTextEditor content={content} onChange={setContent} />
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold">Destinatário (PARA)</h3>

              <div className="space-y-2">
                <Label>Selecionar Usuário</Label>
                {/* Campo de Busca Opcional */}
                <Input
                  placeholder="Buscar destinatário..."
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                  className="mb-2"
                />
                <Select value={selectedRecipientId} onValueChange={setSelectedRecipientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {recipientsList?.length === 0 ? (
                      <SelectItem value="empty" disabled>Nenhum destinatário encontrado</SelectItem>
                    ) : (
                      recipientsList?.map((u: any) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name || u.username || u.email}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground p-1">Mostrando apenas usuários com permissão de Comunicação.</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Baixa</SelectItem>
                    <SelectItem value="MEDIUM">Normal</SelectItem>
                    <SelectItem value="HIGH">Alta</SelectItem>
                    <SelectItem value="URGENT">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}