import { Link } from 'react-router-dom'
import { ChevronRight, Landmark } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useDepartmentCouncils } from '@/hooks/useDepartments'
import { TabShell } from './TabShell'

/** Conselhos vinculados ao setor. Cada linha navega para o conselho. */
export function CouncilsTab({ departmentId }: { departmentId: string }) {
  const { data, isLoading, isError } = useDepartmentCouncils(departmentId)

  return (
    <TabShell
      isLoading={isLoading}
      isError={isError}
      items={data}
      errorMessage="Não foi possível carregar os conselhos deste setor."
      empty={{
        icon: Landmark,
        title: 'Nenhum conselho vinculado',
        description:
          'Os conselhos municipais ligados a esta secretaria aparecem aqui. O vínculo é feito na tela do próprio conselho.',
      }}
    >
      {councils => (
        <div className="border rounded-xl overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-24">Sigla</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">Base legal</TableHead>
                <TableHead className="w-24 text-center">Situação</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {councils.map(council => (
                <TableRow key={council.id} className="group">
                  <TableCell className="font-medium text-slate-700">
                    {council.acronym ?? '—'}
                  </TableCell>
                  <TableCell>
                    {/* Navega para o CONSELHO, não para o registro de vínculo:
                        o id da ligação não leva a lugar nenhum. */}
                    <Link
                      to={`/conselhos/${council.id}`}
                      className="text-slate-900 hover:text-blue-600 hover:underline"
                    >
                      {council.name}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-slate-500 text-sm">
                    {council.legalBasis ?? '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    {council.isActive ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
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
