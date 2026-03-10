import { useEffect, useRef, useState } from "react";
import { Loader2, ImagePlus, Trash2, ImageIcon } from "lucide-react";
import { apiRequest, API_URL } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

interface DocumentHeaderSettingsProps {
    onSaveSuccess?: () => void;
}

export function DocumentHeaderSettings({ onSaveSuccess }: DocumentHeaderSettingsProps) {
    const { user, refreshUser } = useAuth();
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [removingLogo, setRemovingLogo] = useState(false);
    const logoInputRef = useRef<HTMLInputElement>(null);

    // Carrega a logo atual do usuário ao abrir o modal
    useEffect(() => {
        const logoUrl = user?.metadata?.logoUrl;
        if (logoUrl) {
            setLogoPreview(`${API_URL}${logoUrl}`);
        } else {
            setLogoPreview(null);
        }
    }, [user]);

    async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (!allowed.includes(file.type)) {
            toast({ title: "Tipo inválido", description: "Envie uma imagem JPEG, PNG, WebP ou GIF.", variant: "destructive" });
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast({ title: "Arquivo muito grande", description: "Tamanho máximo: 5 MB.", variant: "destructive" });
            return;
        }

        // Prévia imediata
        setLogoPreview(URL.createObjectURL(file));
        setUploadingLogo(true);

        try {
            const formData = new FormData();
            formData.append("file", file);
            const result = await apiRequest<{ logoUrl: string }>("/api/v1/users/me/logo", {
                method: "POST",
                body: formData
            });
            setLogoPreview(`${API_URL}${result.logoUrl}`);
            if (refreshUser) await refreshUser();
            toast({ title: "Logo atualizada!", description: "Será usada automaticamente nos seus documentos." });
            if (onSaveSuccess) onSaveSuccess();
        } catch (error: any) {
            toast({ title: "Erro no upload", description: error?.message || "Não foi possível enviar a logo.", variant: "destructive" });
            setLogoPreview(user?.metadata?.logoUrl ? `${API_URL}${user.metadata.logoUrl}` : null);
        } finally {
            setUploadingLogo(false);
            e.target.value = "";
        }
    }

    async function handleRemoveLogo() {
        setRemovingLogo(true);
        try {
            await apiRequest("/api/v1/users/me/logo", { method: "DELETE" });
            setLogoPreview(null);
            if (refreshUser) await refreshUser();
            toast({ title: "Logo removida", description: "A logo institucional foi removida." });
        } catch (error: any) {
            toast({ title: "Erro", description: error?.message || "Não foi possível remover a logo.", variant: "destructive" });
        } finally {
            setRemovingLogo(false);
        }
    }

    return (
        <div className="space-y-5">
            {/* Cabeçalho da seção */}
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-50 grid place-items-center text-blue-500">
                    <ImageIcon className="h-5 w-5" />
                </div>
                <div>
                    <h3 className="text-base font-semibold text-slate-900">Logo Institucional</h3>
                    <p className="text-sm text-slate-500">
                        Sua logo será inserida automaticamente no cabeçalho dos documentos gerados por você.
                    </p>
                </div>
            </div>

            {/* Área de upload */}
            <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-xl border border-dashed border-slate-200 bg-slate-50">
                {/* Prévia */}
                <div className="flex-shrink-0 h-28 w-44 rounded-lg border-2 border-dashed border-slate-200 bg-white flex items-center justify-center overflow-hidden shadow-sm">
                    {logoPreview ? (
                        <img
                            src={logoPreview}
                            alt="Logo institucional"
                            className="h-full w-full object-contain p-2"
                            onError={() => setLogoPreview(null)}
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                            <ImagePlus className="h-7 w-7" />
                            <span className="text-xs text-center leading-tight">Nenhuma<br />logo</span>
                        </div>
                    )}
                </div>

                {/* Ações */}
                <div className="flex flex-col gap-3 flex-1">
                    <p className="text-sm text-slate-600">
                        {logoPreview
                            ? "✅ Logo configurada. Será usada em todos os seus documentos."
                            : "Nenhuma logo configurada. Faça o upload para personalizar seus documentos."}
                    </p>
                    <p className="text-xs text-slate-400">
                        Formatos: <strong>PNG, JPEG, WebP, GIF</strong> · Máx. <strong>5 MB</strong>
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleLogoUpload}
                        />
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={uploadingLogo || removingLogo}
                            onClick={() => logoInputRef.current?.click()}
                            className="bg-blue-600 text-white hover:bg-blue-700 border-0"
                        >
                            {uploadingLogo
                                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</>
                                : <><ImagePlus className="mr-2 h-4 w-4" />{logoPreview ? "Trocar Logo" : "Anexar Logo"}</>
                            }
                        </Button>

                        {logoPreview && (
                            <Button
                                type="button"
                                variant="ghost"
                                disabled={removingLogo || uploadingLogo}
                                onClick={handleRemoveLogo}
                                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            >
                                {removingLogo
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <><Trash2 className="mr-2 h-4 w-4" />Remover</>
                                }
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
