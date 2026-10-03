import { Users } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useDepartmentMembers } from '@/hooks/useDepartments'
import { TabShell } from './TabShell'

/** Servidores lotados no setor. */
export function MembersTab({ departmentId }: { departmentId: string }) {
  const { data, isLoading, isError } = useDepartmentMembers(departmentId)

  return (
    <TabShell
      isLoading={isLoading}
      isError={isError}
      items={data}
      errorMessage="Não foi possível carregar os servidores deste setor."
      empty={{
        icon: Users,
        title: 'Nenhum servidor lotado',
        description:
          'A lotação é feita pelo botão "Ver / Adicionar" na listagem de departamentos.',
      }}
    >
      {members => (
        <div className="border rounded-xl overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Nome</TableHead>
                <TableHead className="hidden sm:table-cell">E-mail</TableHead>
                <TableHead className="w-32 hidden md:table-cell">Usuário</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map(member => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium text-slate-800">
                    {/* Servidores lotados NÃO são ofuscados: a lotação é
                        informação pública de organograma. */}
                    {[member.firstName, member.lastName].filter(Boolean).join(' ') || 'Sem nome'}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-slate-500">
                    {member.email}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-slate-500">
                    {member.username ?? '—'}
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
