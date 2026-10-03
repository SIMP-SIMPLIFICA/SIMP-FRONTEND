import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, ChevronRight, Loader2, Plus, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/hooks/use-toast'
import {
  useCouncilDepartments,
  useLinkCouncilDepartment,
  useUnlinkCouncilDepartment,
} from '@/hooks/useCouncils'
import { DepartmentSelect } from '@/components/departments/DepartmentSelect'

/**
 * Setores vinculados ao conselho (Épico 4).
 *
 * N:N livre: o mesmo `DepartmentSelect` usado em convênio e diária, aqui
 * ligando um setor já existente ao conselho — nunca criando um novo.
 */

interface Props {
  councilId: string
  canWrite: boolean
}

export function CouncilDepartmentsTab({ councilId, canWrite }: Props) {
  const [linkOpen, setLinkOpen] = useState(false)
  const [pendingUnlink, setPendingUnlink] = useState<string | null>(null)

  const { data: departments, isLoading, isError } = useCouncilDepartments(councilId)
  const linkMut = useLinkCouncilDepartment(councilId)
  const unlinkMut = useUnlinkCouncilDepartment(councilId)

  async function handleUnlink(departmentId: string) {
    setPendingUnlink(departmentId)
    try {
      await unlinkMut.mutateAsync(departmentId)
      toast({ title: 'Vínculo removido.' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Não foi possível remover o vínculo.'
      toast({ title: 'Erro', description: message, variant: 'destructive' })
    } finally {
      setPendingUnlink(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate-500">Secretarias com assento neste conselho.</p>
        {canWrite && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setLinkOpen(true)}>
            <Plus className="h-4 w-4" />
            Vincular Departamento
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-14 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando...
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50/60 py-14 px-6 text-center">
          <p className="text-sm font-medium text-red-700">
            Não foi possível carregar os departamentos vinculados.
          </p>
        </div>
      )}

      {!isLoading && !isError && (!departments || departments.length === 0) && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 py-14 px-6 text-center">
          <div className="h-11 w-11 rounded-full bg-white border border-slate-200 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-700">Nenhum departamento vinculado</p>
          <p className="text-xs text-slate-400 max-w-sm">
            Vincule as secretarias que têm assento neste conselho.
          </p>
        </div>
      )}

      {!isLoading && !isError && departments && departments.length > 0 && (
        <div className="border rounded-xl overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-24">Sigla</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="w-24 text-center">Situação</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map(department => (
                <TableRow key={department.id} className="group">
                  <TableCell className="font-medium text-slate-700">{department.code}</TableCell>
                  <TableCell>
                    <Link
                      to={`/departamentos/${department.id}`}
                      className="text-slate-900 hover:text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      {department.name}
                      <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500" />
                    </Link>
                  </TableCell>
                  <TableCell className="text-center">
                    {department.isActive ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Ativo</Badge>
                    ) : (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {canWrite && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-red-600"
                        disabled={pendingUnlink === department.id}
                        onClick={() => handleUnlink(department.id)}
                        title="Desvincular"
                      >
                        {pendingUnlink === department.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <X className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <LinkDepartmentDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        alreadyLinked={new Set((departments ?? []).map(d => d.id))}
        onLink={async departmentId => {
          try {
            await linkMut.mutateAsync(departmentId)
            toast({ title: 'Departamento vinculado.' })
            setLinkOpen(false)
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Não foi possível vincular o departamento.'
            toast({ title: 'Erro', description: message, variant: 'destructive' })
          }
        }}
        isPending={linkMut.isPending}
      />
    </div>
  )
}

interface LinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  alreadyLinked: Set<string>
  onLink: (departmentId: string) => void | Promise<void>
  isPending: boolean
}

function LinkDepartmentDialog({
  open,
  onOpenChange,
  alreadyLinked,
  onLink,
  isPending,
}: LinkDialogProps) {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (!next) setSelected(null)
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Vincular Departamento</DialogTitle>
          <DialogDescription>
            Escolha a secretaria que passa a ter assento neste conselho.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <DepartmentSelect
            value={selected}
            onChange={setSelected}
            excludeIds={alreadyLinked}
            disabled={isPending}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button disabled={!selected || isPending} onClick={() => selected && onLink(selected)}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Vincular
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
