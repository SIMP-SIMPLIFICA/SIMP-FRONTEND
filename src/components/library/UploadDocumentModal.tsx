import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload, X, Loader2, ShieldCheck } from "lucide-react";
import { libraryService } from "@/lib/api/library";
import { toast } from "@/hooks/use-toast";

type Props = { open: boolean; onOpenChange: (v: boolean) => void; onSuccess: () => void };

const LEVEL_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Nível 1 — Público interno", color: "bg-green-100 text-green-700 border-green-200" },
  2: { label: "Nível 2 — Restrito", color: "bg-amber-100 text-amber-700 border-amber-200" },
  3: { label: "Nível 3 — Confidencial", color: "bg-red-100 text-red-700 border-red-200" },
};

export function UploadDocumentModal({ open, onOpenChange, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [accessLevel, setAccessLevel] = useState(1);
  const [categoryId, setCategoryId] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["library", "categories"],
    queryFn: libraryService.listCategories,
    enabled: open,
    staleTime: 60_000,
  });

  function reset() {
    setFile(null);
    setTitle("");
    setAccessLevel(1);
    setCategoryId("");
  }

  function handleOpenChange(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    if (title.trim()) formData.append("title", title.trim());
    formData.append("accessLevel", String(accessLevel));
    if (categoryId) formData.append("categoryId", categoryId);

    setUploading(true);
    try {
      await libraryService.upload(formData);
      toast({ title: "Documento enviado com sucesso! O OCR será processado em breve." });
      onSuccess();
      handleOpenChange(false);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "Erro ao enviar documento.";
      toast({ title: "Erro no upload", description: msg, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" />
            Fazer Upload de Documento
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-1">
          {/* Dropzone */}
          <div
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              file ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-8 w-8 text-blue-600 shrink-0" />
                  <div className="text-left min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                    <p className="text-xs text-slate-400">{formatSize(file.size)}</p>
                  </div>
                </div>
                <button type="button" onClick={e => { e.stopPropagation(); setFile(null); }}>
                  <X className="h-4 w-4 text-slate-400 hover:text-red-500" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <FileText className="h-10 w-10" />
                <p className="text-sm font-medium">Clique para selecionar um PDF</p>
                <p className="text-xs">Máximo: 50 MB</p>
              </div>
            )}
          </div>

          {/* Título */}
          <div className="space-y-1.5">
            <Label>Título <span className="text-slate-400 text-xs">(opcional)</span></Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={file?.name.replace(".pdf", "") ?? "Título do documento"}
            />
          </div>

          {/* Categoria */}
          <div className="space-y-1.5">
            <Label>Categoria <span className="text-slate-400 text-xs">(opcional)</span></Label>
            <Select
              value={categoryId || "none"}
              onValueChange={v => setCategoryId(v === "none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sem categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem categoria</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
                {categories.length === 0 && (
                  <div className="px-3 py-2 text-xs text-slate-400 text-center">
                    Nenhuma categoria cadastrada.<br />Use "Categorias" no header para criar.
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Nível de Sigilo */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-slate-500" />
              Nível de Sigilo
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {([1, 2, 3] as const).map(level => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setAccessLevel(level)}
                  className={`border rounded-lg px-2 py-2.5 text-xs font-medium transition-all ${
                    accessLevel === level
                      ? LEVEL_LABELS[level].color + " border-current ring-2 ring-offset-1 ring-current/30"
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {LEVEL_LABELS[level].label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={uploading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!file || uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              Enviar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
