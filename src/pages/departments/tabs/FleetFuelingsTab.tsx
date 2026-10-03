import { Badge } from '@/components/ui/badge'
import { Fuel } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useFleetFuelings } from '@/hooks/useFleetFuelings'
import { TabShell } from './TabShell'

function formatCurrency(value: string): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' }).format(
    new Date(value)
  )
}

/** Abastecimentos imputados ao setor. */
export function FleetFuelingsTab({ departmentId }: { departmentId: string }) {
  const { data, isLoading, isError } = useFleetFuelings({ departmentId, limit: 50 })

  return (
    <TabShell
      isLoading={isLoading}
      isError={isError}
      items={data?.data}
      errorMessage="Não foi possível carregar os abastecimentos deste setor."
      empty={{
        icon: Fuel,
        title: 'Nenhum abastecimento vinculado',
        description:
          'Os abastecimentos da frota desta secretaria aparecem aqui. O setor é escolhido no registro do abastecimento.',
      }}
    >
      {fuelings => (
        <div className="border rounded-xl overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-24">Data</TableHead>
                <TableHead className="w-28">Placa</TableHead>
                <TableHead className="hidden sm:table-cell text-right w-24">Litros</TableHead>
                <TableHead className="hidden md:table-cell text-right w-28">Odômetro</TableHead>
                <TableHead className="w-28">Situação</TableHead>
                <TableHead className="w-28 text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fuelings.map(fueling => (
                <TableRow key={fueling.id}>
                  <TableCell className="text-xs text-slate-500">
                    {formatDate(fueling.date)}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-slate-800">
                    {fueling.licensePlate}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-right tabular-nums text-slate-600">
                    {Number(fueling.liters).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 3,
                    })}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-right tabular-nums text-slate-600">
                    {fueling.odometer.toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    {/* Abastecimento não tem o ciclo de três estados da diária:
                        ou o documento foi emitido, ou ainda é rascunho. */}
                    {fueling.sha256Hash ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                        Emitido
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Rascunho</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-slate-700">
                    {formatCurrency(fueling.totalValue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </TabShell>
  )
}
