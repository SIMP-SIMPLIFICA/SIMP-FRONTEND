import { Link } from 'react-router-dom'
import { ChevronRight, Handshake } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useDepartmentCovenants } from '@/hooks/useDepartments'
import { TabShell } from './TabShell'

/** Valor em BRL. O Decimal do Prisma chega como string. */
function formatCurrency(value: string | null): string {
  if (!value) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  // `timeZone: 'UTC'` porque a data vem sem hora: sem isso, um fuso a oeste
  // exibiria o dia anterior.
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' }).format(
    new Date(value)
  )
}

/** Convênios imputados ao setor. */
export function CovenantsTab({ departmentId }: { departmentId: string }) {
  const { data, isLoading, isError } = useDepartmentCovenants(departmentId)

  return (
    <TabShell
      isLoading={isLoading}
      isError={isError}
      items={data}
      errorMessage="Não foi possível carregar os convênios deste setor."
      empty={{
        icon: Handshake,
        title: 'Nenhum convênio vinculado',
        description:
          'Os convênios cuja execução é desta secretaria aparecem aqui. O setor é escolhido no cadastro do convênio.',
      }}
    >
      {covenants => (
        <div className="border rounded-xl overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-32">Número</TableHead>
                <TableHead>Objeto</TableHead>
                <TableHead className="w-32 text-right hidden sm:table-cell">Valor</TableHead>
                <TableHead className="w-28 hidden md:table-cell">Vigência</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {covenants.map(covenant => (
                <TableRow key={covenant.id} className="group">
                  <TableCell className="font-medium">
                    {/* Não existe rota de detalhe de convênio — o detalhe é uma
                        gaveta dentro da listagem. O link leva à listagem já
                        filtrada pelo número, que é a navegação possível hoje. */}
                    <Link
                      to={`/convenios?busca=${encodeURIComponent(covenant.number)}`}
                      className="text-slate-900 hover:text-blue-600 hover:underline"
                    >
                      {covenant.number}
                    </Link>
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm max-w-md truncate">
                    {covenant.processObject}
                  </TableCell>
                  <TableCell className="text-right hidden sm:table-cell tabular-nums text-slate-700">
                    {formatCurrency(covenant.transferValue)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-slate-500">
                    {formatDate(covenant.validityEndDate)}
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500" />
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
