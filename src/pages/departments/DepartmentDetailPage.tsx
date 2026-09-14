import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  FileDown,
  FolderArchive,
  Fuel,
  Handshake,
  Landmark,
  Plane,
  Users,
  Wallet,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDepartment } from '@/hooks/useDepartments'
import { useMe } from '@/hooks/useMe'
import { hasAnyPermission } from '@/lib/permissions'
import { formatCnpj } from '@/utils/cnpj'
import { ExportDossierDialog } from './ExportDossierDialog'
import { CouncilsTab } from './tabs/CouncilsTab'
import { CovenantsTab } from './tabs/CovenantsTab'
import { VirtualProcessesTab } from './tabs/VirtualProcessesTab'
import { MembersTab } from './tabs/MembersTab'
import { DailyAllowancesTab } from './tabs/DailyAllowancesTab'
import { FleetFuelingsTab } from './tabs/FleetFuelingsTab'
import { BudgetTab } from './qdd/BudgetTab'

/**
 * Detalhe do Departamento (Épico 4, Fase 1).
 *
 * É PÁGINA, não gaveta: o endereço precisa ser compartilhável para que alguém
 * mande o link do setor a um colega, e o dossiê é consulta demorada — uma
 * gaveta lateral obrigaria a manter a listagem montada atrás o tempo todo.
 */

// ─── Cabeçalho ────────────────────────────────────────────────────────────────

/** Um dado do cabeçalho. Ausente vira travessão, nunca campo em branco. */
function HeaderField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">{label}</p>
      <p className="text-sm text-slate-800">{value || '—'}</p>
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="flex flex-col h-full max-w-screen-2xl mx-auto w-full">
      <div className="border-b border-slate-200 bg-white px-6 py-4 space-y-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-7 w-72" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
      <div className="px-6 py-4">
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function DepartmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [dossierOpen, setDossierOpen] = useState(false)

  const { data: me } = useMe()
  const canExport = hasAnyPermission(me, ['departments:read', 'departments:write'])
  const canWriteDepartment = hasAnyPermission(me, ['departments:write'])
  const { data: department, isLoading, isError } = useDepartment(id)

  if (isLoading) return <PageSkeleton />

  if (isError || !department) {
    return (
      <div className="flex flex-col h-full max-w-screen-2xl mx-auto w-full">
        <div className="border-b border-slate-200 bg-white px-6 py-4">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-slate-500 hover:text-slate-900 -ml-2"
            onClick={() => navigate('/departamentos')}
          >
            <ArrowLeft className="h-4 w-4" />
            Departamentos
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 py-20 text-slate-400">
          <AlertTriangle className="h-8 w-8 text-red-400" />
          <p className="text-sm font-medium text-slate-600">Departamento não encontrado.</p>
          <p className="text-xs">Ele pode ter sido excluído ou pertencer a outra organização.</p>
        </div>
      </div>
    )
  }

  // As contagens vêm na MESMA resposta do setor, de propósito: assim as abas
  // exibem o número sem que a tela precise buscar as três listas só para
  // descobrir que duas estão vazias.
  const counts = department._count ?? {}

  return (
    <div className="flex flex-col h-full max-w-screen-2xl mx-auto w-full">
      {/* ── Cabeçalho ── */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-slate-500 hover:text-slate-900 -ml-2 mb-3"
          onClick={() => navigate('/departamentos')}
        >
          <ArrowLeft className="h-4 w-4" />
          Departamentos
        </Button>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-semibold text-slate-900">{department.name}</h1>
                {department.isActive ? (
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                    Ativo
                  </Badge>
                ) : (
                  <Badge variant="secondary">Inativo</Badge>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {department.description || 'Secretaria ou setor oficial da organização'}
              </p>
            </div>
          </div>

          {canExport && (
            <Button variant="outline" className="gap-2" onClick={() => setDossierOpen(true)}>
              <FileDown className="h-4 w-4" />
              Exportar Dossiê
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5">
          <HeaderField label="Código" value={department.code} />
          <HeaderField label="CNPJ" value={formatCnpj(department.cnpj)} />
          <HeaderField label="Ordenador de despesa" value={department.chiefName} />
          <HeaderField
            label="Servidores lotados"
            value={String(counts.members ?? counts.users ?? 0)}
          />
        </div>
      </div>

      {/* ── Abas ── */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <Tabs defaultValue="members">
          {/* `flex-wrap`: são sete abas, e numa tela de notebook elas não cabem
              numa linha só — sem isso a última sairia da área visível. */}
          <TabsList className="mb-4 flex-wrap h-auto">
            <TabsTrigger value="members">
              <Users className="h-4 w-4 mr-1.5" />
              Servidores ({counts.members ?? counts.users ?? 0})
            </TabsTrigger>
            <TabsTrigger value="councils">
              <Landmark className="h-4 w-4 mr-1.5" />
              Conselhos ({counts.councils ?? 0})
            </TabsTrigger>
            <TabsTrigger value="covenants">
              <Handshake className="h-4 w-4 mr-1.5" />
              Convênios ({counts.covenants ?? 0})
            </TabsTrigger>
            <TabsTrigger value="processes">
              <FolderArchive className="h-4 w-4 mr-1.5" />
              Processos ({counts.virtualProcesses ?? 0})
            </TabsTrigger>
            {/* Diárias e abastecimentos não trazem contagem no rótulo: o
                `_count` do setor não as inclui, e exibir "(0)" antes de abrir a
                aba afirmaria que não há nenhuma — o que seria mentira. */}
            <TabsTrigger value="allowances">
              <Plane className="h-4 w-4 mr-1.5" />
              Diárias
            </TabsTrigger>
            <TabsTrigger value="fuelings">
              <Fuel className="h-4 w-4 mr-1.5" />
              Abastecimentos
            </TabsTrigger>
            <TabsTrigger value="budget">
              <Wallet className="h-4 w-4 mr-1.5" />
              Orçamento &amp; QDD ({counts.qddItems ?? 0})
            </TabsTrigger>
          </TabsList>

          {/* Cada aba busca a própria lista só quando aberta: o Radix não monta
              o conteúdo das abas inativas, então um setor com 300 processos não
              paga essa consulta para quem só quer ver os conselhos. */}
          <TabsContent value="members">
            <MembersTab departmentId={department.id} />
          </TabsContent>
          <TabsContent value="councils">
            <CouncilsTab departmentId={department.id} />
          </TabsContent>
          <TabsContent value="covenants">
            <CovenantsTab departmentId={department.id} />
          </TabsContent>
          <TabsContent value="processes">
            <VirtualProcessesTab departmentId={department.id} />
          </TabsContent>
          <TabsContent value="allowances">
            <DailyAllowancesTab departmentId={department.id} />
          </TabsContent>
          <TabsContent value="fuelings">
            <FleetFuelingsTab departmentId={department.id} />
          </TabsContent>
          <TabsContent value="budget">
            <BudgetTab departmentId={department.id} canWrite={canWriteDepartment} />
          </TabsContent>
        </Tabs>
      </div>

      <ExportDossierDialog
        open={dossierOpen}
        onOpenChange={setDossierOpen}
        department={department}
      />
    </div>
  )
}
