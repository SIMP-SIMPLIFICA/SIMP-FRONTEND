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
  Trash2,
  Mail
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { useAuth } from "@/hooks/useAuth";
import type { CommunicationDocument, Recipient } from "@/lib/services/communication";

export default function CommunicationDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("inbox");

  // Filter States
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");

  const filters = {
    type: filterType !== 'ALL' ? filterType : undefined,
    startDate: filterStartDate || undefined,
    endDate: filterEndDate || undefined
  };

  const { data: drafts, isLoading: isDraftsLoading } = useDrafts(filters);
  const { data: received, isLoading: isReceivedLoading } = useReceivedDocuments(filters);
  const { data: sent, isLoading: isSentLoading } = useSentDocuments(filters);
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
      navigate(`/communication/create?id=${doc.id}${doc.documentType === 'MENSAGEM' ? '&mode=message' : ''}`);
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
    const validRecipients = doc.recipients?.filter(r => r.userId !== doc.createdBy) || [];

    if (validRecipients.length === 0) {
      return <Badge variant="secondary" className="text-slate-500">Sem Destinatário</Badge>;
    }

    // Se todos assinaram, mostra um badge único verde
    const allSigned = validRecipients.every((r) => r.signedAt);
    if (allSigned && validRecipients.length > 0) {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Todos Assinaram</Badge>;
    }

    // Caso contrário, mostra bolinhas individuais para cada pessoa
    return (
      <div className="flex -space-x-2 overflow-hidden py-1">
        {validRecipients.map((recipient: Recipient, idx: number) => {
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
                  <div className={`h-8 w-8 rounded-full border-2 ring-2 ring-white flex items-center justify-center text-[10px] text-white font-bold ${statusColor} cursor-help transition-transform hover:z-10 hover:scale-110 shadow-sm`}>
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
    <div className="p-8 space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto bg-slate-50/50 min-h-screen">
      {/* Cabeçalho / Hero Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Olá, {user?.firstName || 'Usuário'}.</h1>
          <p className="text-slate-600 mt-1 text-sm max-w-lg">Aqui está o resumo das suas comunicações oficiais e mensagens internas.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/communication/create?mode=message">
            <Button variant="secondary" className="gap-2 text-slate-700 hover:text-blue-800 hover:bg-slate-50 rounded-sm rounded-md h-10 border-slate-300">
              <Mail className="h-4 w-4" />
              Mensagem Interna
            </Button>
          </Link>
          <Link to="/communication/create">
            <Button className="gap-2 bg-blue-800 hover:bg-blue-900 text-white rounded-md h-10">
              <Plus className="h-4 w-4" />
              Documento Oficial
            </Button>
          </Link>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card onClick={() => setActiveTab("inbox")} className={`cursor-pointer rounded-sm border bg-white transition-none ${activeTab === 'inbox' ? 'border-blue-800 shadow-sm' : 'border-slate-200 shadow-sm'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-slate-800 uppercase">Caixa de Entrada</CardTitle>
            <Inbox className={`h-5 w-5 ${activeTab === 'inbox' ? 'text-blue-800' : 'text-slate-500'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{received?.length || 0}</div>
            <p className="text-xs text-slate-500 mt-1">Documentos recebidos</p>
          </CardContent>
        </Card>

        <Card onClick={() => setActiveTab("sent")} className={`cursor-pointer rounded-sm border bg-white transition-none ${activeTab === 'sent' ? 'border-blue-800 shadow-sm' : 'border-slate-200 shadow-sm'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-slate-800 uppercase">Enviados</CardTitle>
            <Send className={`h-5 w-5 ${activeTab === 'sent' ? 'text-blue-800' : 'text-slate-500'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{sent?.length || 0}</div>
            <p className="text-xs text-slate-500 mt-1">Protocolados e enviados</p>
          </CardContent>
        </Card>

        <Card onClick={() => setActiveTab("drafts")} className={`cursor-pointer rounded-sm border bg-white transition-none ${activeTab === 'drafts' ? 'border-blue-800 shadow-sm' : 'border-slate-200 shadow-sm'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-slate-800 uppercase">Rascunhos</CardTitle>
            <FileText className={`h-5 w-5 ${activeTab === 'drafts' ? 'text-blue-800' : 'text-slate-500'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{drafts?.length || 0}</div>
            <p className="text-xs text-slate-500 mt-1">Em edição</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-sm p-4 mb-8 flex flex-col md:flex-row gap-4 items-end w-full">
        <div className="space-y-1.5 flex-1 w-full">
          <label className="text-xs font-bold text-slate-700 uppercase">Tipo</label>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="bg-white border-slate-300 rounded-sm h-10">
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os Registros</SelectItem>
              <SelectItem value="MENSAGEM"><div className="flex items-center"><Mail className="w-4 h-4 mr-2" /> Apenas Mensagens</div></SelectItem>
              <SelectItem value="DOCUMENTO"><div className="flex items-center"><FileText className="w-4 h-4 mr-2" /> Apenas Documentos Formais</div></SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 flex-1 w-full">
          <label className="text-xs font-bold text-slate-700 uppercase">Data Inicial</label>
          <Input
            type="date"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
            className="bg-white border-slate-300 rounded-sm h-10"
          />
        </div>
        <div className="space-y-1.5 flex-1 w-full">
          <label className="text-xs font-bold text-slate-700 uppercase">Data Final</label>
          <Input
            type="date"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
            className="bg-white border-slate-300 rounded-sm h-10"
          />
        </div>
        <Button
          variant="secondary"
          className="bg-white hover:bg-slate-100 text-slate-700 border-slate-300 rounded-sm h-10 px-6 font-medium"
          onClick={() => {
            setFilterType("ALL");
            setFilterStartDate("");
            setFilterEndDate("");
          }}
        >
          Limpar Filtros
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start border-b border-slate-200 bg-transparent p-0 h-auto gap-8 mb-6">
          <TabsTrigger value="inbox" className="rounded-none border-b-4 border-transparent data-[state=active]:border-blue-800 data-[state=active]:text-blue-900 data-[state=active]:font-bold py-3 px-1 text-slate-600">Recebidos</TabsTrigger>
          <TabsTrigger value="sent" className="rounded-none border-b-4 border-transparent data-[state=active]:border-blue-800 data-[state=active]:text-blue-900 data-[state=active]:font-bold py-3 px-1 text-slate-600">Enviados (Protocolados)</TabsTrigger>
          <TabsTrigger value="drafts" className="rounded-none border-b-4 border-transparent data-[state=active]:border-blue-800 data-[state=active]:text-blue-900 data-[state=active]:font-bold py-3 px-1 text-slate-600">Rascunhos</TabsTrigger>
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
                          <TableCell className="font-medium py-4">
                            <div className="flex flex-col">
                              <span className="text-slate-900 font-semibold group-hover:text-blue-700 transition-colors">{doc.title}</span>
                              <div className="flex items-center gap-2 mt-1">
                                {doc.documentType === 'MENSAGEM' ? (
                                  <Badge variant="secondary" className="bg-white text-slate-800 border-slate-300 font-semibold px-2 rounded-sm text-xs"><Mail className="w-3 h-3 mr-1" /> Mensagem</Badge>
                                ) : (
                                  <Badge variant="primary" className="bg-blue-800 text-white hover:bg-blue-900 border-none font-semibold px-2 rounded-sm text-xs"><FileText className="w-3 h-3 mr-1" /> Documentação Formal</Badge>
                                )}
                                <span className="text-xs text-slate-500 font-mono">
                                  {doc.documentType !== 'MENSAGEM' ? `${doc.documentType} • ` : ''}{doc.documentNumber || "S/N"}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 border-2 border-white shadow-sm ring-1 ring-slate-100">
                                {doc.creator?.firstName?.[0] || "?"}
                              </div>
                              <span className="text-sm font-medium text-slate-700">{doc.creator?.firstName} {doc.creator?.lastName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-600 text-sm font-medium py-4">{formatDate(doc.sentAt)}</TableCell>
                          <TableCell className="py-4">
                            {doc.userStatus === 'SIGNED' ? (
                              <Badge className="bg-green-100 text-green-800 border-green-200 rounded-sm px-2"><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Assinado</Badge>
                            ) : doc.userStatus === 'READ' ? (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-200 rounded-sm px-2"><Eye className="w-3.5 h-3.5 mr-1" /> Lido</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-yellow-800 border-yellow-400 bg-yellow-50 rounded-sm px-2">Pendente</Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-4">
                            <Button variant="ghost" size="sm" className="text-slate-300 group-hover:text-blue-500">
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
                          <TableCell className="font-medium py-4">
                            <div className="flex flex-col">
                              <span className="text-slate-900 font-semibold group-hover:text-purple-700 transition-colors">{doc.title}</span>
                              <div className="flex items-center gap-2 mt-1">
                                {doc.documentType === 'MENSAGEM' ? (
                                  <Badge variant="secondary" className="bg-white text-slate-800 border-slate-300 font-semibold px-2 rounded-sm text-xs"><Mail className="w-3 h-3 mr-1" /> Mensagem</Badge>
                                ) : (
                                  <Badge variant="primary" className="bg-blue-800 text-white hover:bg-blue-900 border-none font-semibold px-2 rounded-sm text-xs"><FileText className="w-3 h-3 mr-1" /> Documentação Formal</Badge>
                                )}
                                {doc.documentType !== 'MENSAGEM' && <span className="text-xs text-slate-400">{doc.documentType}</span>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <span className="text-xs font-mono bg-slate-100 px-2 py-1.5 rounded-md text-slate-600">
                              {doc.protocolNumber || "Processando..."}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm font-medium text-slate-600 py-4">{formatDate(doc.sentAt)}</TableCell>
                          <TableCell className="py-4">
                            {renderRecipientStatus(doc)}
                          </TableCell>
                          <TableCell className="py-4">
                            <Button variant="ghost" size="sm" className="text-slate-300 group-hover:text-purple-500">
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
                          <TableCell className="font-medium text-slate-700 group-hover:text-slate-900 py-4">
                            {doc.title || "(Sem Título)"}
                            <div className="flex items-center gap-2 mt-1.5">
                              {doc.documentType === 'MENSAGEM' ? (
                                <Badge variant="secondary" className="bg-white text-slate-800 border-slate-300 font-semibold px-2 rounded-sm text-[10px] h-5 py-0 flex items-center"><Mail className="w-3 h-3 mr-1" /> Mensagem</Badge>
                              ) : (
                                <Badge variant="primary" className="bg-blue-800 text-white hover:bg-blue-900 border-none font-semibold px-2 rounded-sm text-[10px] h-5 py-0 flex items-center"><FileText className="w-3 h-3 mr-1" /> Documentação Formal</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-500 font-medium py-4">{doc.documentType === 'MENSAGEM' ? '-' : doc.documentType}</TableCell>
                          <TableCell className="text-sm text-slate-500 font-medium py-4">{formatDate(doc.updatedAt)}</TableCell>
                          <TableCell className="py-4">
                            <div className="flex justify-end gap-2">
                              <Button variant="secondary" size="sm" className="h-8 border-slate-200 hover:border-slate-300 hover:bg-white text-slate-600">
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