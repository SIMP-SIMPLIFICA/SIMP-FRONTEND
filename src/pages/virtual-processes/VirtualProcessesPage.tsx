import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FolderArchive, Plus, Search, UploadCloud, Download, CheckCircle, Clock, FolderOpen, File, RefreshCw, Trash2 } from "lucide-react";

import { virtualProcessApi, type VirtualProcess, type VirtualProcessDocument, type AuditLog } from "@/lib/api/virtual-processes";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function VirtualProcessesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [secretaria, setSecretaria] = useState("ALL");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);

  const [newProcess, setNewProcess] = useState({
    processNumber: "",
    secretaria: "",
    source: "",
    bankAccount: "",
    agency: "",
    bankName: "",
    sourceDetail: "",
    subject: "",
    category: ""
  });

  const { data: queryData, isLoading } = useQuery({
    queryKey: ["virtual-processes", search, secretaria],
    queryFn: () => virtualProcessApi.list({
      search: search || undefined,
      secretaria: secretaria !== "ALL" ? secretaria : undefined
    })
  });

  const processes = Array.isArray(queryData) ? queryData : [];

  const { data: details, isLoading: isLoadingDetails } = useQuery({
    queryKey: ["virtual-process", selectedProcessId],
    queryFn: () => virtualProcessApi.getDetails(selectedProcessId!),
    enabled: !!selectedProcessId
  });

  const createMutation = useMutation({
    mutationFn: virtualProcessApi.create,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["virtual-processes"] });
      toast({ title: "Processo autuado com sucesso" });
      setIsCreateOpen(false);
      setNewProcess({
        processNumber: "",
        secretaria: "",
        source: "",
        bankAccount: "",
        agency: "",
        bankName: "",
        sourceDetail: "",
        subject: "",
        category: ""
      });

      if (data && data.process && data.process.id) {
        setSelectedProcessId(data.process.id);
      }
    },
    onError: () => toast({ title: "Erro ao criar processo", variant: "destructive" })
  });

  const toggleStatusMutation = useMutation({
    mutationFn: virtualProcessApi.toggleStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["virtual-process", selectedProcessId] });
      queryClient.invalidateQueries({ queryKey: ["virtual-processes"] });
      toast({ title: "Status alterado com sucesso" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: virtualProcessApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["virtual-processes"] });
      toast({ title: "Processo excluído com sucesso" });
      setSelectedProcessId(null);
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || "Erro ao excluir processo";
      toast({ title: msg, variant: "destructive" });
    }
  });

  const [uploadTag, setUploadTag] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: ({ id, file, tag }: { id: string, file: File, tag: string }) =>
      virtualProcessApi.uploadDocument(id, file, tag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["virtual-process", selectedProcessId] });
      queryClient.invalidateQueries({ queryKey: ["virtual-processes"] });
      toast({ title: "Documento anexado com sucesso" });
      setUploadTag("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: () => toast({ title: "Erro ao anexar documento", variant: "destructive" })
  });

  const handleCreateProcess = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const categoryFromForm = formData.get('category') as string;

    const payload = {
      ...newProcess,
      category: categoryFromForm || newProcess.category,
    };

    createMutation.mutate(payload);
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProcessId || !uploadTag || !fileInputRef.current?.files?.[0]) return;
    uploadMutation.mutate({
      id: selectedProcessId,
      file: fileInputRef.current.files[0],
      tag: uploadTag
    });
  };

  const handleDownload = async (docId: string) => {
    if (!selectedProcessId) return;
    try {
      const url = await virtualProcessApi.getDownloadUrl(selectedProcessId, docId);
      window.open(url, "_blank");
    } catch {
      toast({ title: "Erro ao baixar documento", variant: "destructive" });
    }
  };

  const getSourceColor = (source: string) => {
    const s = source.toLowerCase();
    if (s.includes("federal")) return "bg-blue-100 text-blue-800 hover:bg-blue-200";
    if (s.includes("estadual")) return "bg-orange-100 text-orange-800 hover:bg-orange-200";
    if (s.includes("proprio") || s.includes("próprio")) return "bg-green-100 text-green-800 hover:bg-green-200";
    return "bg-slate-100 text-slate-800 hover:bg-slate-200";
  };

  const getStatusColor = (status: string) => {
    if (status === "ENCERRADO") return "bg-slate-100 text-slate-600 hover:bg-slate-200";
    return "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none";
  };

  return (
    <div className="h-full w-full bg-slate-50 p-8 flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FolderArchive className="h-6 w-6 text-blue-600" />
            Acervo Digital de Processos
          </h1>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition">
          <Plus className="mr-2 h-4 w-4" />
          Novo Processo
        </Button>
      </header>

      <div className="flex gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por Nº do processo ou assunto..."
            className="pl-9 bg-slate-50/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-64">
          <Select value={secretaria} onValueChange={setSecretaria}>
            <SelectTrigger className="bg-slate-50/50">
              <SelectValue placeholder="Secretaria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as Secretarias</SelectItem>
              <SelectItem value="Administração">Administração</SelectItem>
              <SelectItem value="Saúde">Saúde</SelectItem>
              <SelectItem value="Educação">Educação</SelectItem>
              <SelectItem value="Assistência Social">Assistência Social</SelectItem>
              <SelectItem value="Obras e Infraestrutura">Obras e Infraestrutura</SelectItem>
              <SelectItem value="Finanças">Finanças</SelectItem>
              <SelectItem value="Meio Ambiente">Meio Ambiente</SelectItem>
              <SelectItem value="Agricultura">Agricultura</SelectItem>
              <SelectItem value="Controle Interno">Controle Interno</SelectItem>
              <SelectItem value="Licitação / Compras">Licitação / Compras</SelectItem>
              <SelectItem value="Gabinete do Prefeito">Gabinete do Prefeito</SelectItem>
              <SelectItem value="Outros">Outros</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col">
        <div className="flex-1 overflow-auto rounded-xl">
          <Table>
            <TableHeader className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm">
              <TableRow>
                <TableHead className="font-semibold text-slate-700">Número</TableHead>
                <TableHead className="font-semibold text-slate-700">Origem do Recurso</TableHead>
                <TableHead className="font-semibold text-slate-700">Secretaria</TableHead>
                <TableHead className="font-semibold text-slate-700">Categoria</TableHead>
                <TableHead className="font-semibold text-slate-700">Assunto</TableHead>
                <TableHead className="font-semibold text-slate-700">Anexos</TableHead>
                <TableHead className="font-semibold text-slate-700">Status</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-slate-400" />
                    Carregando processos...
                  </TableCell>
                </TableRow>
              ) : processes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                    <FolderArchive className="h-8 w-8 mx-auto mb-3 text-slate-300" />
                    Nenhum processo encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                processes.map((proc: VirtualProcess) => (
                  <TableRow key={proc.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-semibold text-slate-900 border-b border-slate-100">{proc.processNumber}</TableCell>
                    <TableCell className="border-b border-slate-100">
                      <Badge variant="secondary" className={getSourceColor(proc.source)}>
                        {proc.source}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600 border-b border-slate-100">{proc.secretaria}</TableCell>
                    <TableCell className="text-slate-600 border-b border-slate-100">
                      <Badge variant="outline" className="text-slate-600 font-medium">
                        {proc.category || "Outros"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate text-slate-600 border-b border-slate-100" title={proc.subject}>
                      {proc.subject}
                    </TableCell>
                    <TableCell className="border-b border-slate-100">
                      <span className="flex items-center gap-1.5 text-slate-600 font-medium bg-slate-100 px-2 py-1 rounded w-fit">
                        <File className="h-3.5 w-3.5 text-slate-400" />
                        {proc.documentCount ?? proc._count?.documents ?? proc.documents?.length ?? 0}
                      </span>
                    </TableCell>
                    <TableCell className="border-b border-slate-100">
                      <Badge variant="secondary" className={getStatusColor(proc.status)}>
                        {proc.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right border-b border-slate-100">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedProcessId(proc.id)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition">
                        <FolderOpen className="mr-2 h-4 w-4" />
                        Abrir Pasta
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-xl p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl">Autuar Novo Processo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateProcess} className="space-y-5">
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Número do Processo</label>
                <Input required placeholder="Ex: 001/2026" className="bg-slate-50" value={newProcess.processNumber} onChange={e => setNewProcess({ ...newProcess, processNumber: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Secretaria</label>
                <Select value={newProcess.secretaria} onValueChange={v => setNewProcess({ ...newProcess, secretaria: v })}>
                  <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Administração">Administração</SelectItem>
                    <SelectItem value="Saúde">Saúde</SelectItem>
                    <SelectItem value="Educação">Educação</SelectItem>
                    <SelectItem value="Assistência Social">Assistência Social</SelectItem>
                    <SelectItem value="Obras e Infraestrutura">Obras e Infraestrutura</SelectItem>
                    <SelectItem value="Finanças">Finanças</SelectItem>
                    <SelectItem value="Meio Ambiente">Meio Ambiente</SelectItem>
                    <SelectItem value="Agricultura">Agricultura</SelectItem>
                    <SelectItem value="Controle Interno">Controle Interno</SelectItem>
                    <SelectItem value="Licitação / Compras">Licitação / Compras</SelectItem>
                    <SelectItem value="Gabinete do Prefeito">Gabinete do Prefeito</SelectItem>
                    <SelectItem value="Outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Origem do Recurso</label>
                <Select value={newProcess.source} onValueChange={v => setNewProcess({ ...newProcess, source: v })}>
                  <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Recurso Próprio">Recurso Próprio</SelectItem>
                    <SelectItem value="Recurso Estadual">Recurso Estadual</SelectItem>
                    <SelectItem value="Recurso Federal">Recurso Federal</SelectItem>
                    <SelectItem value="Convênio">Convênio</SelectItem>
                    <SelectItem value="Emenda Parlamentar">Emenda Parlamentar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Detalhe da Origem <span className="text-slate-400 font-normal">(Opcional)</span></label>
                <Input className="bg-slate-50" placeholder="Ex: Portaria nº 123/2023" value={newProcess.sourceDetail} onChange={e => setNewProcess({ ...newProcess, sourceDetail: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Nome do Banco <span className="text-slate-400 font-normal">(Opcional)</span></label>
                <Select value={newProcess.bankName} onValueChange={v => setNewProcess({ ...newProcess, bankName: v })}>
                  <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Banco do Brasil">Banco do Brasil</SelectItem>
                    <SelectItem value="Caixa Econômica Federal">Caixa Econômica Federal</SelectItem>
                    <SelectItem value="Bradesco">Bradesco</SelectItem>
                    <SelectItem value="Itaú">Itaú</SelectItem>
                    <SelectItem value="Sicoob">Sicoob</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Agência <span className="text-slate-400 font-normal">(Opcional)</span></label>
                <Input className="bg-slate-50" placeholder="Ex: 1234-5" value={newProcess.agency} onChange={e => setNewProcess({ ...newProcess, agency: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Conta Bancária <span className="text-slate-400 font-normal">(Opcional)</span></label>
                <Input className="bg-slate-50" placeholder="Ex: 12345-6" value={newProcess.bankAccount} onChange={e => setNewProcess({ ...newProcess, bankAccount: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Categoria / Objeto</label>
              <input type="hidden" name="category" value={newProcess.category} />
              <Select value={newProcess.category} onValueChange={v => setNewProcess({ ...newProcess, category: v })}>
                <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Obras e Engenharia">Obras e Engenharia</SelectItem>
                  <SelectItem value="Consultoria e Assessoria">Consultoria e Assessoria</SelectItem>
                  <SelectItem value="Gêneros Alimentícios">Gêneros Alimentícios</SelectItem>
                  <SelectItem value="Sistemas e Software">Sistemas e Software</SelectItem>
                  <SelectItem value="Internet e Telecomunicações">Internet e Telecomunicações</SelectItem>
                  <SelectItem value="Energia e Utilidades">Energia e Utilidades</SelectItem>
                  <SelectItem value="Material Permanente / Equipamentos">Material Permanente / Equipamentos</SelectItem>
                  <SelectItem value="Material de Informática">Material de Informática</SelectItem>
                  <SelectItem value="Material de Consumo">Material de Consumo</SelectItem>
                  <SelectItem value="Serviços Gerais">Serviços Gerais</SelectItem>
                  <SelectItem value="Locação de Veículos / Máquinas">Locação de Veículos / Máquinas</SelectItem>
                  <SelectItem value="Eventos">Eventos</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Assunto</label>
              <Input required className="bg-slate-50" placeholder="Descreva brevemente o assunto" value={newProcess.subject} onChange={e => setNewProcess({ ...newProcess, subject: e.target.value })} />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={createMutation.isPending || !newProcess.secretaria || !newProcess.source || !newProcess.category}>
                {createMutation.isPending ? "Autuando..." : "Autuar Processo"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {selectedProcessId && isLoadingDetails && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <span className="text-white font-medium bg-slate-800 px-4 py-2 rounded-lg shadow-lg">Carregando detalhes do processo...</span>
        </div>
      )}

      <Sheet open={!!selectedProcessId && !isLoadingDetails && !!details?.process} onOpenChange={(o) => !o && setSelectedProcessId(null)}>
        <SheetContent className="w-full sm:max-w-4xl overflow-y-auto bg-slate-50 p-0 border-l border-slate-200 shadow-2xl">
          {details?.process && (
            <div className="flex flex-col min-h-full">
              <div className="bg-white border-b border-slate-200 p-8 pt-10 relative">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold tracking-wider text-slate-500 uppercase mb-1">Processo Digital</p>
                    <div className="flex items-center gap-4">
                      <SheetTitle className="text-3xl font-bold font-mono tracking-tight text-slate-900">
                        {details.process.processNumber}
                      </SheetTitle>

                      <Button
                        variant="destructive"
                        size="sm"
                        className="shadow-sm"
                        disabled={Date.now() - new Date(details.process.createdAt).getTime() > 86400000 || deleteMutation.isPending}
                        title={Date.now() - new Date(details.process.createdAt).getTime() > 86400000 ? "O prazo de 24 horas para exclusão expirou" : "Excluir Processo"}
                        onClick={() => {
                          if (confirm("Tem certeza que deseja excluir este processo?")) {
                            deleteMutation.mutate(details.process.id);
                          }
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-4">
                      <Badge variant="secondary" className={getStatusColor(details.process.status) + " px-3 py-1"}>
                        {details.process.status}
                      </Badge>
                      <Badge variant="outline" className="text-slate-600 px-3 py-1 border-slate-300">
                        {details.process.secretaria}
                      </Badge>
                      <Badge variant="outline" className={getSourceColor(details.process.source) + " px-3 py-1 border-transparent"}>
                        {details.process.source}
                      </Badge>
                      <Badge variant="outline" className="text-slate-500 font-medium px-3 py-1 border-slate-300">
                        {details.process.category || "Outros"}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="shadow-sm border-slate-300"
                    onClick={() => toggleStatusMutation.mutate(details.process.id)}
                    disabled={toggleStatusMutation.isPending}
                  >
                    {details.process.status === "ABERTO" ? (
                      <><CheckCircle className="mr-2 h-4 w-4 text-emerald-600" /> Encerrar</>
                    ) : (
                      <><RefreshCw className="mr-2 h-4 w-4 text-blue-600" /> Reabrir</>
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex-1 p-8 grid grid-cols-[1fr_380px] gap-8">
                <div className="flex flex-col gap-8">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                        <UploadCloud className="h-5 w-5 text-blue-600" />
                        Anexar Documento
                      </h3>
                    </div>
                    <form onSubmit={handleUpload} className="p-5 space-y-4">
                      <Select required value={uploadTag} onValueChange={setUploadTag}>
                        <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Selecione a categoria..." /></SelectTrigger>
                        <SelectContent>
                          {[
                            'Homologação', 'Adjudicação', 'Manifesto Ambiental',
                            'Empenho', 'Liquidação', 'Comprovantes', 'Rendimentos',
                            'Extrato', 'Contrato', 'Parecer Jurídico', 'Medições',
                            'Notas Fiscais', 'Outros'
                          ].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>

                      <div className="flex items-center gap-3">
                        <Input type="file" ref={fileInputRef} className="flex-1 cursor-pointer bg-slate-50" required />
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={!uploadTag || uploadMutation.isPending}>
                          {uploadMutation.isPending ? "Enviando..." : "Enviar"}
                        </Button>
                      </div>
                    </form>
                  </div>

                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2 px-1">
                      <FolderArchive className="h-5 w-5 text-slate-500" />
                      Acervo do Processo
                      <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800 border-none">
                        {details.process.documents?.length || 0} arquivos
                      </Badge>
                    </h3>
                    <div className="space-y-3">
                      {(details?.process?.documents || []).map((doc: VirtualProcessDocument) => (
                        <div key={doc.id} className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between group hover:border-blue-200 transition-colors">
                          <div className="flex-1 min-w-0 pr-4">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border border-indigo-100 font-medium">
                                {doc.tag}
                              </Badge>
                              <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(doc.uploadedAt).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-slate-800 truncate" title={doc.fileName}>
                              {doc.fileName}
                            </p>
                            <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                              Por: <span className="font-medium text-slate-700">{doc.uploader.firstName} {doc.uploader.lastName}</span>
                            </p>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleDownload(doc.id)} className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0">
                            <Download className="h-5 w-5" />
                          </Button>
                        </div>
                      ))}
                      {!(details?.process?.documents || []).length && (
                        <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl">
                          <File className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                          <p className="text-sm text-slate-500 font-medium">Pasta vazia.</p>
                          <p className="text-xs text-slate-400 mt-1">Anexe documentos acima.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Assunto Principal</h3>
                    <p className="text-slate-800 leading-relaxed text-sm font-medium">
                      {details.process.subject}
                    </p>

                    {(details.process.sourceDetail || details.process.bankAccount || details.process.agency || details.process.bankName) && (
                      <div className="mt-6 pt-5 border-t border-slate-100 space-y-4">
                        {details.process.sourceDetail && (
                          <div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Detalhes da Origem</h3>
                            <p className="text-slate-700 text-sm">{details.process.sourceDetail}</p>
                          </div>
                        )}
                        {(details.process.bankName || details.process.agency || details.process.bankAccount) && (
                          <div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Dados Bancários</h3>
                            <div className="text-slate-700 text-sm font-mono bg-slate-50 px-2 py-1 rounded inline-block border border-slate-100">
                              {details.process.bankName && <span className="mr-3">Banco: {details.process.bankName}</span>}
                              {details.process.agency && <span className="mr-3">Agência: {details.process.agency}</span>}
                              {details.process.bankAccount && <span>Conta: {details.process.bankAccount}</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      Trilha de Auditoria
                    </h3>
                    <div className="relative pl-[18px] border-l-2 border-slate-100 space-y-7 pb-2">
                      {(details?.auditLog || []).map((log: AuditLog) => (
                        <div key={log.id} className="relative">
                          <span className="absolute -left-[27px] top-1 h-4 w-4 rounded-full bg-blue-50 border-4 border-white shadow-sm ring-1 ring-slate-200 flex items-center justify-center">
                            <span className="h-1.5 w-1.5 bg-blue-400 rounded-full"></span>
                          </span>
                          <div className="text-[13px] leading-relaxed">
                            <span className="font-semibold text-slate-900">
                              {log.user.firstName} {log.user.lastName}
                            </span>
                            <span className="text-slate-600 mx-1.5">{log.action}</span>
                          </div>
                          <div className="text-[11px] font-medium text-slate-400 mt-1.5 flex flex-wrap items-center gap-2">
                            {new Date(log.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                            {log.metadata?.tag && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-slate-50 border-slate-200 text-slate-500">
                                {log.metadata.tag}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                      {!(details?.auditLog || []).length && (
                        <p className="text-sm text-slate-400 font-medium pb-4">Ainda não há eventos.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}