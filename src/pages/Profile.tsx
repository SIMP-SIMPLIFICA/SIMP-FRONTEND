import { useEffect, useState } from "react";
import { Smartphone, LogOut, Loader2, RefreshCw, Building2, FolderOpen } from "lucide-react";

import { apiRequest } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { useMe, type MeUser } from "@/hooks/useMe";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

// --- TYPES ---
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

export default function Profile() {
  const { data: meData, refetch: refreshMe } = useMe();
  const user = meData?.user as MeUser | undefined;

  const userDepartments = user?.departments ?? [];

  const [activeTab, setActiveTab] = useState("general");

  // --- GENERAL FORM STATES ---
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  // --- PASSWORD FORM STATES ---
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passLoading, setPassLoading] = useState(false);

  // --- SESSIONS STATES ---
  const [sessions, setSessions] = useState<ApiSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Load initial data
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setUsername(user.username || "");
    }
  }, [user]);

  // Load sessions when tab changes
  useEffect(() => {
    if (activeTab === "sessions") {
      void fetchSessions();
    }
  }, [activeTab]);

  // --- HANDLERS: PROFILE ---
  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    try {
      setProfileLoading(true);
      await apiRequest("/api/v1/auth/profile", {
        method: "PUT",
        body: JSON.stringify({ firstName, lastName, username }),
      });
      toast({ title: "Perfil atualizado", description: "Suas informações foram salvas." });
      refreshMe(); // Atualiza o contexto global
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setProfileLoading(false);
    }
  }

  // --- HANDLERS: PASSWORD ---
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setPassLoading(false);
    }
  }

  // --- HANDLERS: SESSIONS ---
  async function fetchSessions() {
    setSessionsLoading(true);
    try {
      const res = await apiRequest<SessionResponse>("/api/v1/auth/sessions");
      setSessions(res.sessions || []);
    } catch {
      // sessions fetch is non-critical
    } finally {
      setSessionsLoading(false);
    }
  }

  async function revokeSession(id: string) {
    try {
      await apiRequest(`/api/v1/auth/sessions/${id}`, { method: "DELETE" });
      toast({ title: "Sessão encerrada" });
      void fetchSessions();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  }

  async function revokeAllOthers() {
    try {
      await apiRequest("/api/v1/auth/sessions", { method: "DELETE" });
      toast({ title: "Sucesso", description: "Todas as outras sessões foram encerradas." });
      void fetchSessions();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

        {/* --- TAB: GENERAL --- */}
        <TabsContent value="general">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>Atualize seus dados básicos de identificação.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20 border-2 border-slate-100">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="bg-[#0A5BC4] text-white text-xl">{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                     <Button type="button" variant="outline" size="sm" disabled>Alterar Avatar</Button>
                     <p className="text-xs text-slate-400 mt-2">Apenas JPG ou PNG. Máx 2MB.</p>
                  </div>
                </div>

                {/* Organização e Departamento */}
                <div className="flex flex-wrap gap-3">
                  {user.organization?.name && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100">
                      <Building2 className="h-4 w-4 text-blue-500 shrink-0" />
                      <div>
                        <p className="text-[10px] text-blue-400 font-medium uppercase tracking-wide">Organização</p>
                        <p className="text-sm font-semibold text-blue-800">{user.organization.name}</p>
                      </div>
                    </div>
                  )}
                  {userDepartments.length > 0 ? userDepartments.map(dept => (
                    <div key={dept.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                      <FolderOpen className="h-4 w-4 text-slate-500 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Departamento</p>
                        <p className="text-sm font-semibold text-slate-800">
                          {dept.name}
                          <Badge variant="secondary" className="ml-2 text-[10px] py-0">{dept.code}</Badge>
                        </p>
                      </div>
                    </div>
                  )) : (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                      <FolderOpen className="h-4 w-4 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Departamento</p>
                        <p className="text-sm text-slate-400">Não vinculado</p>
                      </div>
                    </div>
                  )}
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

        {/* --- TAB: SECURITY --- */}
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

        {/* --- TAB: SESSIONS --- */}
        <TabsContent value="sessions">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Dispositivos Conectados</CardTitle>
                  <CardDescription>Gerencie onde sua conta está logada.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => void fetchSessions()} disabled={sessionsLoading}>
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
                  <Button variant="destructive" onClick={() => void revokeAllOthers()} className="w-full sm:w-auto">
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