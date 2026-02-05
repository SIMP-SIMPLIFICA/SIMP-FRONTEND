import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FileText,
  Plus,
  Send,
  Clock,
  FileSignature,
  AlertCircle,
  Inbox
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

import { useDrafts, useReceivedDocuments, useSentDocuments } from "@/hooks/useCommunication";

export default function CommunicationDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("inbox");

  const { data: drafts, isLoading: isDraftsLoading } = useDrafts();
  const { data: received, isLoading: isReceivedLoading } = useReceivedDocuments();
  const { data: sent, isLoading: isSentLoading } = useSentDocuments();

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT': return <Badge variant="outline">Rascunho</Badge>;
      case 'SENT': return <Badge className="bg-blue-500">Enviado</Badge>;
      case 'READ': return <Badge className="bg-green-500">Lido</Badge>;
      case 'SIGNED': return <Badge className="bg-purple-500">Assinado</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleRowClick = (id: string) => {
    navigate(`/communication/document/${id}`);
  };

  return (
    <div className="p-8 space-y-8">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Comunicação</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seus ofícios, memorandos e protocolos.
          </p>
        </div>
        <Link to="/communication/create">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Documentação
          </Button>
        </Link>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card onClick={() => setActiveTab("inbox")} className="cursor-pointer hover:bg-slate-50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recebidos</CardTitle>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{received?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Documentos na caixa de entrada</p>
          </CardContent>
        </Card>

        <Card onClick={() => setActiveTab("sent")} className="cursor-pointer hover:bg-slate-50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enviados</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sent?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Documentos enviados</p>
          </CardContent>
        </Card>

        <Card onClick={() => setActiveTab("drafts")} className="cursor-pointer hover:bg-slate-50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rascunhos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{drafts?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Em edição</p>
          </CardContent>
        </Card>
      </div>

      {/* Abas e Tabelas */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="inbox" className="min-w-[150px]">Recebidos</TabsTrigger>
          <TabsTrigger value="sent" className="min-w-[150px]">Enviados</TabsTrigger>
          <TabsTrigger value="drafts" className="min-w-[150px]">Rascunhos</TabsTrigger>
        </TabsList>

        {/* INBOX */}
        <TabsContent value="inbox" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Caixa de Entrada</CardTitle>
            </CardHeader>
            <CardContent>
              {isReceivedLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : received?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">Nenhum documento recebido.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título / Assunto</TableHead>
                      <TableHead>Remetente</TableHead>
                      <TableHead>Recebido Em</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {received?.map((doc) => (
                      <TableRow key={doc.id} onClick={() => handleRowClick(doc.id)} className="cursor-pointer">
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{doc.title}</span>
                            <span className="text-xs text-muted-foreground">{doc.documentNumber}</span>
                          </div>
                        </TableCell>
                        <TableCell>{doc.createdBy}</TableCell>
                        <TableCell>{formatDate(doc.sentAt || doc.updatedAt)}</TableCell>
                        <TableCell>{getStatusBadge(doc.status)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">Visualizar</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SENT */}
        <TabsContent value="sent" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Documentos Enviados</CardTitle>
            </CardHeader>
            <CardContent>
              {isSentLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : sent?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">Nenhum documento enviado.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título / Assunto</TableHead>
                      <TableHead>Enviado Em</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sent?.map((doc) => (
                      <TableRow key={doc.id} onClick={() => handleRowClick(doc.id)} className="cursor-pointer">
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{doc.title}</span>
                            <span className="text-xs text-muted-foreground">{doc.documentNumber}</span>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(doc.sentAt)}</TableCell>
                        <TableCell>{getStatusBadge(doc.status)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">Visualizar</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DRAFTS */}
        <TabsContent value="drafts" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Rascunhos</CardTitle>
            </CardHeader>
            <CardContent>
              {isDraftsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : drafts?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">Nenhum rascunho encontrado.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título / Assunto</TableHead>
                      <TableHead>Criado Em</TableHead>
                      <TableHead>Atualizado Em</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drafts?.map((doc) => (
                      <TableRow key={doc.id} onClick={() => navigate(`/communication/create?id=${doc.id}`)} className="cursor-pointer">
                        <TableCell className="font-medium">{doc.title}</TableCell>
                        <TableCell>{formatDate(doc.createdAt)}</TableCell>
                        <TableCell>{formatDate(doc.updatedAt)}</TableCell>
                        <TableCell>
                          <Button variant="secondary" size="sm">Editar</Button>
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