import { useEffect, useState } from "react";
import { Search, FolderOpen, CalendarClock, DollarSign, Settings } from "lucide-react"; // RefreshCw removido
import { apiRequest } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import type { Grant } from "@/types/grant";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { GrantDetailsDialog } from "@/components/grants/GrantDetailsDialog";
import { GrantConfigDialog } from "@/components/grants/GrantConfigDialog";

export default function Grants() {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedGrantId, setSelectedGrantId] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(false);

  useEffect(() => {
    fetchGrants();
  }, []);

  async function fetchGrants() {
    setLoading(true);
    try {
      const data = await apiRequest<Grant[]>("/api/v1/grants");
      setGrants(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function executeSync(filters: { startDate: string, endDate: string, status: string }) {
    setSyncing(true);
    try {
      const res = await apiRequest<{ created: number, updated: number, message?: string }>(
        "/api/v1/grants/sync", 
        { 
          method: "POST",
          body: JSON.stringify(filters) 
        }
      );
      
      toast({ 
        title: "Sincronização Concluída", 
        description: `Encontrados: ${res.created} novos, ${res.updated} atualizados.` 
      });
      fetchGrants();
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao sincronizar.", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  }

  function openDetails(id: string) {
    setSelectedGrantId(id);
    setDetailsOpen(true);
  }

  const filteredGrants = grants.filter(g => 
    g.objeto.toLowerCase().includes(search.toLowerCase()) || 
    g.numeroConvenio?.includes(search)
  );

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Convênios & Repasses</h1>
          <p className="text-slate-500 mt-1">Monitoramento Transferegov</p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={() => setConfigOpen(true)} 
            disabled={syncing}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
          >
            <Settings className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? "Sincronizando..." : "Configurar e Sincronizar"}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm max-w-xl">
        <Search className="h-5 w-5 text-slate-400 ml-2" />
        <Input 
          placeholder="Buscar por objeto ou número..." 
          className="border-0 focus-visible:ring-0 shadow-none bg-transparent"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-20 text-slate-400">Carregando dados...</div>
        ) : filteredGrants.length === 0 ? (
          <div className="col-span-full text-center py-20 text-slate-400 border-2 border-dashed rounded-xl">
            Nenhum convênio encontrado.<br/>
            Clique em "Configurar" para iniciar.
          </div>
        ) : (
          filteredGrants.map(grant => (
            <Card 
              key={grant.id} 
              className="group hover:shadow-md transition-all cursor-pointer border-slate-200 overflow-hidden relative"
              onClick={() => openDetails(grant.id)}
            >
              <div className={`absolute top-0 left-0 w-1 h-full ${
                grant.situacao.includes('Prestação de Contas') ? 'bg-amber-500' :
                grant.situacao.includes('Execução') ? 'bg-emerald-500' :
                'bg-slate-300'
              }`} />

              <CardContent className="p-5 pl-6">
                <div className="flex justify-between items-start mb-3">
                  <Badge variant="outline" className="font-mono text-xs text-slate-600">
                    {grant.numeroConvenio}
                  </Badge>
                  <Badge className={`
                    ${grant.situacao.includes('Execução') ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : 
                      grant.situacao.includes('Contas') ? 'bg-amber-100 text-amber-800 hover:bg-amber-100' : 
                      'bg-slate-100 text-slate-600 hover:bg-slate-100'}
                  `}>
                    {grant.situacao}
                  </Badge>
                </div>

                <h3 className="font-semibold text-slate-900 line-clamp-2 mb-4 h-[48px]" title={grant.objeto}>
                  {grant.objeto}
                </h3>

                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-slate-400">
                      <DollarSign className="h-4 w-4" /> Global
                    </span>
                    <span className="font-medium text-slate-900">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(grant.valorGlobal))}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-slate-400">
                      <CalendarClock className="h-4 w-4" /> Fim Vigência
                    </span>
                    <span>
                      {grant.dataFim ? new Date(grant.dataFim).toLocaleDateString('pt-BR') : 'N/A'}
                    </span>
                  </div>
                </div>
                
                {/* Uso do FolderOpen aqui */}
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 truncate max-w-[150px]" title={grant.orgaoConcedente}>
                    {grant.orgaoConcedente}
                  </span>
                  {grant._count?.notes ? (
                    <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                      <FolderOpen className="h-3 w-3" /> {grant._count.notes} notas
                    </span>
                  ) : (
                    <span className="text-slate-300 flex items-center gap-1">
                      <FolderOpen className="h-3 w-3" /> 0 notas
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <GrantDetailsDialog 
        open={detailsOpen} 
        onOpenChange={setDetailsOpen} 
        grantId={selectedGrantId} 
      />

      <GrantConfigDialog 
        open={configOpen}
        onOpenChange={setConfigOpen}
        onSuccess={executeSync} 
      />
    </div>
  );
}