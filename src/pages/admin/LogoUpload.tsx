import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { ImageOff, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";

/**
 * Upload da logo da organização — white-label (Épico 3, FE.4).
 *
 * Restrito ao Super Admin: a logo carimba a autoria de documentos oficiais, e o
 * backend recusa quem não for super admin com HTTP 403.
 *
 * SOMENTE PNG E JPEG, e não "imagens" em geral: o gerador de PDF embute apenas
 * esses dois formatos. Aceitar WebP ou GIF faria o upload passar e a logo
 * simplesmente não aparecer no documento — uma falha silenciosa que só seria
 * descoberta ao conferir um PDF já emitido.
 */

const ACCEPTED_TYPES = ["image/png", "image/jpeg"] as const;
const MAX_BYTES = 2 * 1024 * 1024;

/** Mesma regra do backend, verificada aqui para o retorno ser imediato. */
const logoSchema = z
  .instanceof(File, { message: "Selecione um arquivo." })
  .refine(file => ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number]), {
    message: "A logo deve estar em PNG ou JPEG.",
  })
  .refine(file => file.size > 0, { message: "O arquivo está vazio." })
  .refine(file => file.size <= MAX_BYTES, {
    message: "A logo deve ter no máximo 2 MB.",
  });

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

/**
 * Monta a URL pública a partir do fileKey.
 *
 * O banco guarda a CHAVE do arquivo, não uma URL absoluta — uma URL gravada
 * apodreceria ao mudar o domínio entre ambientes. A montagem acontece aqui, na
 * leitura.
 */
function buildLogoUrl(fileKey: string): string {
  return `${API_URL}/uploads/${fileKey}`;
}

interface Props {
  organizationId: string;
  /** fileKey da logo atual, ou null quando não há. */
  logoUrl?: string | null;
}

export function LogoUpload({ organizationId, logoUrl }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const inputRef = useRef<HTMLInputElement>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);

      // Sem Content-Type manual: o navegador precisa definir o boundary do
      // multipart, e defini-lo à mão quebraria o parsing no servidor.
      return apiRequest(`/api/v1/admin/organizations/${organizationId}/logo`, {
        method: "POST",
        body: form,
      });
    },
    onSuccess: () => {
      toast({
        title: "Logo atualizada com sucesso.",
        description: "Os próximos documentos emitidos já sairão com a nova marca.",
      });
      // Mesma chave usada por AdminOrganizationDetailPage.
      queryClient.invalidateQueries({ queryKey: ["admin", "organizations", organizationId] });
    },
    onError: (error: unknown) => {
      const message =
        (error as { message?: string })?.message ??
        "Não foi possível enviar a logo. Tente novamente.";
      toast({ title: message, variant: "destructive" });
    },
  });

  const remove = useMutation({
    mutationFn: () =>
      apiRequest(`/api/v1/admin/organizations/${organizationId}/logo`, { method: "DELETE" }),
    onSuccess: () => {
      setPreview(null);
      toast({ title: "Logo removida." });
      // Mesma chave usada por AdminOrganizationDetailPage.
      queryClient.invalidateQueries({ queryKey: ["admin", "organizations", organizationId] });
    },
    onError: () => {
      toast({ title: "Não foi possível remover a logo.", variant: "destructive" });
    },
  });

  function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Permite reenviar o mesmo arquivo depois de um erro: sem limpar o valor, o
    // input não dispara change para a mesma seleção.
    event.target.value = "";

    if (!file) return;

    const result = logoSchema.safeParse(file);
    if (!result.success) {
      setValidationError(result.error.issues[0]?.message ?? "Arquivo inválido.");
      setPreview(null);
      return;
    }

    setValidationError(null);
    setPreview(URL.createObjectURL(file));
    upload.mutate(file);
  }

  const currentLogo = preview ?? (logoUrl ? buildLogoUrl(logoUrl) : null);
  const busy = upload.isPending || remove.isPending;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-24 w-40 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {currentLogo ? (
            <img
              src={currentLogo}
              alt="Logo da organização"
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-slate-400">
              <ImageOff className="h-6 w-6" aria-hidden="true" />
              <span className="text-xs">Sem logo</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              {upload.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {logoUrl ? "Substituir logo" : "Enviar logo"}
            </Button>

            {logoUrl && (
              <Button variant="ghost" onClick={() => remove.mutate()} disabled={busy}>
                {remove.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4 text-red-600" />
                )}
                Remover
              </Button>
            )}
          </div>

          <p className="text-xs text-slate-500">
            PNG ou JPEG, até 2 MB. A logo aparece no cabeçalho dos documentos
            oficiais emitidos por esta organização.
          </p>

          {validationError && (
            <p className="text-sm text-red-600">{validationError}</p>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={handleFileSelected}
      />
    </div>
  );
}
