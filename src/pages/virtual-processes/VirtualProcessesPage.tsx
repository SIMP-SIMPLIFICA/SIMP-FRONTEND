import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FolderArchive, Plus, Search, UploadCloud, Download, CheckCircle, Clock, FolderOpen, File, RefreshCw, Trash2, Edit2 } from "lucide-react";

import { virtualProcessApi, type VirtualProcess, type VirtualProcessDocument, type AuditLog } from "@/lib/api/virtual-processes";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function VirtualProcessesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [secretaria, setSecretaria] = useState("ALL");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterSource, setFilterSource] = useState("ALL");
  const [filterCompany, setFilterCompany] = useState("");

  const activeFiltersStr = [
    secretaria !== "ALL" ? "secretaria" : "",
    filterCategory !== "ALL" ? "category" : "",
    filterSource !== "ALL" ? "source" : "",
    filterStartDate ? "startDate" : "",
    filterEndDate ? "endDate" : "",
    filterCompany ? "company" : ""
  ].filter(Boolean).length;

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
    category: "",
    companyName: "",
    cnpj: "",
    validityStart: "",
    validityEnd: "",
    status: "Tramitando" as "Tramitando" | "Finalizado"
  });

  const { data: queryData, isLoading } = useQuery({
    queryKey: ["virtual-processes", search, secretaria, filterCategory, filterSource, filterStartDate, filterEndDate, filterCompany],
    queryFn: () => virtualProcessApi.list({
      search: search || undefined,
      secretaria: secretaria !== "ALL" ? secretaria : undefined,
      category: filterCategory !== "ALL" ? filterCategory : undefined,
      source: filterSource !== "ALL" ? filterSource : undefined,
      startDate: filterStartDate || undefined,
      endDate: filterEndDate || undefined,
      company: filterCompany || undefined
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
        category: "",
        companyName: "",
        cnpj: "",
        validityStart: "",
        validityEnd: "",
        status: "Tramitando"
      });

      if (data && data.process && data.process.id) {
        setSelectedProcessId(data.process.id);
      }
    },
    onError: () => toast({ title: "Erro ao criar processo", variant: "destructive" })
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, newStatus }: { id: string, newStatus: string }) => virtualProcessApi.toggleStatus(id, newStatus),
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

  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [editCompanyName, setEditCompanyName] = useState("");
  const [editCompanyCnpj, setEditCompanyCnpj] = useState("");

  const updateCompanyMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string, payload: { companyName?: string, companyCnpj?: string } }) => virtualProcessApi.updateCompany(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["virtual-process", selectedProcessId] });
      queryClient.invalidateQueries({ queryKey: ["virtual-processes"] });
      toast({ title: "Dados da empresa atualizados com sucesso" });
      setIsEditingCompany(false);
    },
    onError: () => toast({ title: "Erro ao atualizar dados da empresa", variant: "destructive" })
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

  const deleteDocumentMutation = useMutation({
    mutationFn: ({ processId, docId }: { processId: string, docId: string }) => virtualProcessApi.deleteDocument(processId, docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["virtual-process", selectedProcessId] });
      queryClient.invalidateQueries({ queryKey: ["virtual-processes"] });
      toast({ title: "Documento excluído com sucesso" });
    },
    onError: () => toast({ title: "Erro ao excluir documento", variant: "destructive" })
  });

  const handleCreateProcess = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const categoryFromForm = formData.get('category') as string;

    const payload: Partial<VirtualProcess> = {
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
    if (s.includes("federal")) return "primary";
    if (s.includes("estadual")) return "warning";
    if (s.includes("proprio") || s.includes("próprio")) return "success";
    return "gray";
  };

  return (
    <TooltipProvider>
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

        <div className="flex flex-col gap-4">
          {/* Main Search Bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-center bg-white p-5 rounded-2xl shadow-sm border border-slate-200 w-full">
            <div className="flex-1 relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                placeholder="Buscar por Nº do processo, interessado ou assunto..."
                className="pl-11 h-12 bg-slate-50 text-base border-slate-200"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <Select value={secretaria} onValueChange={setSecretaria}>
                <SelectTrigger className="bg-slate-50 h-12 w-full sm:w-[260px] border-slate-200">
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
                  <SelectItem value="Licitação / Compras">Licitação / Compras</SelectItem>
                  <SelectItem value="Gabinete do Prefeito">Gabinete do Prefeito</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant={showAdvancedFilters ? "primary" : "secondary"}
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`h-12 px-5 whitespace-nowrap ${showAdvancedFilters ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' : 'bg-slate-50 border-slate-200'}`}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Filtros {activeFiltersStr > 0 && <span className="ml-2 bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]">{activeFiltersStr}</span>}
              </Button>
            </div>
          </div>

          {/* Expandable Advanced Filters */}
          {showAdvancedFilters && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row gap-4 flex-wrap w-full animate-in slide-in-from-top-2 duration-200">
              <div className="space-y-1.5 flex-1 min-w-[200px]">
                <label className="text-xs font-bold text-slate-700 uppercase">Categoria / Objeto</label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="bg-white border-slate-300 rounded-md h-12">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todas as Categorias</SelectItem>
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
                    <SelectItem value="Passagens e Diárias">Passagens e Diárias</SelectItem>
                    <SelectItem value="Medicamentos / Saúde">Medicamentos / Saúde</SelectItem>
                    <SelectItem value="Combustíveis">Combustíveis</SelectItem>
                    <SelectItem value="Outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 flex-1 min-w-[200px]">
                <label className="text-xs font-bold text-slate-700 uppercase">Origem</label>
                <Select value={filterSource} onValueChange={setFilterSource}>
                  <SelectTrigger className="bg-white border-slate-300 rounded-md h-12">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todas as Fontes</SelectItem>
                    <SelectItem value="Recurso Próprio">Recurso Próprio</SelectItem>
                    <SelectItem value="Recurso Estadual">Recurso Estadual</SelectItem>
                    <SelectItem value="Recurso Federal">Recurso Federal</SelectItem>
                    <SelectItem value="Convênio">Convênio</SelectItem>
                    <SelectItem value="Emenda Parlamentar">Emenda Parlamentar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 flex-1 min-w-[200px]">
                <label className="text-xs font-bold text-slate-700 uppercase">Empresa Contratada</label>
                <Input
                  placeholder="Nome ou CNPJ..."
                  value={filterCompany}
                  onChange={(e) => setFilterCompany(e.target.value)}
                  className="bg-white border-slate-300 rounded-md h-12"
                />
              </div>

              <div className="space-y-1.5 flex-[0.5] min-w-[140px]">
                <label className="text-xs font-bold text-slate-700 uppercase">Período (Início)</label>
                <Input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="bg-white border-slate-300 rounded-md h-12" />
              </div>
              <div className="space-y-1.5 flex-[0.5] min-w-[140px]">
                <label className="text-xs font-bold text-slate-700 uppercase">Período (Fim)</label>
                <Input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="bg-white border-slate-300 rounded-md h-12" />
              </div>

              <div className="flex items-end flex-shrink-0">
                <Button
                  variant="ghost"
                  onClick={() => { setSecretaria("ALL"); setFilterCategory("ALL"); setFilterSource("ALL"); setFilterCompany(""); setFilterStartDate(""); setFilterEndDate(""); }}
                  className="h-11 px-4 text-slate-500 hover:text-slate-700 bg-white border border-slate-200 font-medium"
                >
                  Limpar
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex-1 flex flex-col mt-4 overflow-hidden">
          <div className="flex-1 overflow-auto">
            <Table className="table-auto w-full">
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
                        <Badge variant={getSourceColor(proc.source) as any}>
                          {proc.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600 border-b border-slate-100">{proc.secretaria}</TableCell>
                      <TableCell className="text-slate-600 border-b border-slate-100">
                        <Badge variant="gray">
                          {proc.category || "Outros"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[280px] truncate text-slate-600 border-b border-slate-100" title={proc.subject}>
                        {proc.subject}
                      </TableCell>
                      <TableCell className="border-b border-slate-100">
                        <span className="flex items-center gap-1.5 text-slate-600 font-medium bg-slate-100 px-2 py-1 rounded w-fit text-sm">
                          <File className="h-4 w-4 text-slate-400" />
                          {proc.documentCount ?? proc._count?.documents ?? proc.documents?.length ?? 0}
                        </span>
                      </TableCell>
                      <TableCell className="border-b border-slate-100">
                        <Badge variant={proc.status === "Tramitando" ? "success" : "gray"}>
                          {proc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right border-b border-slate-100 align-middle">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedProcessId(proc.id)} title="Abrir Pasta">
                          <FolderOpen className="h-5 w-5 text-slate-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-sm text-slate-500">
              <span>Listando {processes.length} processos</span>
              {/* Componente de paginação poderá ser embutido aqui no futuro */}
            </div>
          </div>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-3xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
            <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-white shrink-0">
              <DialogTitle className="text-xl font-bold text-slate-800">Autuar Novo Processo</DialogTitle>
            </DialogHeader>

            <div className="overflow-y-auto p-6 bg-slate-50/50 flex-1">
              <form id="create-process-form" onSubmit={handleCreateProcess} className="space-y-8">

                {/* 1. Identificação */}
                <section>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2 mb-4">1. Identificação</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Número do Processo</label>
                      <Input required placeholder="Ex: 001/2026" className="bg-white h-12" value={newProcess.processNumber} onChange={e => setNewProcess({ ...newProcess, processNumber: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Status</label>
                      <Select value={newProcess.status} onValueChange={(v: "Tramitando" | "Finalizado") => setNewProcess({ ...newProcess, status: v })}>
                        <SelectTrigger className="bg-white h-12"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Tramitando">Tramitando</SelectItem>
                          <SelectItem value="Finalizado">Finalizado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Secretaria</label>
                      <Select value={newProcess.secretaria} onValueChange={v => setNewProcess({ ...newProcess, secretaria: v })}>
                        <SelectTrigger className="bg-white h-12"><SelectValue placeholder="Selecione..." /></SelectTrigger>
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
                </section>

                {/* 2. Natureza e Origem */}
                <section>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2 mb-4">2. Natureza e Origem</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Categoria / Objeto</label>
                      <input type="hidden" name="category" value={newProcess.category} />
                      <Select value={newProcess.category} onValueChange={v => setNewProcess({ ...newProcess, category: v })}>
                        <SelectTrigger className="bg-white h-12"><SelectValue placeholder="Selecione..." /></SelectTrigger>
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
                          <SelectItem value="Passagens e Diárias">Passagens e Diárias</SelectItem>
                          <SelectItem value="Medicamentos / Saúde">Medicamentos / Saúde</SelectItem>
                          <SelectItem value="Combustíveis">Combustíveis</SelectItem>
                          <SelectItem value="Outros">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Assunto</label>
                      <Input required className="bg-white h-12" placeholder="Descreva brevemente o assunto" value={newProcess.subject} onChange={e => setNewProcess({ ...newProcess, subject: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Origem do Recurso</label>
                      <Select value={newProcess.source} onValueChange={v => setNewProcess({ ...newProcess, source: v })}>
                        <SelectTrigger className="bg-white h-12"><SelectValue placeholder="Selecione..." /></SelectTrigger>
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
                      <Input className="bg-white h-12" placeholder="Ex: Portaria nº 123/2023" value={newProcess.sourceDetail} onChange={e => setNewProcess({ ...newProcess, sourceDetail: e.target.value })} />
                    </div>
                  </div>
                </section>

                {/* 3. Empresa e Vigência */}
                <section>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2 mb-4">3. Fornecedor e Contrato <span className="text-slate-400 font-normal lowercase">(Opcional)</span></h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Razão Social / Nome da Empresa</label>
                      <Input className="bg-white h-12" placeholder="Nome da contratada..." value={newProcess.companyName} onChange={e => setNewProcess({ ...newProcess, companyName: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">CNPJ / CPF</label>
                      <Input className="bg-white h-12" placeholder="00.000.000/0000-00" value={newProcess.cnpj} onChange={e => setNewProcess({ ...newProcess, cnpj: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Início Vigência</label>
                      <Input type="date" className="bg-white h-12" value={newProcess.validityStart} onChange={e => setNewProcess({ ...newProcess, validityStart: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Fim Vigência</label>
                      <Input type="date" className="bg-white h-12" value={newProcess.validityEnd} onChange={e => setNewProcess({ ...newProcess, validityEnd: e.target.value })} />
                    </div>
                  </div>
                </section>

                {/* 4. Dados Bancários */}
                <section>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2 mb-4">4. Dados Bancários <span className="text-slate-400 font-normal lowercase">(Opcional)</span></h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Nome do Banco</label>
                      <Select value={newProcess.bankName} onValueChange={v => setNewProcess({ ...newProcess, bankName: v })}>
                        <SelectTrigger className="bg-white h-12"><SelectValue placeholder="Selecione..." /></SelectTrigger>
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
                      <label className="text-sm font-semibold text-slate-700">Agência</label>
                      <Input className="bg-white h-12" placeholder="Ex: 1234-5" value={newProcess.agency} onChange={e => setNewProcess({ ...newProcess, agency: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Conta Bancária</label>
                      <Input className="bg-white h-12" placeholder="Ex: 12345-6" value={newProcess.bankAccount} onChange={e => setNewProcess({ ...newProcess, bankAccount: e.target.value })} />
                    </div>
                  </div>
                </section>

              </form>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-white shrink-0 flex justify-end gap-3 rounded-b-lg">
              <Button type="button" variant="secondary" className="h-11 px-6" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
              <Button type="submit" form="create-process-form" className="bg-blue-600 hover:bg-blue-700 text-white h-11 px-6 shadow-sm" disabled={createMutation.isPending || !newProcess.secretaria || !newProcess.source || !newProcess.category || !newProcess.processNumber || !newProcess.subject}>
                {createMutation.isPending ? "Autuando..." : "Autuar Processo"}
              </Button>
            </div>
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
                      <p className="text-[13px] font-semibold tracking-wider text-slate-500 uppercase mb-2">Processo Digital</p>
                      <div className="flex items-center gap-4">
                        <SheetTitle className="text-2xl font-bold font-mono tracking-tight text-slate-900">
                          {details.process.processNumber}
                        </SheetTitle>

                        <Button
                          variant="danger"
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
                      <div className="flex flex-wrap items-center gap-2 mt-4 text-sm">
                        <Badge variant={details.process.status === "Tramitando" ? "success" : "gray"}>
                          {details.process.status}
                        </Badge>
                        <Badge variant="gray">
                          {details.process.secretaria}
                        </Badge>
                        <Badge variant={getSourceColor(details.process.source) as any}>
                          {details.process.source}
                        </Badge>
                        <Badge variant="gray">
                          {details.process.category || "Outros"}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      className="shadow-sm border-slate-300"
                      onClick={() => toggleStatusMutation.mutate({
                        id: details.process.id,
                        newStatus: details.process.status === "Tramitando" ? "Finalizado" : "Tramitando"
                      })}
                      disabled={toggleStatusMutation.isPending}
                    >
                      {details.process.status === "Tramitando" ? (
                        <><CheckCircle className="mr-2 h-4 w-4 text-emerald-600" /> Finalizar Processo</>
                      ) : (
                        <><RefreshCw className="mr-2 h-4 w-4 text-blue-600" /> Retomar Tramitação</>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
                  {/* COLUNA ESQUERDA (Principal) */}
                  <div className="flex flex-col gap-6">

                    {/* Assunto e Detalhes */}
                    <Card className="rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <CardTitle className="text-[13px] font-bold uppercase tracking-widest text-slate-500">Assunto Principal</CardTitle>
                      </CardHeader>
                      <CardContent className="p-5">
                        <p className="text-slate-800 leading-relaxed text-base">
                          {details.process.subject}
                        </p>

                        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {details.process.sourceDetail && (
                            <div className="p-3 bg-slate-50 rounded border border-slate-100">
                              <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Detalhes da Origem</h3>
                              <p className="text-slate-700 text-sm font-medium">{details.process.sourceDetail}</p>
                            </div>
                          )}
                          <div className="p-3 bg-slate-50 rounded border border-slate-100">
                            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Categoria</h3>
                            <p className="text-slate-700 text-sm font-medium">{details.process.category || "Não Informada"}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Upload Form */}
                    <Card className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                      <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <CardTitle className="text-[15px] font-semibold text-slate-900 flex items-center gap-2">
                          <UploadCloud className="h-4 w-4 text-blue-600" />
                          Acervo do Processo
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">

                        <form onSubmit={handleUpload} className="space-y-4 mb-6 pb-6 border-b border-slate-100">
                          <div className="flex flex-col sm:flex-row gap-3">
                            <Select required value={uploadTag} onValueChange={setUploadTag}>
                              <SelectTrigger className="bg-slate-50 h-11 sm:w-1/3"><SelectValue placeholder="Categoria do Anexo" /></SelectTrigger>
                              <SelectContent>
                                {[
                                  'Homologação', 'Adjudicação', 'Manifesto Ambiental',
                                  'Empenho', 'Liquidação', 'Comprovantes', 'Rendimentos',
                                  'Extrato', 'Contrato', 'Parecer Jurídico', 'Medições',
                                  'Notas Fiscais', 'Outros'
                                ].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Input type="file" ref={fileInputRef} className="flex-1 cursor-pointer bg-slate-50 py-2 h-11" required />
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white h-11 px-6 shadow-sm" disabled={!uploadTag || uploadMutation.isPending}>
                              {uploadMutation.isPending ? "Enviando..." : "Anexar"}
                            </Button>
                          </div>
                        </form>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between mb-3 px-1">
                            <span className="text-sm font-semibold text-slate-700">Documentos Anexados</span>
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{details.process.documents?.length || 0}</span>
                          </div>

                          {(details?.process?.documents || []).map((doc: VirtualProcessDocument) => (
                            <div key={doc.id} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between group hover:border-blue-300 transition-all">
                              <div className="flex-1 min-w-0 pr-4">
                                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                  <Badge variant="gray" className="py-0 px-2 text-[10px] uppercase">
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
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button variant="ghost" size="sm" onClick={() => handleDownload(doc.id)} className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Baixar">
                                  <Download className="h-5 w-5" />
                                </Button>

                                {(() => {
                                  const isExpired = (new Date().getTime() - new Date(doc.uploadedAt).getTime()) > 24 * 60 * 60 * 1000;
                                  return isExpired ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span>
                                          <Button variant="ghost" size="sm" disabled className="text-slate-300">
                                            <Trash2 className="h-5 w-5" />
                                          </Button>
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>O prazo de 24 horas para exclusão expirou.</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        if (selectedProcessId && confirm("Tem certeza que deseja excluir este documento?")) {
                                          deleteDocumentMutation.mutate({ processId: selectedProcessId, docId: doc.id });
                                        }
                                      }}
                                      className="text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                      title="Excluir Documento"
                                      disabled={deleteDocumentMutation.isPending}
                                    >
                                      <Trash2 className="h-5 w-5" />
                                    </Button>
                                  );
                                })()}
                              </div>
                            </div>
                          ))}
                          {!(details?.process?.documents || []).length && (
                            <div className="text-center py-10 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
                              <File className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                              <p className="text-sm text-slate-500 font-medium">Pasta de processo vazia.</p>
                            </div>
                          )}
                        </div>

                      </CardContent>
                    </Card>

                    <Card className="rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
                      <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <CardTitle className="text-[15px] font-semibold text-slate-900 flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-600" />
                          Trilha de Auditoria
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-5">
                        <div className="relative pl-[18px] border-l-2 border-slate-100 space-y-6 pb-2 max-h-[320px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                          {(details?.auditLog || []).map((log: AuditLog) => (
                            <div key={log.id} className="relative">
                              <span className="absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full bg-blue-100 border-2 border-white shadow-sm ring-1 ring-slate-200 flex items-center justify-center">
                                <span className="h-1 w-1 bg-blue-500 rounded-full"></span>
                              </span>
                              <div className="text-[13px] leading-relaxed">
                                <span className="font-semibold text-slate-900">
                                  {log.user?.firstName || "Usuário"} {log.user?.lastName || "Sistema"}
                                </span>
                                <span className="text-slate-600 mx-1.5">
                                  {(() => {
                                    const fileName = log.metadata?.fileName || log.metadata?.file?.name || log.metadata?.documentName;

                                    if (log.action === "ANEXOU_DOCUMENTO") {
                                      return fileName ? `anexou o documento ${fileName}` : "anexou um documento";
                                    }
                                    if (log.action === "REMOVEU_DOCUMENTO") {
                                      return fileName ? `excluiu o documento ${fileName}` : "excluiu um documento";
                                    }
                                    if (log.action === "CRIOU_PROCESSO") return "autuou o processo";
                                    if (log.action === "STATUS_ALTERADO" || log.action === "ALTEROU_STATUS") return "alterou o status";
                                    if (log.action.includes("_")) return log.action.replace(/_/g, " ").toLowerCase();
                                    return log.action;
                                  })()}
                                </span>
                              </div>
                              <div className="text-[11px] font-medium text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                                {new Date(log.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                {log.metadata?.tag && (
                                  <Badge variant="gray" className="text-[9px] py-0 px-1">
                                    {log.metadata.tag}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                          {!(details?.auditLog || []).length && (
                            <p className="text-sm text-slate-400 font-medium pb-2">Ainda não há eventos.</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* COLUNA DIREITA (Secundária) */}
                  <div className="flex flex-col gap-6">

                    {/* Detalhes Corporativos */}
                    <Card className="rounded-xl border border-slate-200 shadow-sm">
                      <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
                        <CardTitle className="text-[13px] font-bold uppercase tracking-widest text-slate-500">Dados da Empresa</CardTitle>
                        {!isEditingCompany && (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600" onClick={() => {
                            setEditCompanyName(details.process.companyName || "");
                            setEditCompanyCnpj(details.process.companyCnpj || details.process.cnpj || "");
                            setIsEditingCompany(true);
                          }}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </CardHeader>
                      <CardContent className="p-5 space-y-4">
                        {isEditingCompany ? (
                          <div className="space-y-4">
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-bold uppercase text-slate-500">Razão Social</label>
                              <Input className="h-9 text-sm" value={editCompanyName} onChange={e => setEditCompanyName(e.target.value)} placeholder="Nome da Contratada..." />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-bold uppercase text-slate-500">CNPJ</label>
                              <Input className="h-9 text-sm" value={editCompanyCnpj} onChange={e => setEditCompanyCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
                            </div>
                            <div className="flex gap-2 pt-2">
                              <Button type="button" variant="secondary" size="sm" className="flex-1" onClick={() => setIsEditingCompany(false)}>Cancelar</Button>
                              <Button type="button" size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" disabled={updateCompanyMutation.isPending} onClick={() => {
                                updateCompanyMutation.mutate({
                                  id: details.process.id,
                                  payload: { companyName: editCompanyName, companyCnpj: editCompanyCnpj }
                                });
                              }}>Salvar</Button>
                            </div>
                          </div>
                        ) : details.process.companyName || details.process.cnpj || details.process.companyCnpj ? (
                          <>
                            <div>
                              <p className="text-[11px] uppercase font-bold tracking-wider text-slate-400">Razão Social</p>
                              <p className="font-medium text-slate-800">{details.process.companyName || "Não informada"}</p>
                            </div>
                            <div>
                              <p className="text-[11px] uppercase font-bold tracking-wider text-slate-400">CNPJ</p>
                              <p className="font-mono text-slate-800 font-medium">{details.process.companyCnpj || details.process.cnpj || "Não informado"}</p>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-2">
                            <p className="text-xs text-slate-500 italic mb-3">Nenhuma empresa associada.</p>
                            <Button variant="secondary" size="sm" className="w-full text-blue-600 border border-blue-200 hover:bg-blue-50 hover:text-blue-700 bg-white" onClick={() => {
                              setEditCompanyName("");
                              setEditCompanyCnpj("");
                              setIsEditingCompany(true);
                            }}>
                              <Plus className="h-4 w-4 mr-1.5" /> Adicionar Empresa
                            </Button>
                          </div>
                        )}

                        {(details.process.validityStart || details.process.validityEnd) && (
                          <div className="pt-4 border-t border-slate-100">
                            <p className="text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-2">Vigência</p>
                            <div className="flex items-center gap-3 text-sm">
                              <span className="text-slate-800">{details.process.validityStart ? new Date(details.process.validityStart).toLocaleDateString('pt-BR') : "--"}</span>
                              <span className="text-slate-400">até</span>
                              <span className="text-slate-800">{details.process.validityEnd ? new Date(details.process.validityEnd).toLocaleDateString('pt-BR') : "--"}</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Processo Digital */}
                    <Card className="rounded-xl border border-slate-200 shadow-sm">
                      <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <CardTitle className="text-[13px] font-bold uppercase tracking-widest text-slate-500">Resumo Gerencial</CardTitle>
                      </CardHeader>
                      <CardContent className="p-5 space-y-4">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Criação da Pasta</p>
                          <p className="text-sm font-medium text-slate-800">{new Date(details.process.createdAt).toLocaleString('pt-BR')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Última Atualização</p>
                          <p className="text-sm font-medium text-slate-800">{new Date(details.process.updatedAt).toLocaleString('pt-BR')}</p>
                        </div>

                        {/* Optional Future Feature */}
                        <Button variant="secondary" className="w-full mt-2" disabled>
                          <Download className="mr-2 h-4 w-4" />
                          Baixar Dossie Inteiro
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Dados Bancarios */}
                    <Card className="rounded-xl border border-slate-200 shadow-sm">
                      <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <CardTitle className="text-[13px] font-bold uppercase tracking-widest text-slate-500">Fluxo Bancário</CardTitle>
                      </CardHeader>
                      <CardContent className="p-5">
                        {(details.process.bankName || details.process.agency || details.process.bankAccount) ? (
                          <div className="space-y-3">
                            {details.process.bankName && (
                              <div>
                                <p className="text-[11px] uppercase font-bold tracking-wider text-slate-400">Banco</p>
                                <p className="font-semibold text-slate-800">{details.process.bankName}</p>
                              </div>
                            )}
                            <div className="flex gap-4">
                              {details.process.agency && (
                                <div className="flex-1">
                                  <p className="text-[11px] uppercase font-bold tracking-wider text-slate-400">Agência</p>
                                  <p className="font-mono text-slate-800 font-medium">{details.process.agency}</p>
                                </div>
                              )}
                              {details.process.bankAccount && (
                                <div className="flex-1">
                                  <p className="text-[11px] uppercase font-bold tracking-wider text-slate-400">Conta</p>
                                  <p className="font-mono text-slate-800 font-medium">{details.process.bankAccount}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic pb-2">Sem vínculo de conta ou fluxo de pagamento informado no sistema.</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}