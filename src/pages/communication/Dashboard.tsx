import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FileText,
  Plus,
  Send,
  Inbox,
  ArrowRight,
  Clock,
  CheckCircle2,
  Eye,
  Trash2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useDrafts, useReceivedDocuments, useSentDocuments, useDeleteDocument } from "@/hooks/useCommunication";
import type { CommunicationDocument, Recipient } from "@/lib/services/communication";

export default function CommunicationDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("inbox");

  const { data: drafts, isLoading: isDraftsLoading } = useDrafts();
  const { data: received, isLoading: isReceivedLoading } = useReceivedDocuments();
  const { data: sent, isLoading: isSentLoading } = useSentDocuments();
  const { mutate: deleteDocument } = useDeleteDocument();

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleNavigate = (doc: CommunicationDocument) => {
    if (doc.status === 'DRAFT') {
      navigate(`/communication/create?id=${doc.id}`);
    } else {
      navigate(`/communication/document/${doc.id}`);
    }
  };

  const handleDeleteDraft = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Tem certeza que deseja excluir este rascunho permanentemente?")) {
      deleteDocument(id);
    }
  };

  // Renderiza visualmente o status de cada destinatário na lista de Enviados
  const renderRecipientStatus = (doc: CommunicationDocument) => {
    if (!doc.recipients || doc.recipients.length === 0) {
      return <Badge variant="outline" className="text-slate-500">Sem Destinatário</Badge>;
    }

    // Se todos assinaram, mostra um badge único verde
    const allSigned = doc.recipients.every((r) => r.signedAt);
    if (allSigned && doc.recipients.length > 0) {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Todos Assinaram</Badge>;
    }

    // Caso contrário, mostra bolinhas individuais para cada pessoa
    return (
      <div className="flex -space-x-2 overflow-hidden py-1">
        {doc.recipients.map((recipient: Recipient, idx: number) => {
          let statusColor = "bg-slate-300 border-slate-100"; // Pendente
          let statusText = "Pendente";
          let Icon = Clock;

          if (recipient.signedAt) {
            statusColor = "bg-green-500 border-green-200";
            statusText = "Assinado em " + formatDate(recipient.signedAt);
            Icon = CheckCircle2;
          }
          else if (recipient.readAt) {
            statusColor = "bg-blue-400 border-blue-200";
            statusText = "Lido em " + formatDate(recipient.readAt);
            Icon = Eye;
          }

          // Tenta pegar as iniciais ou usa "?"
          const initials = (recipient.user?.firstName?.[0] || "") + (recipient.user?.lastName?.[0] || "");
          const displayName = recipient.user?.firstName ? `${recipient.user.firstName} ${recipient.user.lastName}` : "Usuário";

          return (
            <TooltipProvider key={idx}>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center text-[10px] text-white font-bold ${statusColor} cursor-help transition-transform hover:z-10 hover:scale-110 shadow-sm`}>
                    {initials || <Icon className="w-4 h-4" />}
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 text-white border-slate-800">
                  <p className="font-semibold">{displayName}</p>
                  <p className="text-xs opacity-90">{statusText}</p>
                  <p className="text-[10px] uppercase tracking-wider mt-1 opacity-70">{recipient.role === 'TO' ? 'Destinatário' : 'Cópia'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Comunicação Oficial</h1>
          <p className="text-slate-500 mt-1">Gerencie ofícios, memorandos e documentos assinados digitalmente.</p>
        </div>
        <Link to="/communication/create">
          <Button className="gap-2 shadow-lg bg-blue-600 hover:bg-blue-700 transition-all hover:scale-105">
            <Plus className="h-4 w-4" /> Nova Documentação
          </Button>
        </Link>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card onClick={() => setActiveTab("inbox")} className={`cursor-pointer transition-all hover:shadow-md border-t-4 ${activeTab === 'inbox' ? 'border-t-blue-500 bg-blue-50/30' : 'border-t-transparent'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Caixa de Entrada</CardTitle>
            <Inbox className={`h-4 w-4 ${activeTab === 'inbox' ? 'text-blue-600' : 'text-slate-400'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{received?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Documentos recebidos</p>
          </CardContent>
        </Card>

        <Card onClick={() => setActiveTab("sent")} className={`cursor-pointer transition-all hover:shadow-md border-t-4 ${activeTab === 'sent' ? 'border-t-purple-500 bg-purple-50/30' : 'border-t-transparent'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Enviados</CardTitle>
            <Send className={`h-4 w-4 ${activeTab === 'sent' ? 'text-purple-600' : 'text-slate-400'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{sent?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Protocolados e enviados</p>
          </CardContent>
        </Card>

        <Card onClick={() => setActiveTab("drafts")} className={`cursor-pointer transition-all hover:shadow-md border-t-4 ${activeTab === 'drafts' ? 'border-t-slate-500 bg-slate-50/30' : 'border-t-transparent'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Rascunhos</CardTitle>
            <FileText className={`h-4 w-4 ${activeTab === 'drafts' ? 'text-slate-600' : 'text-slate-400'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{drafts?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Em edição</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto gap-6">
          <TabsTrigger value="inbox" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 data-[state=active]:bg-transparent pb-3 pt-2 px-0 font-medium">Recebidos</TabsTrigger>
          <TabsTrigger value="sent" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:text-purple-700 data-[state=active]:bg-transparent pb-3 pt-2 px-0 font-medium">Enviados (Protocolados)</TabsTrigger>
          <TabsTrigger value="drafts" className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-600 data-[state=active]:text-slate-700 data-[state=active]:bg-transparent pb-3 pt-2 px-0 font-medium">Rascunhos</TabsTrigger>
        </TabsList>

        {/* --- INBOX (RECEBIDOS) --- */}
        <TabsContent value="inbox" className="mt-6 animate-in slide-in-from-bottom-2 duration-300">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-0">
              {isReceivedLoading ? <div className="p-6 space-y-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div> :
                received?.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                    <Inbox className="h-12 w-12 mb-3 opacity-20" />
                    <p>Sua caixa de entrada está vazia.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 hover:bg-slate-50">
                        <TableHead className="w-[40%]">Assunto / Documento</TableHead>
                        <TableHead>Remetente</TableHead>
                        <TableHead>Recebido Em</TableHead>
                        <TableHead>Sua Situação</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {received?.map((doc) => (
                        <TableRow key={doc.id} onClick={() => handleNavigate(doc)} className="cursor-pointer group hover:bg-slate-50 transition-colors">
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span className="text-slate-900 font-semibold group-hover:text-blue-700 transition-colors">{doc.title}</span>
                              <span className="text-xs text-slate-500 font-mono mt-0.5 flex items-center gap-2">
                                {doc.documentType} • {doc.documentNumber || "S/N"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                {doc.creator?.firstName?.[0] || "?"}
                              </div>
                              <span className="text-sm text-slate-700">{doc.creator?.firstName} {doc.creator?.lastName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-600 text-sm">{formatDate(doc.sentAt)}</TableCell>
                          <TableCell>
                            {doc.userStatus === 'SIGNED' ? (
                              <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100"><CheckCircle2 className="w-3 h-3 mr-1" /> Assinado</Badge>
                            ) : doc.userStatus === 'READ' ? (
                              <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100"><Eye className="w-3 h-3 mr-1" /> Lido</Badge>
                            ) : (
                              <Badge variant="outline" className="text-yellow-700 border-yellow-300 bg-yellow-50 hover:bg-yellow-50">Pendente</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="text-slate-300 group-hover:text-blue-500">
                              <ArrowRight className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- SENT (ENVIADOS) --- */}
        <TabsContent value="sent" className="mt-6 animate-in slide-in-from-bottom-2 duration-300">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-0">
              {isSentLoading ? <div className="p-6 space-y-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div> :
                sent?.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                    <Send className="h-12 w-12 mb-3 opacity-20" />
                    <p>Nenhum documento protocolado.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 hover:bg-slate-50">
                        <TableHead className="w-[40%]">Assunto</TableHead>
                        <TableHead>Protocolo</TableHead>
                        <TableHead>Data Envio</TableHead>
                        <TableHead>Status dos Destinatários</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sent?.map((doc) => (
                        <TableRow key={doc.id} onClick={() => handleNavigate(doc)} className="cursor-pointer group hover:bg-slate-50 transition-colors">
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span className="text-slate-900 group-hover:text-purple-700 transition-colors">{doc.title}</span>
                              <span className="text-xs text-slate-400">{doc.documentType}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">
                              {doc.protocolNumber || "Processando..."}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">{formatDate(doc.sentAt)}</TableCell>
                          <TableCell>
                            {renderRecipientStatus(doc)}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="text-slate-300 group-hover:text-purple-500">
                              <ArrowRight className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- DRAFTS (RASCUNHOS) --- */}
        <TabsContent value="drafts" className="mt-6 animate-in slide-in-from-bottom-2 duration-300">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-0">
              {isDraftsLoading ? <div className="p-6 space-y-3"><Skeleton className="h-12 w-full" /></div> :
                drafts?.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                    <FileText className="h-12 w-12 mb-3 opacity-20" />
                    <p>Nenhum rascunho pendente.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 hover:bg-slate-50">
                        <TableHead>Assunto (Rascunho)</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Última Modificação</TableHead>
                        <TableHead className="w-[100px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {drafts?.map((doc) => (
                        <TableRow key={doc.id} onClick={() => handleNavigate(doc)} className="cursor-pointer group hover:bg-slate-50">
                          <TableCell className="font-medium text-slate-700 group-hover:text-slate-900">
                            {doc.title || "(Sem Título)"}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">{doc.documentType}</TableCell>
                          <TableCell className="text-sm text-slate-500">{formatDate(doc.updatedAt)}</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" className="h-8 border-slate-200 hover:border-slate-300 hover:bg-white text-slate-600">
                                Editar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => handleDeleteDraft(e, doc.id)}
                                title="Excluir Rascunho"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}