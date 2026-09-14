import { Link } from 'react-router-dom'
import { ChevronRight, Plane } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useDailyAllowances } from '@/hooks/useDailyAllowances'
import { TabShell } from './TabShell'

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Rascunho', className: 'bg-slate-100 text-slate-600' },
  ISSUED: { label: 'Emitida', className: 'bg-emerald-100 text-emerald-700' },
  ACCOUNTED: { label: 'Contas prestadas', className: 'bg-blue-100 text-blue-700' },
}

function formatCurrency(value: string): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' }).format(
    new Date(value)
  )
}

/** Diárias imputadas ao setor. */
export function DailyAllowancesTab({ departmentId }: { departmentId: string }) {
  // Filtra pelo setor no SERVIDOR: trazer tudo e filtrar na tela mostraria só
  // o que coube na primeira página.
  const { data, isLoading, isError } = useDailyAllowances({ departmentId, limit: 50 })

  return (
    <TabShell
      isLoading={isLoading}
      isError={isError}
      items={data?.data}
      errorMessage="Não foi possível carregar as diárias deste setor."
      empty={{
        icon: Plane,
        title: 'Nenhuma diária vinculada',
        description:
          'As diárias cuja despesa corre por esta secretaria aparecem aqui. O setor é escolhido na abertura da diária.',
      }}
    >
      {allowances => (
        <div className="border rounded-xl overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-24">Saída</TableHead>
                <TableHead>Servidor</TableHead>
                <TableHead className="hidden md:table-cell">Destino</TableHead>
                <TableHead className="w-40">Situação</TableHead>
                <TableHead className="w-28 text-right hidden sm:table-cell">Valor</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {allowances.map(allowance => {
                const status = STATUS_LABELS[allowance.status ?? 'PENDING']
                return (
                  <TableRow key={allowance.id} className="group">
                    <TableCell className="text-xs text-slate-500">
                      {formatDate(allowance.departureDate)}
                    </TableCell>
                    <TableCell className="font-medium text-slate-800">
                      <Link
                        to={`/daily-allowances?busca=${encodeURIComponent(allowance.beneficiaryName)}`}
                        className="hover:text-blue-600 hover:underline"
                      >
                        {allowance.beneficiaryName}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-slate-600">
                      {allowance.destination}
                    </TableCell>
                    <TableCell className="space-x-1">
                      <Badge className={`${status.className} hover:${status.className}`}>
                        {status.label}
                      </Badge>
                      {/* Alertas LIDOS da API, nunca recalculados aqui: o prazo
                          não pode depender do relógio do computador do usuário. */}
                      {allowance.isLate && (
                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Atrasada</Badge>
                      )}
                      {allowance.budgetOverrun && (
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                          Estouro
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right hidden sm:table-cell tabular-nums text-slate-700">
                      {formatCurrency(allowance.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500" />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </TabShell>
  )
}
