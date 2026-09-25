import { Link } from 'react-router-dom'
import { ChevronRight, FolderArchive } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useDepartmentVirtualProcesses } from '@/hooks/useDepartments'
import { formatCurrencyBRL } from '@/lib/currency'
import { TabShell } from './TabShell'

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' }).format(
    new Date(value)
  )
}

/** Processos virtuais do setor. */
export function VirtualProcessesTab({ departmentId }: { departmentId: string }) {
  const { data, isLoading, isError } = useDepartmentVirtualProcesses(departmentId)

  return (
    <TabShell
      isLoading={isLoading}
      isError={isError}
      items={data}
      errorMessage="Não foi possível carregar os processos virtuais deste setor."
      empty={{
        icon: FolderArchive,
        title: 'Nenhum processo virtual vinculado',
        description:
          'Os processos conduzidos por esta secretaria aparecem aqui. O setor é escolhido na abertura do processo.',
      }}
    >
      {processes => (
        <div className="border rounded-xl overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-32">Número</TableHead>
                <TableHead>Assunto</TableHead>
                <TableHead className="hidden md:table-cell">Empresa</TableHead>
                <TableHead className="w-28 hidden sm:table-cell">Início</TableHead>
                <TableHead className="w-32 text-right">Valor</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {processes.map(process => (
                <TableRow key={process.id} className="group">
                  <TableCell className="font-medium">
                    {/* Mesma limitação do convênio: sem rota de detalhe, o link
                        leva à listagem já filtrada pelo número. */}
                    <Link
                      to={`/processos-virtuais?busca=${encodeURIComponent(process.processNumber)}`}
                      className="text-slate-900 hover:text-blue-600 hover:underline"
                    >
                      {process.processNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm max-w-xs truncate" title={process.subject}>
                    {process.subject}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-slate-600 text-sm max-w-xs truncate">
                    {process.companyName ?? '—'}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-slate-500">
                    {formatDate(process.startDate)}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium text-slate-700 tabular-nums">
                    {formatCurrencyBRL(process.totalValue)}
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
