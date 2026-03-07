import { useEffect, useState } from "react";
import { Loader2, Save, Building2 } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface DocumentHeaderSettingsProps {
    onSaveSuccess?: () => void;
}

export function DocumentHeaderSettings({ onSaveSuccess }: DocumentHeaderSettingsProps) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [settings, setSettings] = useState({
        MayorName: "",
        CityAddress: "",
        CoatOfArmsUrl: ""
    });

    useEffect(() => {
        fetchSettings();
    }, []);

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
            if (onSaveSuccess) onSaveSuccess();
        } catch (error) {
            console.error("Failed to save settings", error);
            toast({ title: "Erro", description: "Falha ao salvar configurações.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-100 grid place-items-center text-slate-500">
                    <Building2 className="h-5 w-5" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-slate-900">Cabeçalho de Documentos</h3>
                    <p className="text-sm text-slate-500">Essas informações aparecerão no topo de todos os documentos oficiais.</p>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>Nome da Prefeitura / Órgão</Label>
                        <Input
                            placeholder="Ex: PREFEITURA MUNICIPAL DE EXEMPLO"
                            value={settings.MayorName}
                            onChange={e => setSettings(s => ({ ...s, MayorName: e.target.value }))}
                        />
                        <p className="text-[10px] text-slate-400">Aparece em destaque no topo.</p>
                    </div>

                    <div className="space-y-2">
                        <Label>URL do Brasão</Label>
                        <Input
                            placeholder="https://..."
                            value={settings.CoatOfArmsUrl}
                            onChange={e => setSettings(s => ({ ...s, CoatOfArmsUrl: e.target.value }))}
                        />
                        <p className="text-[10px] text-slate-400">Link direto para a imagem do brasão.</p>
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
                    <div className="mt-6 p-6 border rounded-xl bg-slate-50 flex flex-col items-center text-center space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Prévia do Cabeçalho</span>

                        {settings.CoatOfArmsUrl && (
                            <img src={settings.CoatOfArmsUrl} alt="Brasão" className="h-16 w-16 object-contain mb-2" />
                        )}
                        <h3 className="font-bold text-slate-900 uppercase text-sm">{settings.MayorName}</h3>
                        <p className="text-xs text-slate-500">{settings.CityAddress}</p>
                    </div>
                )}

                <Separator />

                <div className="flex justify-end gap-3">
                    <Button type="submit" disabled={saving} className="bg-blue-800 hover:bg-blue-900 text-white">
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Configurações
                    </Button>
                </div>
            </form>
        </div>
    );
}
