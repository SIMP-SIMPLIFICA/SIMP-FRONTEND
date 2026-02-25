import { useMemo, useState } from "react";
import { Search, Plus, Pencil, Trash2, FileText, AlertTriangle, Filter, Image as ImageIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useParams, Link } from "react-router-dom";
import { useFinanceEntries, useDeleteFinanceEntry, useFinanceCategories, useFinanceAttachments, useDeleteAttachment } from "@/hooks/useFinance";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { format } from "date-fns";

import { Card, CardContent } from "@/components/ui/card";
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

  const { data: entriesData, isLoading: isLoadingEntries } = useFinanceEntries(resolvedWorkspaceId);
  const { mutate: deleteEntry } = useDeleteFinanceEntry(resolvedWorkspaceId);
  const { data: categories = [] } = useFinanceCategories(resolvedWorkspaceId);

  const entries = entriesData || [];

  // Search & Filters
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | EntryType>("ALL");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");

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

    if (filterCategory !== "ALL") {
      result = result.filter(e => e.categoryName === filterCategory);
    }

    // Sort descending by date
    return result.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  }, [entries, query, filterType, filterCategory]);

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
          <Button className="h-11 rounded-2xl gap-2 bg-[#0A5BC4] hover:bg-[#094FA8]" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4" />
            Novo Lançamento
          </Button>
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

        <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setPage(1); }}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas as Categorias</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
                        <div className="text-xs font-semibold text-slate-500">{e.type === "INCOME" ? "Receita" : "Despesa"}</div>
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
