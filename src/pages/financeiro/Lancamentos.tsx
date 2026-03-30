import { useMemo, useState } from "react";
import { Search, Plus, Pencil, Trash2, FileText, AlertTriangle, Filter, Image as ImageIcon, TrendingUp, TrendingDown, Scale, Download, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { exportToPDF, exportToExcel } from "@/utils/export";
import { useParams, Link } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useFinanceEntries, useDeleteFinanceEntry, useFinanceAttachments, useDeleteAttachment } from "@/hooks/useFinance";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { FinanceEntry, EntryType } from "./types";
import { EntryFormDialog } from "./components/EntryFormDialog";

// --- HELPERS ---
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" }); // Treat mock ISO strictly by date part
}

// --- MAIN COMPONENT ---
export default function Lancamentos() {
  const { workspaceId } = useParams();
  const { data: workspaces, isLoading: isLoadingWorkspaces } = useWorkspaces();
  const resolvedWorkspaceId = workspaceId || workspaces?.[0]?.id;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeWorkspaceName = workspaces?.find((w: any) => w.id === resolvedWorkspaceId)?.name || "Resumo Financeiro";

  const { data: entriesData, isLoading: isLoadingEntries } = useFinanceEntries(resolvedWorkspaceId);
  const { mutate: deleteEntry } = useDeleteFinanceEntry(resolvedWorkspaceId);

  const entries = entriesData || [];

  // Search & Filters
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | EntryType>("ALL");
  const [filterCategory, setFilterCategory] = useState<string[]>([]);
  const [openCategory, setOpenCategory] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FinanceEntry | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingEntry, setDeletingEntry] = useState<FinanceEntry | null>(null);

  const [viewingAttachmentsId, setViewingAttachmentsId] = useState<string | null>(null);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
  const { data: attachments, isLoading: isLoadingAttachments } = useFinanceAttachments(viewingAttachmentsId || "");
  const { mutate: deleteAttachment } = useDeleteAttachment(viewingAttachmentsId || "");

  // Computed
  const filtered = useMemo(() => {
    let result = entries;
    const q = query.trim().toLowerCase();

    if (q) {
      result = result.filter(e =>
        e.description.toLowerCase().includes(q) ||
        e.categoryName.toLowerCase().includes(q)
      );
    }

    if (filterType !== "ALL") {
      result = result.filter(e => e.type === filterType);
    }

    if (filterCategory.length > 0) {
      result = result.filter(e => filterCategory.includes(e.categoryName));
    }

    // Sort descending by date
    return result.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  }, [entries, query, filterType, filterCategory]);

  const { filteredIncome, filteredExpense, filteredBalance } = useMemo(() => {
    let inc = 0, exp = 0;
    filtered.forEach(e => {
      if (e.type === "INCOME") inc += e.amountCents;
      if (e.type === "EXPENSE") exp += e.amountCents;
    });
    return { filteredIncome: inc, filteredExpense: exp, filteredBalance: inc - exp };
  }, [filtered]);

  // Categories derived from actual data
  const availableCategories = useMemo(() => {
    return Array.from(new Set(entries.map(e => e.categoryName || "Geral")))
      .sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  // --- ACTIONS ---
  function handleOpenCreate() {
    setEditingEntry(null);
    setFormOpen(true);
  }

  function handleOpenEdit(e: FinanceEntry) {
    setEditingEntry(e);
    setFormOpen(true);
  }

  function handleOpenDelete(e: FinanceEntry) {
    setDeletingEntry(e);
    setDeleteOpen(true);
  }

  function handleSuccessSave() {
    setFormOpen(false);
  }

  function confirmDelete() {
    if (!deletingEntry) return;
    deleteEntry(deletingEntry.id, {
      onSuccess: () => {
        toast({ title: "Sucesso", description: "Lançamento excluído." });
        setDeleteOpen(false);
        // Check pagination bounds after delete
        if (paginated.length === 1 && page > 1) {
          setPage(p => p - 1);
        }
        setDeletingEntry(null);
      },
      onError: () => {
        toast({ title: "Erro", description: "Falha ao excluir o lançamento.", variant: "destructive" });
      }
    });
  }

  function handleOpenAttachments(e: FinanceEntry) {
    setViewingAttachmentsId(e.id);
  }

  function handleCloseAttachments() {
    setViewingAttachmentsId(null);
  }

  function handleDeleteAttachment(attId: string) {
    setDeletingAttachmentId(attId);
  }

  function confirmDeleteAttachment() {
    if (!deletingAttachmentId) return;
    deleteAttachment(deletingAttachmentId, {
      onSuccess: () => {
        toast({ title: "Sucesso", description: "Anexo removido do sistema." });
        setDeletingAttachmentId(null);
      },
      onError: () => toast({ title: "Erro", description: "Falha ao remover anexo.", variant: "destructive" })
    });
  }

  // --- RENDER ---
  if (isLoadingWorkspaces || isLoadingEntries) {
    return <div className="p-8 text-center text-slate-500">Carregando lançamentos...</div>;
  }

  if (!workspaces || workspaces.length === 0) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center p-8 text-center">
        <div className="mb-6 grid h-20 w-20 place-items-center rounded-full bg-blue-50 text-blue-600">
          <AlertTriangle className="h-10 w-10" />
        </div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-slate-900">
          Nenhum Workspace encontrado
        </h1>
        <p className="mb-6 max-w-md text-slate-500">
          Para gerenciar suas receitas e despesas, você precisa ter uma empresa (workspace) cadastrada no sistema.
        </p>
        <Button asChild className="h-11 rounded-2xl bg-[#0A5BC4] px-6 hover:bg-[#094FA8]">
          <Link to="/workspaces">
            Criar meu Primeiro Workspace
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Lançamentos</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gerencie despesas e receitas do período.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
          <div className="relative w-full sm:w-[320px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar por descrição ou categoria..."
              className="h-11 rounded-2xl pl-10"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              className="h-11 flex-1 sm:flex-none rounded-2xl gap-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
              onClick={() => exportToPDF(filtered, activeWorkspaceName, { income: filteredIncome, expense: filteredExpense, balance: filteredBalance })}
              disabled={filtered.length === 0}
            >
              <FileText className="h-4 w-4" />
              PDF
            </Button>
            <Button
              variant="outline"
              className="h-11 flex-1 sm:flex-none rounded-2xl gap-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
              onClick={() => exportToExcel(filtered, activeWorkspaceName, { income: filteredIncome, expense: filteredExpense, balance: filteredBalance })}
              disabled={filtered.length === 0}
            >
              <Download className="h-4 w-4" />
              Excel
            </Button>
            <Button className="h-11 flex-1 sm:flex-none rounded-2xl gap-2 bg-[#0A5BC4] hover:bg-[#094FA8]" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4" />
              Novo Lançamento
            </Button>
          </div>
        </div>
      </div>

      {/* FILTERS TRAY */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500 pr-2 border-r">
          <Filter className="h-4 w-4" />
          Filtros
        </div>
        <Select value={filterType} onValueChange={(v: "ALL" | EntryType) => { setFilterType(v); setPage(1); }}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os Tipos</SelectItem>
            <SelectItem value="EXPENSE">Despesas</SelectItem>
            <SelectItem value="INCOME">Receitas</SelectItem>
          </SelectContent>
        </Select>

        <Popover open={openCategory} onOpenChange={setOpenCategory}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openCategory}
              className="h-9 justify-between font-normal min-w-[200px]"
            >
              {filterCategory.length === 0
                ? "Categorias (Todas)"
                : `${filterCategory.length} selecionada(s)`}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[220px] p-0">
            <Command>
              <CommandInput placeholder="Buscar categoria..." />
              <CommandList>
                <CommandEmpty>Nenhuma categoria.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      setFilterCategory([]);
                      setPage(1);
                    }}
                  >
                    <div className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary ${filterCategory.length === 0 ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"}`}>
                      <Check className="h-4 w-4" />
                    </div>
                    Todas as Categorias
                  </CommandItem>
                  {availableCategories.map((catName) => (
                    <CommandItem
                      key={catName}
                      value={catName}
                      onSelect={() => {
                        setFilterCategory(prev =>
                          prev.includes(catName)
                            ? prev.filter(item => item !== catName)
                            : [...prev, catName]
                        );
                        setPage(1);
                      }}
                    >
                      <div className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary ${filterCategory.includes(catName) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"}`}>
                        <Check className="h-4 w-4" />
                      </div>
                      {catName}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* FILTER SUMMARY CARDS (dynamic totals based on the active table) */}
      {(filterType !== "ALL" || filterCategory.length > 0 || query.trim() !== "") && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

          {(filterType === "ALL" || filterType === "INCOME") && (
            <Card className="rounded-3xl border-emerald-100 bg-emerald-50/30 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-emerald-800">Total Receitas</CardTitle>
                <div className="h-8 w-8 rounded-full bg-emerald-100 grid place-items-center">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">{formatCurrency(filteredIncome)}</div>
                <p className="text-xs text-emerald-600/70 mt-1">Soma das receitas na pesquisa atual</p>
              </CardContent>
            </Card>
          )}

          {(filterType === "ALL" || filterType === "EXPENSE") && (
            <Card className="rounded-3xl border-rose-100 bg-rose-50/30 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-rose-800">Total Despesas</CardTitle>
                <div className="h-8 w-8 rounded-full bg-rose-100 grid place-items-center">
                  <TrendingDown className="h-4 w-4 text-rose-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-rose-600">{formatCurrency(filteredExpense)}</div>
                <p className="text-xs text-rose-600/70 mt-1">Soma das despesas na pesquisa atual</p>
              </CardContent>
            </Card>
          )}

          {filterType === "ALL" && (
            <Card className="rounded-3xl border-indigo-100 bg-indigo-50/30 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-indigo-800">Saldo do Filtro</CardTitle>
                <div className="h-8 w-8 rounded-full bg-indigo-100 grid place-items-center">
                  <Scale className="h-4 w-4 text-indigo-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${filteredBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {filteredBalance >= 0 ? "+" : "-"} {formatCurrency(Math.abs(filteredBalance))}
                </div>
                <p className="text-xs text-indigo-600/70 mt-1">Balanço líquido da pesquisa atual</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* TABLE */}
      <Card className="rounded-3xl border-slate-200 shadow-sm">
        <CardContent className="p-5">
          {/* Pagination Top */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="text-sm text-slate-500">
              Página {page} de {totalPages} • Total: {filtered.length}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={!hasPrev}>Anterior</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={!hasNext}>Próxima</Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-[15%]">Data</TableHead>
                  <TableHead className="w-[30%]">Descrição</TableHead>
                  <TableHead className="w-[20%]">Categoria</TableHead>
                  <TableHead className="w-[10%] text-center">Anexos</TableHead>
                  <TableHead className="w-[15%] text-right">Valor</TableHead>
                  <TableHead className="w-[10%] text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">Nenhum lançamento encontrado.</TableCell></TableRow>
                ) : (
                  paginated.map(e => (
                    <TableRow key={e.id} className="hover:bg-slate-50/50">
                      <TableCell className="text-sm font-medium text-slate-700">
                        {formatDate(e.occurredAt)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-900">{e.description}</div>
                        {(e.nfeNumber || e.empenhoNumber) && (
                          <div className="flex gap-2 mt-1">
                            {e.nfeNumber && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">NF-e: {e.nfeNumber}</span>}
                            {e.empenhoNumber && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">Empenho: {e.empenhoNumber}</span>}
                          </div>
                        )}
                        <div className="text-xs font-semibold text-slate-500 mt-1">{e.type === "INCOME" ? "Receita" : "Despesa"}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-white">{e.categoryName}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {e.attachmentsStatus === "pending" && <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-200">Pendente</Badge>}
                        {e.attachmentsStatus === "ok" && (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-blue-600" onClick={() => handleOpenAttachments(e)}>
                            <FileText className="h-4 w-4 mr-1" /> Ver
                          </Button>
                        )}
                        {e.attachmentsStatus === "none" && <span className="text-slate-400">—</span>}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${e.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {e.type === "EXPENSE" ? "- " : "+ "}
                        {formatCurrency(e.amountCents)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" title="Editar" onClick={() => handleOpenEdit(e)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" title="Excluir" onClick={() => handleOpenDelete(e)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* --- DIALOGS --- */}
      <EntryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        entry={editingEntry}
        onSuccessSave={handleSuccessSave}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-center">Excluir Lançamento?</DialogTitle>
            <DialogDescription className="text-center">
              Tem certeza que deseja remover <strong>{deletingEntry?.description}</strong>? Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Sim, Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingAttachmentsId} onOpenChange={(open) => !open && handleCloseAttachments()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Anexos do Lançamento</DialogTitle>
            <DialogDescription>
              Gerencie os comprovantes ou notas fiscais anexadas.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {isLoadingAttachments ? (
              <div className="text-center text-sm text-slate-500 py-4">Carregando anexos da nuvem...</div>
            ) : !attachments || attachments.length === 0 ? (
              <div className="text-center text-sm text-slate-500 py-4">Nenhum anexo encontrado.</div>
            ) : (
              <ul className="space-y-3">
                {attachments.map(att => {
                  const isImage = att.contentType?.startsWith('image/');
                  return (
                    <li key={att.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="flex items-center space-x-3 overflow-hidden">
                        {isImage ? (
                          <ImageIcon className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
                        )}
                        <div className="flex flex-col truncate">
                          <a href={att.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-slate-700 hover:underline hover:text-blue-600 truncate">
                            {att.fileName}
                          </a>
                          <span className="text-xs text-slate-400">{(att.fileSize / 1024).toFixed(1)} KB • {format(new Date(att.createdAt), "dd/MM/yyyy HH:mm")}</span>
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0" onClick={() => handleDeleteAttachment(att.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <DialogFooter className="sm:justify-end">
            <Button variant="secondary" onClick={handleCloseAttachments}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingAttachmentId} onOpenChange={(open) => !open && setDeletingAttachmentId(null)}>
        <DialogContent>
          <DialogHeader>
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-center">Remover Anexo?</DialogTitle>
            <DialogDescription className="text-center">
              Tem certeza que deseja remover este anexo? O arquivo será definitivamente excluído da nuvem.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-2">
            <Button variant="outline" onClick={() => setDeletingAttachmentId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDeleteAttachment}>
              Sim, Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
