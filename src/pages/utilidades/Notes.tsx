import { useState, useRef, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Trash2, Loader2, StickyNote, Search, X } from "lucide-react";

import { useNotes, useCreateNote, useUpdateNote, useDeleteNote } from "@/hooks/useNotes";
import type { Note, CreateNoteInput } from "@/lib/api/notes";
import { toast } from "@/hooks/use-toast";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const NOTE_COLORS = [
  { value: "#fef08a", label: "Amarelo" },
  { value: "#bbf7d0", label: "Verde" },
  { value: "#bfdbfe", label: "Azul" },
  { value: "#fecaca", label: "Vermelho" },
  { value: "#e9d5ff", label: "Roxo" },
  { value: "#fed7aa", label: "Laranja" },
  { value: "#f1f5f9", label: "Cinza" },
  { value: "#fce7f3", label: "Rosa" },
];

const DEFAULT_COLOR = "#fef08a";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatNoteDateBR(iso: string): string {
  return format(parseISO(iso), "d 'de' MMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
}

/** Todas as cores da paleta são claras — texto escuro sempre correto */
const NOTE_TEXT_COLOR = "#1e293b";

// ---------------------------------------------------------------------------
// ColorPicker
// ---------------------------------------------------------------------------
function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {NOTE_COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          title={c.label}
          onClick={() => onChange(c.value)}
          className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
          style={{
            backgroundColor: c.value,
            borderColor: value === c.value ? "#0A5BC4" : "transparent",
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// NoteCard
// ---------------------------------------------------------------------------
function NoteCard({
  note,
  onEdit,
  onDelete,
  deleting,
}: {
  note: Note;
  onEdit: (n: Note) => void;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  return (
    <div
      className="group relative flex flex-col rounded-2xl p-4 shadow-sm transition-shadow hover:shadow-md cursor-pointer"
      style={{ backgroundColor: note.color, color: NOTE_TEXT_COLOR }}
      onClick={() => onEdit(note)}
    >
      {/* Delete button */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
        disabled={deleting}
        className="absolute right-2 top-2 rounded-lg p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/10"
        title="Excluir nota"
      >
        {deleting
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : <Trash2 className="h-3.5 w-3.5" />
        }
      </button>

      {/* Title */}
      {note.title && (
        <p className="mb-2 pr-6 text-sm font-semibold leading-snug">{note.title}</p>
      )}

      {/* Content */}
      <p className="flex-1 whitespace-pre-wrap text-sm leading-relaxed opacity-90 line-clamp-6">
        {note.content}
      </p>

      {/* Footer: date */}
      <p className="mt-3 text-[10px] opacity-50">
        {formatNoteDateBR(note.updatedAt)}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NoteDialog — criar ou editar
// ---------------------------------------------------------------------------
interface NoteDialogProps {
  note?: Note;          // undefined = criar nova
  initialColor?: string;
  onClose: () => void;
  onSave: (data: CreateNoteInput) => Promise<void>;
  onDelete?: () => Promise<void>;
  saving: boolean;
  deleting: boolean;
}

function NoteDialog({ note, initialColor, onClose, onSave, onDelete, saving, deleting }: NoteDialogProps) {
  const [title, setTitle]     = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [color, setColor]     = useState(note?.color ?? initialColor ?? DEFAULT_COLOR);
  const contentRef            = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    contentRef.current?.focus();
  }, []);

  async function handleSave() {
    if (!content.trim()) return;
    await onSave({ title: title.trim() || undefined, content: content.trim(), color });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative z-10 w-full max-w-md rounded-2xl p-5 shadow-2xl"
        style={{ backgroundColor: color }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-1.5 hover:bg-black/10 transition-colors"
        >
          <X className="h-4 w-4 text-slate-600" />
        </button>

        {/* Title */}
        <input
          type="text"
          placeholder="Título (opcional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mb-2 w-full bg-transparent text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none pr-8"
          autoComplete="off"
        />

        {/* Divider */}
        <div className="mb-3 h-px bg-black/10" />

        {/* Content */}
        <textarea
          ref={contentRef}
          placeholder="Escreva sua anotação..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          className="w-full resize-none bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none leading-relaxed"
        />

        {/* Footer: color picker + actions */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <ColorPicker value={color} onChange={setColor} />

          <div className="flex items-center gap-2 shrink-0">
            {onDelete && (
              <button
                onClick={onDelete}
                disabled={deleting}
                className="rounded-xl px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Excluir"}
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !content.trim()}
              className="rounded-xl bg-[#0A5BC4] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#094FA8] disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// QuickAdd — barra de criação rápida no topo
// ---------------------------------------------------------------------------
function QuickAdd({ onOpen }: { onOpen: (color: string) => void }) {
  return (
    <button
      onClick={() => onOpen(DEFAULT_COLOR)}
      className="flex w-full max-w-xl items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-400 shadow-sm hover:shadow-md transition-shadow"
    >
      <Plus className="h-4 w-4 shrink-0" />
      Fazer uma anotação...
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function NotesPage() {
  const { data: notes = [], isLoading } = useNotes();
  const createMutation = useCreateNote();
  const updateMutation = useUpdateNote();
  const deleteMutation = useDeleteNote();

  const [search, setSearch]           = useState("");
  const [dialogNote, setDialogNote]   = useState<Note | null | "new">(null); // null = fechado, "new" = nova, Note = editar
  const [newColor, setNewColor]       = useState(DEFAULT_COLOR);
  const [deletingId, setDeletingId]   = useState<string | null>(null);

  const filtered = notes.filter((n) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      n.content.toLowerCase().includes(q) ||
      (n.title ?? "").toLowerCase().includes(q)
    );
  });

  function openNew(color: string) {
    setNewColor(color);
    setDialogNote("new");
  }

  function openEdit(note: Note) {
    setDialogNote(note);
  }

  function closeDialog() {
    setDialogNote(null);
  }

  async function handleCreate(data: CreateNoteInput) {
    try {
      await createMutation.mutateAsync(data);
      toast({ title: "Nota criada!" });
      closeDialog();
    } catch {
      toast({ title: "Erro ao criar nota.", variant: "destructive" });
    }
  }

  async function handleUpdate(id: string, data: CreateNoteInput) {
    try {
      await updateMutation.mutateAsync({ id, data });
      toast({ title: "Nota salva!" });
      closeDialog();
    } catch {
      toast({ title: "Erro ao salvar nota.", variant: "destructive" });
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: "Nota excluída." });
      closeDialog();
    } catch {
      toast({ title: "Erro ao excluir.", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  }

  const isEditing = dialogNote !== null && dialogNote !== "new";
  const editNote  = isEditing ? (dialogNote as Note) : undefined;

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-yellow-100">
            <StickyNote className="h-5 w-5 text-yellow-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Anotações</h1>
            <p className="text-sm text-slate-500">
              {notes.length > 0 ? `${notes.length} nota${notes.length > 1 ? "s" : ""}` : "Nenhuma nota ainda"}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar notas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-56 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0A5BC4]/30"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="h-3.5 w-3.5 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* Quick add */}
      <QuickAdd onOpen={openNew} />

      {/* Notes grid */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-50">
            <StickyNote className="h-8 w-8 text-yellow-300" />
          </div>
          <p className="font-medium text-slate-500">
            {search ? "Nenhuma nota encontrada" : "Nenhuma anotação ainda"}
          </p>
          {!search && (
            <p className="text-sm text-slate-400">
              Clique em "Fazer uma anotação..." para começar.
            </p>
          )}
        </div>
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
          {filtered.map((note) => (
            <div key={note.id} className="mb-4 break-inside-avoid">
              <NoteCard
                note={note}
                onEdit={openEdit}
                onDelete={handleDelete}
                deleting={deletingId === note.id}
              />
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      {dialogNote !== null && (
        dialogNote === "new" ? (
          <NoteDialog
            initialColor={newColor}
            onClose={closeDialog}
            onSave={handleCreate}
            saving={createMutation.isPending}
            deleting={false}
          />
        ) : (
          <NoteDialog
            note={editNote}
            onClose={closeDialog}
            onSave={(data) => handleUpdate(editNote!.id, data)}
            onDelete={() => handleDelete(editNote!.id)}
            saving={updateMutation.isPending}
            deleting={deletingId === editNote?.id}
          />
        )
      )}
    </div>
  );
}
