import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, Upload, History, LayoutGrid, List, FileText,
  Download, Trash2, Loader2, ShieldCheck, ChevronLeft, ChevronRight, Lock, Tag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useMe } from "@/hooks/useMe";
import { hasPermission } from "@/lib/permissions";
import { libraryService, type LibraryDocument } from "@/lib/api/library";
import { UploadDocumentModal } from "@/components/library/UploadDocumentModal";
import { LibraryLogsModal } from "@/components/library/LibraryLogsModal";
import { ManageCategoriesModal } from "@/components/library/ManageCategoriesModal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type ViewMode = "list" | "grid";

const LEVEL_BADGE: Record<number, { label: string; cls: string }> = {
  1: { label: "Nível 1", cls: "bg-green-100 text-green-700" },
  2: { label: "Nível 2", cls: "bg-amber-100 text-amber-700" },
  3: { label: "Nível 3", cls: "bg-red-100 text-red-700" },
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function LibraryPage() {
  const { data: me } = useMe();
  const qc = useQueryClient();

  const [view, setView] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [uploadOpen, setUploadOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [zipping, setZipping] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["library", "categories"],
    queryFn: libraryService.listCategories,
    staleTime: 60_000,
  });

  const clearanceLevel: number = me?.user?.clearanceLevel ?? 1;
  const canLogs = hasPermission(me, "library:logs");
  const canWrite = hasPermission(me, "library:write");
  const canDelete = hasPermission(me, "library:delete");

  const { data, isLoading } = useQuery({
    queryKey: ["library", "list", search, categoryFilter, page],
    queryFn: () => libraryService.list({ search: search || undefined, categoryId: categoryFilter || undefined, page, limit: 20 }),
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: libraryService.delete,
    onSuccess: () => {
      toast({ title: "Documento removido." });
      qc.invalidateQueries({ queryKey: ["library", "list"] });
    },
    onError: (err: unknown) => {
      const msg = (err as { message?: string })?.message ?? "Erro ao remover.";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    },
  });

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
    setSelected(new Set());
  }, [searchInput]);

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (!data?.data.length) return;
    if (selected.size === data.data.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data.data.map(d => d.id)));
    }
  }

  async function handleDownloadSingle(doc: LibraryDocument) {
    try {
      const { url, fileName } = await libraryService.download(doc.id);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.target = "_blank";
      a.click();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "Erro ao baixar.";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    }
  }

  async function handleDownloadZip() {
    if (selected.size === 0) return;
    setZipping(true);
    try {
      await libraryService.downloadZip(Array.from(selected));
      toast({ title: `${selected.size} documento(s) baixados com sucesso.` });
      setSelected(new Set());
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "Erro ao gerar ZIP.";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setZipping(false);
    }
  }

  const docs = data?.data ?? [];
  const meta = data?.meta;
  const allSelected = docs.length > 0 && selected.size === docs.length;

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Biblioteca Digital</h1>
            <p className="text-sm text-slate-500 mt-0.5">Gestão eletrônica de documentos (GED)</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {canLogs && (
              <Button variant="outline" size="sm" onClick={() => setLogsOpen(true)} className="gap-2">
                <History className="h-4 w-4" />
                Histórico
              </Button>
            )}
            {canWrite && (
              <Button variant="outline" size="sm" onClick={() => setCategoriesOpen(true)} className="gap-2">
                <Tag className="h-4 w-4" />
                Categorias
              </Button>
            )}
            {canWrite && (
              <Button size="sm" onClick={() => setUploadOpen(true)} className="gap-2">
                <Upload className="h-4 w-4" />
                Fazer Upload
              </Button>
            )}
          </div>
        </div>

        {/* Search + view toggle */}
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <form onSubmit={handleSearch} className="flex-1 min-w-[240px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Buscar por título ou conteúdo (OCR)..."
              className="pl-9 pr-20"
            />
            <Button
              type="submit"
              size="sm"
              variant="ghost"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-xs"
            >
              Buscar
            </Button>
          </form>

          {categories.length > 0 && (
            <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v === "all" ? "" : v); setPage(1); setSelected(new Set()); }}>
              <SelectTrigger className="w-44 h-9 text-sm">
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setView("list")}
              className={`p-2 transition-colors ${view === "list" ? "bg-slate-100 text-slate-800" : "text-slate-400 hover:text-slate-600"}`}
              title="Visualização em lista"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("grid")}
              className={`p-2 transition-colors ${view === "grid" ? "bg-slate-100 text-slate-800" : "text-slate-400 hover:text-slate-600"}`}
              title="Visualização em grade"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {search && (
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
            Resultados para: <span className="font-medium text-slate-700">"{search}"</span>
            <button onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }} className="text-xs text-red-500 hover:underline">
              Limpar
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        {isLoading ? (
          <div className="flex justify-center items-center py-24 text-slate-400 gap-3">
            <Loader2 className="h-6 w-6 animate-spin" />
            Carregando documentos...
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
            <FileText className="h-14 w-14 text-slate-200" />
            <p className="text-base font-medium">Nenhum documento encontrado</p>
            {canWrite && (
              <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)} className="mt-1 gap-2">
                <Upload className="h-4 w-4" />
                Fazer Upload
              </Button>
            )}
          </div>
        ) : view === "list" ? (
          /* ── LIST VIEW ── */
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="w-10 px-4 py-3">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Nome</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide hidden md:table-cell">Data</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide hidden lg:table-cell">Tamanho</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Sigilo</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide hidden md:table-cell">Uploader</th>
                  <th className="w-20 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {docs.map(doc => {
                  const accessible = doc.accessLevel <= clearanceLevel || doc.uploader.id === me?.user.id;
                  return (
                    <tr key={doc.id} className={`hover:bg-slate-50 transition-colors ${!accessible ? "opacity-50" : ""}`}>
                      <td className="px-4 py-3">
                        {accessible ? (
                          <Checkbox
                            checked={selected.has(doc.id)}
                            onCheckedChange={() => toggleSelect(doc.id)}
                          />
                        ) : (
                          <Lock className="h-4 w-4 text-slate-400 mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <FileText className="h-5 w-5 text-red-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-slate-800 truncate max-w-[220px]">{doc.title}</p>
                            <p className="text-xs text-slate-400 truncate max-w-[220px]">{doc.fileName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs hidden md:table-cell whitespace-nowrap">
                        {format(new Date(doc.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">{formatSize(doc.fileSize)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {LEVEL_BADGE[doc.accessLevel] && (
                            <Badge className={`text-xs ${LEVEL_BADGE[doc.accessLevel].cls}`}>
                              <ShieldCheck className="h-3 w-3 mr-1" />
                              {LEVEL_BADGE[doc.accessLevel].label}
                            </Badge>
                          )}
                          {doc.category && (
                            <Badge variant="outline" className="text-xs text-indigo-600 border-indigo-200 bg-indigo-50">
                              <Tag className="h-3 w-3 mr-1" />
                              {doc.category.name}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs hidden md:table-cell">
                        {doc.uploader.firstName} {doc.uploader.lastName}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {accessible && (
                            <button
                              onClick={() => handleDownloadSingle(doc)}
                              className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
                              title="Baixar"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => deleteMutation.mutate(doc.id)}
                              className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                              title="Remover"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ── GRID VIEW ── */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {docs.map(doc => {
              const accessible = doc.accessLevel <= clearanceLevel || doc.uploader.id === me?.user.id;
              const isSelected = selected.has(doc.id);
              return (
                <div
                  key={doc.id}
                  className={`bg-white border rounded-xl p-4 flex flex-col items-center gap-3 cursor-pointer transition-all group ${
                    isSelected ? "border-blue-400 ring-2 ring-blue-200" : "border-slate-200 hover:border-slate-300"
                  } ${!accessible ? "opacity-50 cursor-not-allowed" : ""}`}
                  onClick={() => accessible && toggleSelect(doc.id)}
                >
                  <div className="relative w-full flex justify-center">
                    <FileText className="h-14 w-14 text-red-400" />
                    {!accessible ? (
                      <div className="absolute top-0 right-0 bg-slate-400 rounded-full w-5 h-5 flex items-center justify-center">
                        <Lock className="w-3 h-3 text-white" />
                      </div>
                    ) : isSelected && (
                      <div className="absolute top-0 right-0 bg-blue-500 rounded-full w-5 h-5 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="w-full text-center">
                    <p className="text-xs font-medium text-slate-700 truncate">{doc.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{formatSize(doc.fileSize)}</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-1">
                    {LEVEL_BADGE[doc.accessLevel] && (
                      <Badge className={`text-[10px] px-1.5 ${LEVEL_BADGE[doc.accessLevel].cls}`}>
                        {LEVEL_BADGE[doc.accessLevel].label}
                      </Badge>
                    )}
                    {doc.category && (
                      <Badge variant="outline" className="text-[10px] px-1.5 text-indigo-600 border-indigo-200 bg-indigo-50">
                        {doc.category.name}
                      </Badge>
                    )}
                  </div>
                  {accessible && (
                    <button
                      onClick={e => { e.stopPropagation(); handleDownloadSingle(doc); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity mt-auto text-xs text-blue-600 flex items-center gap-1"
                    >
                      <Download className="h-3 w-3" />
                      Baixar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-slate-500">
              {meta.total} documento(s) · página {meta.page} de {meta.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-200">
          <div className="bg-slate-900 text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4">
            <span className="text-sm font-medium">{selected.size} selecionado(s)</span>
            <div className="h-4 w-px bg-slate-600" />
            <Button
              size="sm"
              onClick={handleDownloadZip}
              disabled={zipping}
              className="bg-blue-500 hover:bg-blue-600 text-white gap-2 h-8"
            >
              {zipping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Baixar Selecionados
            </Button>
            <button
              onClick={() => setSelected(new Set())}
              className="text-slate-400 hover:text-white transition-colors ml-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <UploadDocumentModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onSuccess={() => qc.invalidateQueries({ queryKey: ["library", "list"] })}
      />
      <LibraryLogsModal open={logsOpen} onOpenChange={setLogsOpen} />
      <ManageCategoriesModal open={categoriesOpen} onOpenChange={setCategoriesOpen} />
    </div>
  );
}
