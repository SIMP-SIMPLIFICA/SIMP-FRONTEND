import { useState } from 'react'
import { Plus, Pencil, Trash2, Loader2, AlertTriangle, ChevronDown, Layers, Building2, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import {
  useVirtualProcessCategories, useCreateVirtualProcessCategory,
  useUpdateVirtualProcessCategory, useDeleteVirtualProcessCategory,
  useVirtualProcessSources, useCreateVirtualProcessSource,
  useUpdateVirtualProcessSource, useDeleteVirtualProcessSource,
  useVirtualProcessCompanies, useCreateVirtualProcessCompany,
  useUpdateVirtualProcessCompany, useDeleteVirtualProcessCompany,
} from '@/hooks/useVirtualProcesses'
import type { VirtualProcessCategory, VirtualProcessSource, VirtualProcessCompany } from '@/lib/api/virtual-processes'

// ─── Tipos genéricos ──────────────────────────────────────────────────────────

type SimpleItem = { id: string; name: string }
type CompanyItem = { id: string; name: string; cnpj?: string | null }

// ─── Dialog genérico de criar/editar (name only) ──────────────────────────────

type SimpleDialogProps = {
  open: boolean
  onOpenChange: (v: boolean) => void
  item: SimpleItem | null
  label: string
  placeholder: string
  onSave: (name: string, id?: string) => Promise<void>
}

function SimpleFormDialog({ open, onOpenChange, item, label, placeholder, onSave }: SimpleDialogProps) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const handleOpenChange = (v: boolean) => {
    if (v) setName(item?.name ?? '')
    onOpenChange(v)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave(name.trim(), item?.id)
      toast({ title: item ? `${label} atualizado com sucesso` : `${label} criado com sucesso` })
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message
      toast({ title: `Erro ao salvar ${label.toLowerCase()}`, description: msg, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? `Editar ${label}` : `Novo ${label}`}</DialogTitle>
          <DialogDescription>
            {item ? `Altere o nome de "${item.name}".` : `Informe o nome para o novo ${label.toLowerCase()}.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nome <span className="text-red-500">*</span></Label>
            <Input required placeholder={placeholder} value={name} onChange={e => setName(e.target.value)} />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" className="bg-[#0A5BC4] hover:bg-[#094FA8] text-white" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {item ? 'Salvar' : `Criar ${label}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Dialog de criar/editar Empresa (name + cnpj) ────────────────────────────

type CompanyDialogProps = {
  open: boolean
  onOpenChange: (v: boolean) => void
  item: CompanyItem | null
  onSave: (data: { name: string; cnpj?: string | null }, id?: string) => Promise<void>
}

function CompanyFormDialog({ open, onOpenChange, item, onSave }: CompanyDialogProps) {
  const [form, setForm] = useState({ name: '', cnpj: '' })
  const [saving, setSaving] = useState(false)

  const handleOpenChange = (v: boolean) => {
    if (v) setForm({ name: item?.name ?? '', cnpj: item?.cnpj ?? '' })
    onOpenChange(v)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await onSave({ name: form.name.trim(), cnpj: form.cnpj.trim() || null }, item?.id)
      toast({ title: item ? 'Empresa atualizada com sucesso' : 'Empresa criada com sucesso' })
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message
      toast({ title: 'Erro ao salvar empresa', description: msg, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
          <DialogDescription>
            {item ? `Altere os dados de "${item.name}".` : 'Informe os dados da nova empresa contratada.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nome da empresa <span className="text-red-500">*</span></Label>
            <Input required placeholder="Ex: Construtora XYZ Ltda" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>CNPJ</Label>
            <Input placeholder="00.000.000/0001-00" value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" className="bg-[#0A5BC4] hover:bg-[#094FA8] text-white" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {item ? 'Salvar' : 'Criar Empresa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Dialog de confirmação de delete ─────────────────────────────────────────

type DeleteDialogProps = {
  open: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: () => void
  loading: boolean
}

function DeleteDialog({ open, onOpenChange, onConfirm, loading }: DeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onOpenChange(false)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <DialogTitle className="text-center">Remover item?</DialogTitle>
          <DialogDescription className="text-center">Esta ação não pode ser desfeita.</DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Sim, Remover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Seção colapsável genérica ────────────────────────────────────────────────

type SectionProps = {
  title: string
  description: string
  icon: React.ReactNode
  accentColor: string
  iconBg: string
  isLoading: boolean
  children: React.ReactNode
  onNew: () => void
  newLabel: string
  defaultOpen?: boolean
}

function ConfigSection({ title, description, icon, accentColor, iconBg, isLoading, children, onNew, newLabel, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden bg-white">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer select-none hover:bg-slate-50 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-3">
          <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${iconBg}`}>
            {icon}
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-800">{title}</div>
            <div className="text-xs text-slate-400">{description}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className={`h-7 px-3 text-xs gap-1.5 ${accentColor}`}
            onClick={e => { e.stopPropagation(); onNew() }}
          >
            <Plus className="h-3.5 w-3.5" />
            {newLabel}
          </Button>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Content */}
      {open && (
        <div className="border-t border-slate-100">
          {isLoading ? (
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3">
                  <Skeleton className="h-4 w-40" />
                  <div className="flex gap-1"><Skeleton className="h-6 w-6 rounded" /><Skeleton className="h-6 w-6 rounded" /></div>
                </div>
              ))}
            </div>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  )
}

type ItemRowProps = {
  primary: string
  secondary?: string | null
  onEdit: () => void
  onDelete: () => void
}

function ItemRow({ primary, secondary, onEdit, onDelete }: ItemRowProps) {
  return (
    <div className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-800 truncate">{primary}</div>
        {secondary && <div className="text-xs text-slate-400 truncate">{secondary}</div>}
      </div>
      <div className="flex items-center gap-1 shrink-0 ml-4">
        <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-slate-700" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-500" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="text-xs text-slate-400">Nenhum {label} cadastrado ainda.</div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Configuracoes() {
  // Categories
  const { data: categories = [], isLoading: loadingCat } = useVirtualProcessCategories(undefined)
  const { mutateAsync: createCat } = useCreateVirtualProcessCategory(undefined)
  const { mutateAsync: updateCat } = useUpdateVirtualProcessCategory(undefined)
  const { mutate: deleteCat, isPending: deletingCat } = useDeleteVirtualProcessCategory(undefined)

  // Sources
  const { data: sources = [], isLoading: loadingSrc } = useVirtualProcessSources(undefined)
  const { mutateAsync: createSrc } = useCreateVirtualProcessSource(undefined)
  const { mutateAsync: updateSrc } = useUpdateVirtualProcessSource(undefined)
  const { mutate: deleteSrc, isPending: deletingSrc } = useDeleteVirtualProcessSource(undefined)

  // Companies
  const { data: companies = [], isLoading: loadingCmp } = useVirtualProcessCompanies(undefined)
  const { mutateAsync: createCmp } = useCreateVirtualProcessCompany(undefined)
  const { mutateAsync: updateCmp } = useUpdateVirtualProcessCompany(undefined)
  const { mutate: deleteCmp, isPending: deletingCmp } = useDeleteVirtualProcessCompany(undefined)

  // Dialog state
  const [catDialog, setCatDialog] = useState<{ open: boolean; item: VirtualProcessCategory | null }>({ open: false, item: null })
  const [srcDialog, setSrcDialog] = useState<{ open: boolean; item: VirtualProcessSource | null }>({ open: false, item: null })
  const [cmpDialog, setCmpDialog] = useState<{ open: boolean; item: VirtualProcessCompany | null }>({ open: false, item: null })
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; fn: (() => void) | null; loading: boolean }>({ open: false, fn: null, loading: false })

  function openDelete(fn: () => void) {
    setDeleteDialog({ open: true, fn, loading: false })
  }

  function confirmDelete() {
    deleteDialog.fn?.()
    setDeleteDialog(d => ({ ...d, open: false }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="text-3xl font-semibold text-slate-900">Configurações</div>
        <div className="mt-1 text-slate-500">Gerencie as listas usadas nos formulários de processos virtuais.</div>
      </div>

      {/* Categorias */}
      <ConfigSection
        title="Categorias"
        description="Tipo do processo (Contratos, Obras, Licitações…)"
        icon={<FolderOpen className="h-4 w-4 text-blue-500" />}
        iconBg="bg-blue-50"
        accentColor="bg-[#0A5BC4] hover:bg-[#094FA8] text-white"
        isLoading={loadingCat}
        onNew={() => setCatDialog({ open: true, item: null })}
        newLabel="Nova"
      >
        {categories.length === 0 ? <EmptyState label="categoria" /> : (
          <div className="divide-y divide-slate-100">
            {categories.map(c => (
              <ItemRow
                key={c.id}
                primary={c.name}
                onEdit={() => setCatDialog({ open: true, item: c })}
                onDelete={() => openDelete(() => deleteCat(c.id, {
                  onSuccess: () => toast({ title: 'Categoria removida' }),
                  onError: () => toast({ title: 'Erro ao remover categoria', variant: 'destructive' }),
                }))}
              />
            ))}
          </div>
        )}
      </ConfigSection>

      {/* Origens do Recurso */}
      <ConfigSection
        title="Origens do Recurso"
        description="Origem dos recursos do processo (Emenda, Recurso Próprio…)"
        icon={<Layers className="h-4 w-4 text-violet-500" />}
        iconBg="bg-violet-50"
        accentColor="bg-violet-600 hover:bg-violet-700 text-white"
        isLoading={loadingSrc}
        onNew={() => setSrcDialog({ open: true, item: null })}
        newLabel="Nova"
      >
        {sources.length === 0 ? <EmptyState label="origem" /> : (
          <div className="divide-y divide-slate-100">
            {sources.map(s => (
              <ItemRow
                key={s.id}
                primary={s.name}
                onEdit={() => setSrcDialog({ open: true, item: s })}
                onDelete={() => openDelete(() => deleteSrc(s.id, {
                  onSuccess: () => toast({ title: 'Origem removida' }),
                  onError: () => toast({ title: 'Erro ao remover origem', variant: 'destructive' }),
                }))}
              />
            ))}
          </div>
        )}
      </ConfigSection>

      {/* Empresas Contratadas */}
      <ConfigSection
        title="Empresas Contratadas"
        description="Empresas habilitadas para seleção nos processos"
        icon={<Building2 className="h-4 w-4 text-emerald-500" />}
        iconBg="bg-emerald-50"
        accentColor="bg-emerald-600 hover:bg-emerald-700 text-white"
        isLoading={loadingCmp}
        onNew={() => setCmpDialog({ open: true, item: null })}
        newLabel="Nova"
      >
        {companies.length === 0 ? <EmptyState label="empresa" /> : (
          <div className="divide-y divide-slate-100">
            {companies.map(c => (
              <ItemRow
                key={c.id}
                primary={c.name}
                secondary={c.cnpj}
                onEdit={() => setCmpDialog({ open: true, item: c })}
                onDelete={() => openDelete(() => deleteCmp(c.id, {
                  onSuccess: () => toast({ title: 'Empresa removida' }),
                  onError: () => toast({ title: 'Erro ao remover empresa', variant: 'destructive' }),
                }))}
              />
            ))}
          </div>
        )}
      </ConfigSection>

      {/* Dialogs */}
      <SimpleFormDialog
        open={catDialog.open}
        onOpenChange={v => setCatDialog(d => ({ ...d, open: v }))}
        item={catDialog.item}
        label="Categoria"
        placeholder="Ex: Contratos, Obras, Licitações…"
        onSave={async (name, id) => {
          if (id) await updateCat({ id, data: { name } })
          else await createCat({ name })
        }}
      />

      <SimpleFormDialog
        open={srcDialog.open}
        onOpenChange={v => setSrcDialog(d => ({ ...d, open: v }))}
        item={srcDialog.item}
        label="Origem"
        placeholder="Ex: Emenda Parlamentar, Recurso Próprio…"
        onSave={async (name, id) => {
          if (id) await updateSrc({ id, data: { name } })
          else await createSrc({ name })
        }}
      />

      <CompanyFormDialog
        open={cmpDialog.open}
        onOpenChange={v => setCmpDialog(d => ({ ...d, open: v }))}
        item={cmpDialog.item}
        onSave={async (data, id) => {
          if (id) await updateCmp({ id, data })
          else await createCmp(data)
        }}
      />

      <DeleteDialog
        open={deleteDialog.open}
        onOpenChange={v => setDeleteDialog(d => ({ ...d, open: v }))}
        onConfirm={confirmDelete}
        loading={deletingCat || deletingSrc || deletingCmp}
      />
    </div>
  )
}
