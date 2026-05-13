import { useState, useEffect } from 'react'
import {
  Building2, Plus, Search, Loader2, Pencil, Trash2, Users,
} from 'lucide-react'
import { DepartmentMembersSheet } from '@/components/departments/DepartmentMembersSheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from '@/hooks/use-toast'
import { useMe } from '@/hooks/useMe'
import { hasAnyPermission } from '@/lib/permissions'
import {
  useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment,
} from '@/hooks/useDepartments'
import type { Department, CreateDepartmentDTO, UpdateDepartmentDTO } from '@/lib/api/departments'

// ─── Form Dialog ─────────────────────────────────────────────────────────────

interface FormDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Department | null
  onSuccess: () => void
}

function DepartmentFormDialog({ open, onOpenChange, editing, onSuccess }: FormDialogProps) {
  const isEditing = !!editing
  const createMut = useCreateDepartment()
  const updateMut = useUpdateDepartment()

  // Inicializa direto das props — o `key` no pai garante remount a cada abertura
  const [name, setName] = useState(editing?.name ?? '')
  const [code, setCode] = useState(editing?.code ?? '')
  const [description, setDescription] = useState(editing?.description ?? '')
  const [isActive, setIsActive] = useState(editing?.isActive ?? true)

  const isPending = createMut.isPending || updateMut.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !code.trim()) {
      toast({ title: 'Preencha nome e sigla.', variant: 'destructive' })
      return
    }
    try {
      if (isEditing && editing) {
        const data: UpdateDepartmentDTO = {
          name:        name.trim(),
          code:        code.trim().toUpperCase(),
          isActive,
          description: description.trim() || null,
        }
        await updateMut.mutateAsync({ id: editing.id, data })
        toast({ title: 'Departamento atualizado.' })
      } else {
        const data: CreateDepartmentDTO = { name: name.trim(), code: code.trim().toUpperCase() }
        if (description.trim()) data.description = description.trim()
        await createMut.mutateAsync(data)
        toast({ title: 'Departamento criado.' })
      }
      onSuccess()
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verifique os dados e tente novamente.'
      toast({ title: 'Erro na operação', description: msg, variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden p-0 gap-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>{isEditing ? 'Editar Departamento' : 'Novo Departamento'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize as informações do departamento.'
              : 'Cadastre um novo departamento ou secretaria.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <ScrollArea className="flex-1">
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <Label>Nome <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="Secretaria de Obras"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={isPending}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Sigla (Código) <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="OBRAS"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  disabled={isPending}
                  maxLength={20}
                />
                <p className="text-xs text-slate-400">Identificador único. Ex: SAUDE, OBRAS, ADM</p>
              </div>

              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Textarea
                  rows={3}
                  placeholder="Responsável pela gestão de obras públicas..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  disabled={isPending}
                  className="resize-none"
                />
              </div>

              {isEditing && (
                <div className="flex items-center gap-3 py-2">
                  <Checkbox
                    id="dept-active"
                    checked={isActive}
                    onCheckedChange={v => setIsActive(v === true)}
                    disabled={isPending}
                  />
                  <div>
                    <Label htmlFor="dept-active" className="cursor-pointer">Departamento Ativo</Label>
                    <p className="text-xs text-slate-400">Inativos não aparecem nos seletores</p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="px-6 py-4 border-t gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Salvar Alterações' : 'Criar Departamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DepartmentsPage() {
  const { data: me } = useMe()
  const canWrite  = hasAnyPermission(me, ['departments:write']) || !!me?.user?.isSuperAdmin
  const canDelete = hasAnyPermission(me, ['departments:delete']) || !!me?.user?.isSuperAdmin

  const [search, setSearch]           = useState('')
  const [debouncedSearch, setDebounced] = useState('')
  const [page, setPage]               = useState(1)
  const [dialogOpen, setDialogOpen]   = useState(false)
  const [editing, setEditing]         = useState<Department | null>(null)
  const [dialogKey, setDialogKey]     = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null)
  const [membersTarget, setMembersTarget] = useState<Department | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading } = useDepartments({ page, limit: 20, search: debouncedSearch || undefined })
  const deleteMut = useDeleteDepartment()

  function openCreate() {
    setEditing(null)
    setDialogKey(k => k + 1)
    setDialogOpen(true)
  }

  function openEdit(dept: Department) {
    setEditing(dept)
    setDialogKey(k => k + 1)
    setDialogOpen(true)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteMut.mutateAsync(deleteTarget.id)
      toast({ title: 'Departamento excluído.' })
      setDeleteTarget(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Não foi possível excluir.'
      toast({ title: 'Erro ao excluir', description: msg, variant: 'destructive' })
    }
  }

  const departments = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="p-4 sm:p-6 max-w-screen-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Departamentos</h1>
            <p className="text-xs text-slate-400">Secretarias e setores oficiais da organização</p>
          </div>
        </div>

        {canWrite && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo Departamento</span>
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar por nome ou sigla..."
          className="pl-9"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
        />
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-24">Sigla</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">Descrição</TableHead>
              <TableHead className="w-24 text-center hidden sm:table-cell">Usuários</TableHead>
              <TableHead className="w-24 text-center">Status</TableHead>
              <TableHead className="w-20 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            )}
            {!isLoading && departments.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-slate-400 text-sm">
                  {debouncedSearch ? 'Nenhum resultado encontrado.' : 'Nenhum departamento cadastrado.'}
                </TableCell>
              </TableRow>
            )}
            {departments.map(dept => (
              <TableRow key={dept.id} className="hover:bg-slate-50/50">
                <TableCell>
                  <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                    {dept.code}
                  </code>
                </TableCell>
                <TableCell className="font-medium text-slate-800">{dept.name}</TableCell>
                <TableCell className="hidden md:table-cell text-sm text-slate-500 max-w-xs truncate">
                  {dept.description ?? '—'}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                    onClick={() => setMembersTarget(dept)}
                  >
                    <Users className="h-3 w-3" />
                    Ver / Adicionar ({dept._count?.users ?? 0})
                  </Button>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={dept.isActive ? 'default' : 'secondary'} className="text-xs">
                    {dept.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {canWrite && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(dept)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setDeleteTarget(dept)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>{meta.total} departamento{meta.total !== 1 ? 's' : ''}</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              Anterior
            </Button>
            <span className="flex items-center px-2">
              {page} / {meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <DepartmentFormDialog
        key={dialogKey}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSuccess={() => setEditing(null)}
      />

      {/* Members Sheet */}
      <DepartmentMembersSheet
        open={!!membersTarget}
        onOpenChange={v => { if (!v) setMembersTarget(null) }}
        department={membersTarget}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir departamento?"
        description={`O departamento "${deleteTarget?.name}" será excluído permanentemente. Departamentos com usuários vinculados não podem ser excluídos.`}
        confirmLabel="Excluir"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
