import { useEffect, useState } from "react";
import { Smartphone, LogOut, Loader2, RefreshCw } from "lucide-react";

import { apiRequest } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { useMe } from "@/hooks/useMe";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/utils";

type ApiSession = {
  id: string;
  ipAddress: string;
  deviceName: string;
  lastUsedAt: string;
  isCurrent: boolean;
};

type SessionResponse = {
  sessions: ApiSession[];
};

type ProfileUser = {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  jobTitle?: string;
};

export default function Profile() {
  const { data: meData, refetch: refreshMe } = useMe();

  const user = meData?.user as ProfileUser | undefined;

  const [activeTab, setActiveTab] = useState("general");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passLoading, setPassLoading] = useState(false);

  const [sessions, setSessions] = useState<ApiSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setUsername(user.username || "");
      setJobTitle(user.jobTitle || "");
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === "sessions") {
      void fetchSessions();
    }
  }, [activeTab]);

  const [avatarLoading, setAvatarLoading] = useState(false);

  async function handleAvatarClick() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png, image/jpeg";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        toast({ title: "Arquivo muito grande", description: "O avatar deve ter no máximo 2MB.", variant: "destructive" });
        return;
      }

      try {
        setAvatarLoading(true);

        const formData = new FormData();
        formData.append("file", file);

        const uploadRes = await apiRequest<{ fileUrl: string }>("/api/v1/upload", {
          method: "POST",
          body: formData,
        });

        const avatarUrl = uploadRes.fileUrl;

        await apiRequest("/api/v1/auth/profile", {
          method: "PUT",
          body: JSON.stringify({
            firstName,
            lastName,
            username,
            jobTitle,
            avatar: avatarUrl
          }),
        });

        toast({ title: "Avatar atualizado", description: "Sua foto de perfil foi alterada com sucesso." });
        refreshMe();
      } catch (err: any) {
        toast({ title: "Erro no upload", description: err.message || "Não foi possível carregar a imagem.", variant: "destructive" });
      } finally {
        setAvatarLoading(false);
      }
    };
    input.click();
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    try {
      setProfileLoading(true);
      await apiRequest("/api/v1/auth/profile", {
        method: "PUT",
        body: JSON.stringify({ firstName, lastName, username, jobTitle }),
      });
      toast({ title: "Perfil atualizado", description: "Suas informações foram salvas." });
      refreshMe();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Erro", description: "As novas senhas não conferem.", variant: "destructive" });
      return;
    }
    try {
      setPassLoading(true);
      await apiRequest("/api/v1/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      toast({ title: "Sucesso", description: "Sua senha foi alterada." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setPassLoading(false);
    }
  }

  async function fetchSessions() {
    setSessionsLoading(true);
    try {
      const res = await apiRequest<SessionResponse>("/api/v1/auth/sessions");
      setSessions(res.sessions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSessionsLoading(false);
    }
  }

  async function revokeSession(id: string) {
    try {
      await apiRequest(`/api/v1/auth/sessions/${id}`, { method: "DELETE" });
      toast({ title: "Sessão encerrada" });
      void fetchSessions();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  }

  async function revokeAllOthers() {
    try {
      await apiRequest("/api/v1/auth/sessions", { method: "DELETE" });
      toast({ title: "Sucesso", description: "Todas as outras sessões foram encerradas." });
      void fetchSessions();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  }

  if (!user) return null;

  const initials = (user.firstName?.[0] || "U") + (user.lastName?.[0] || "");

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Minha Conta</h1>
        <p className="text-slate-500 mt-1">Gerencie suas informações pessoais e segurança.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
          <TabsTrigger value="sessions">Sessões</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>Atualize seus dados básicos de identificação.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <Avatar
                      key={user.avatar}
                      className="h-20 w-20 border-2 border-slate-100 transition-opacity group-hover:opacity-80"
                    >
                      <AvatarImage src={getAvatarUrl(user.avatar)} />
                      <AvatarFallback className="bg-[#0A5BC4] text-white text-xl">{initials}</AvatarFallback>
                    </Avatar>
                    {avatarLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-full">
                        <Loader2 className="h-6 w-6 animate-spin text-[#0A5BC4]" />
                      </div>
                    )}
                  </div>
                  <div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleAvatarClick}
                      disabled={avatarLoading}
                    >
                      {avatarLoading ? "Carregando..." : "Alterar Avatar"}
                    </Button>
                    <p className="text-xs text-slate-400 mt-2">Apenas JPG ou PNG. Máx 2MB.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input value={firstName} onChange={e => setFirstName(e.target.value)} disabled={profileLoading} />
                  </div>
                  <div className="space-y-2">
                    <Label>Sobrenome</Label>
                    <Input value={lastName} onChange={e => setLastName(e.target.value)} disabled={profileLoading} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Nome de Usuário</Label>
                  <Input value={username} onChange={e => setUsername(e.target.value)} disabled={profileLoading} />
                </div>

                <div className="space-y-2">
                  <Label>Cargo / Função</Label>
                  <Input
                    value={jobTitle}
                    onChange={e => setJobTitle(e.target.value)}
                    disabled={profileLoading}
                    placeholder="Ex: Prefeito, Secretário, Gerente..."
                  />
                  <p className="text-xs text-slate-400">Este cargo aparecerá na assinatura dos seus documentos.</p>
                </div>

                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input value={user.email} disabled className="bg-slate-50 text-slate-500" />
                  <p className="text-xs text-slate-400">O e-mail não pode ser alterado diretamente.</p>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={profileLoading} className="bg-[#0A5BC4] hover:bg-[#094FA8]">
                    {profileLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Alterações
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Alterar Senha</CardTitle>
              <CardDescription>Recomendamos usar uma senha forte e única.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label>Senha Atual</Label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>

                <Separator className="my-2" />

                <div className="space-y-2">
                  <Label>Nova Senha</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Confirmar Nova Senha</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>

                <div className="pt-2">
                  <Button type="submit" disabled={passLoading || !currentPassword} className="w-full sm:w-auto">
                    {passLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Atualizar Senha
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Dispositivos Conectados</CardTitle>
                  <CardDescription>Gerencie onde sua conta está logada.</CardDescription>
                </div>
                <Button variant="secondary" size="sm" onClick={() => void fetchSessions()} disabled={sessionsLoading}>
                  <RefreshCw className={`h-4 w-4 ${sessionsLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sessions.length === 0 && !sessionsLoading && (
                  <div className="text-center py-6 text-slate-500">Nenhuma informação de sessão disponível.</div>
                )}

                {sessions.map(session => (
                  <div key={session.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-slate-200 grid place-items-center text-slate-500">
                        <Smartphone className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900 flex items-center gap-2">
                          {session.deviceName || "Dispositivo Desconhecido"}
                          {session.isCurrent && (
                            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">ATUAL</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {session.ipAddress} • {new Date(session.lastUsedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {!session.isCurrent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 mt-2 sm:mt-0"
                        onClick={() => revokeSession(session.id)}
                      >
                        Sair
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {sessions.length > 1 && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <Button variant="danger" onClick={() => void revokeAllOthers()} className="w-full sm:w-auto">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair de todos os outros dispositivos
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}