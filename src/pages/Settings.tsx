import { useEffect, useRef, useState } from "react";
import { Loader2, Save, Building2, ImagePlus, Trash2, ImageIcon } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { API_URL } from "@/lib/api";

export default function Settings() {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const { user, refreshUser } = useAuth();

    const [settings, setSettings] = useState({
        MayorName: "",
        CityAddress: "",
        CoatOfArmsUrl: ""
    });

    // Logo Upload State
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [removingLogo, setRemovingLogo] = useState(false);
    const logoInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    // Carrega a logo atual do usuário
    useEffect(() => {
        const logoUrl = (user?.metadata as any)?.logoUrl;
        if (logoUrl) {
            setLogoPreview(`${API_URL}${logoUrl}`);
        }
    }, [user]);

    async function fetchSettings() {
        setLoading(true);
        try {
            const data = await apiRequest<any>("/api/v1/settings/public");
            setSettings({
                MayorName: data.MayorName || "",
                CityAddress: data.CityAddress || "",
                CoatOfArmsUrl: data.CoatOfArmsUrl || ""
            });
        } catch (error) {
            console.error("Failed to fetch settings", error);
            toast({ title: "Erro", description: "Falha ao carregar configurações.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        try {
            await apiRequest("/api/v1/settings", {
                method: "PUT",
                body: JSON.stringify(settings)
            });
            toast({ title: "Sucesso", description: "Configurações salvas." });
        } catch (error) {
            console.error("Failed to save settings", error);
            toast({ title: "Erro", description: "Falha ao salvar configurações.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    }

    async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (!allowed.includes(file.type)) {
            toast({ title: "Tipo inválido", description: "Envie uma imagem JPEG, PNG, WebP ou GIF.", variant: "destructive" });
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast({ title: "Arquivo muito grande", description: "Limite: 5MB.", variant: "destructive" });
            return;
        }

        // Prévia local imediata
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
            toast({ title: "Logo atualizada!", description: "A logo será usada nos documentos gerados." });
        } catch (error: any) {
            toast({ title: "Erro no upload", description: error?.message || "Falha ao enviar logo.", variant: "destructive" });
            setLogoPreview(null);
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
            toast({ title: "Erro", description: error?.message || "Falha ao remover logo.", variant: "destructive" });
        } finally {
            setRemovingLogo(false);
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-10">
            <div>
                <h1 className="text-3xl font-semibold text-slate-900">Configurações do Sistema</h1>
                <p className="text-slate-500 mt-1">Defina as informações globais para os documentos.</p>
            </div>

            {/* ── LOGO INSTITUCIONAL ─────────────────────────────── */}
            <Card className="rounded-2xl border-slate-200 shadow-sm">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-50 grid place-items-center text-blue-500">
                            <ImageIcon className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle>Logo Institucional</CardTitle>
                            <CardDescription>
                                Sua logo será inserida automaticamente no cabeçalho dos documentos gerados por você.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                        {/* Prévia */}
                        <div className="flex-shrink-0 h-32 w-48 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                            {logoPreview ? (
                                <img
                                    src={logoPreview}
                                    alt="Logo institucional"
                                    className="h-full w-full object-contain p-2"
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-slate-400">
                                    <ImagePlus className="h-8 w-8" />
                                    <span className="text-xs text-center">Nenhuma logo</span>
                                </div>
                            )}
                        </div>

                        {/* Ações */}
                        <div className="flex flex-col gap-3">
                            <p className="text-sm text-slate-500">
                                Formatos aceitos: <strong>PNG, JPEG, WebP, GIF</strong> — Tamanho máximo: <strong>5 MB</strong>
                            </p>
                            <div className="flex gap-2">
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
                                    disabled={uploadingLogo}
                                    onClick={() => logoInputRef.current?.click()}
                                    className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                                >
                                    {uploadingLogo
                                        ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</>
                                        : <><ImagePlus className="mr-2 h-4 w-4" />{logoPreview ? "Trocar Logo" : "Enviar Logo"}</>
                                    }
                                </Button>
                                {logoPreview && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        disabled={removingLogo}
                                        onClick={handleRemoveLogo}
                                        className="text-red-600 hover:bg-red-50"
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
                </CardContent>
            </Card>

            {/* ── CABEÇALHO DE DOCUMENTOS (global) ─────────────── */}
            <Card className="rounded-2xl border-slate-200 shadow-sm">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-100 grid place-items-center text-slate-500">
                            <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle>Cabeçalho de Documentos</CardTitle>
                            <CardDescription>Essas informações aparecerão no topo de todos os documentos oficiais.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                        </div>
                    ) : (
                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Nome da Prefeitura / Órgão</Label>
                                    <Input
                                        placeholder="Ex: PREFEITURA MUNICIPAL DE EXEMPLO"
                                        value={settings.MayorName}
                                        onChange={e => setSettings(s => ({ ...s, MayorName: e.target.value }))}
                                    />
                                    <p className="text-xs text-slate-400">Aparece em destaque no topo.</p>
                                </div>

                                <div className="space-y-2">
                                    <Label>URL do Brasão</Label>
                                    <Input
                                        placeholder="https://..."
                                        value={settings.CoatOfArmsUrl}
                                        onChange={e => setSettings(s => ({ ...s, CoatOfArmsUrl: e.target.value }))}
                                    />
                                    <p className="text-xs text-slate-400">Link direto para a imagem do brasão.</p>
                                </div>

                                <div className="col-span-1 md:col-span-2 space-y-2">
                                    <Label>Endereço Completo</Label>
                                    <Input
                                        placeholder="Rua Exemplo, 123, Centro, Cidade-UF"
                                        value={settings.CityAddress}
                                        onChange={e => setSettings(s => ({ ...s, CityAddress: e.target.value }))}
                                    />
                                </div>
                            </div>

                            {settings.MayorName && (
                                <div className="mt-6 p-6 border rounded-xl bg-white shadow-sm flex flex-col items-center text-center space-y-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Prévia do Cabeçalho</span>

                                    {settings.CoatOfArmsUrl && (
                                        <img src={settings.CoatOfArmsUrl} alt="Brasão" className="h-16 w-16 object-contain mb-2" />
                                    )}
                                    <h3 className="font-bold text-slate-900 uppercase">{settings.MayorName}</h3>
                                    <p className="text-sm text-slate-500">{settings.CityAddress}</p>
                                </div>
                            )}

                            <Separator />

                            <div className="flex justify-end">
                                <Button type="submit" disabled={saving} className="bg-[#0A5BC4] hover:bg-[#094FA8]">
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    <Save className="mr-2 h-4 w-4" />
                                    Salvar Configurações
                                </Button>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}


