import { useState, useCallback } from 'react'
import {
  Plus, Search, FolderArchive, FileText, Upload, Trash2, Loader2,
  AlertTriangle, ChevronRight, Building2, Tag, X, Paperclip,
  Calendar as CalendarIcon, Settings2, Handshake,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { toast } from '@/hooks/use-toast'
import {
  useVirtualProcesses, useVirtualProcessDetail, useCreateVirtualProcess,
  useUpdateProcessStatus, useDeleteVirtualProcess, useUploadProcessDocument, useDeleteProcessDocument,
  useVirtualProcessCategories, useVirtualProcessSources, useVirtualProcessCompanies,
} from '@/hooks/useVirtualProcesses'
import { useFinanceBankAccounts } from '@/hooks/useFinance'
import { PROCESS_STATUSES } from '@/types/virtual-process'
import type { VirtualProcess } from '@/types/virtual-process'
import { virtualProcessService } from '@/lib/api/virtual-processes'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useUniversalProcessModal } from '@/context/UniversalProcessModalContext'

// --- helpers ---
function formatDocument(val: string) {
  const digits = val.replace(/\D/g, '').slice(0, 14)
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

const STATUS_COLORS: Record<string, string> = {
  'Tramitando': 'bg-blue-100 text-blue-700',
  'Concluído': 'bg-emerald-100 text-emerald-700',
  'Arquivado': 'bg-slate-100 text-slate-600',
  'Cancelado': 'bg-red-100 text-red-600',
}

function statusBadge(status: string) {
  const cls = STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-600'
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{status}</span>
}

function formatDate(iso?: string | null) {
  if (!iso) return '—'
  return format(new Date(iso), 'dd/MM/yyyy', { locale: ptBR })
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function DatePickerField({ label, date, onChange }: {
  label: string
  date: Date | undefined
  onChange: (d: Date | undefined) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={`w-full justify-start text-left font-normal ${!date ? 'text-muted-foreground' : ''}`}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            {date ? format(date, 'dd/MM/yyyy') : 'Selecionar data'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={date} onSelect={onChange} locale={ptBR} initialFocus />
        </PopoverContent>
      </Popover>
    </div>
  )
}

// --- Create Process Dialog ---
type CreateDialogProps = { open: boolean; onOpenChange: (v: boolean) => void; workspaceId: undefined }

function CreateProcessDialog({ open, onOpenChange, workspaceId }: CreateDialogProps) {
  const [form, setForm] = useState({
    processNumber: '', secretaria: '', source: '', subject: '',
    category: '', sourceDetail: '', companyName: '', companyCnpj: '',
    bankAccountId: '', bankAccount: '', agency: '', bankName: '',
  })
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [saving, setSaving] = useState(false)
  const { mutateAsync: create } = useCreateVirtualProcess(workspaceId)
  const { data: processesResponse } = useVirtualProcesses(workspaceId)
  const { data: categories = [] } = useVirtualProcessCategories(workspaceId)
  const { data: sources = [] } = useVirtualProcessSources(workspaceId)
  const { data: companies = [] } = useVirtualProcessCompanies(workspaceId)
  const { data: bankAccounts = [] } = useFinanceBankAccounts()
  const { open: openProcessModal } = useUniversalProcessModal()

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  function reset() {
    setForm({ processNumber: '', secretaria: '', source: '', subject: '', category: '', sourceDetail: '', companyName: '', companyCnpj: '', bankAccountId: '', bankAccount: '', agency: '', bankName: '' })
    setStartDate(undefined); setEndDate(undefined)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const num = form.processNumber.trim()
    if ((processesResponse?.data ?? []).some((p: VirtualProcess) => p.processNumber === num)) {
      toast({ title: 'Número já cadastrado', description: `O processo "${num}" já existe.`, variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await create({
        processNumber: num,
        secretaria: form.secretaria.trim(),
        source: form.source.trim(),
        subject: form.subject.trim(),
        category: form.category,
        sourceDetail: form.sourceDetail.trim() || undefined,
        companyName: form.companyName.trim() || undefined,
        companyCnpj: form.companyCnpj.trim() || undefined,
        startDate: startDate?.toISOString() || undefined,
        endDate: endDate?.toISOString() || undefined,
        bankAccount: form.bankAccount.trim() || undefined,
        agency: form.agency.trim() || undefined,
        bankName: form.bankName.trim() || undefined,
      })
      toast({ title: 'Processo autuado com sucesso' })
      reset()
      onOpenChange(false)
    } catch (error: unknown) {
      const msg = (error as { message?: string })?.message
      toast({ title: 'Erro ao criar processo', description: typeof msg === 'string' && msg.length <= 120 ? msg : 'Verifique os campos e tente novamente.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
          <DialogTitle>Autuar Novo Processo</DialogTitle>
          <DialogDescription>Preencha os dados do processo virtual.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 overflow-auto">
          <form id="create-process-form" onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {/* Row 1: N° + Secretaria */}
            <div className="grid grid-cols-2 gap-4 items-end">
              <div className="space-y-1.5">
                <Label>N° do Processo <span className="text-red-500">*</span></Label>
                <Input required placeholder="001/2026" value={form.processNumber} onChange={set('processNumber')} />
              </div>
              <div className="space-y-1.5">
                <Label>Secretaria <span className="text-red-500">*</span></Label>
                <Input required placeholder="Ex: Secretaria de Obras" value={form.secretaria} onChange={set('secretaria')} />
              </div>
            </div>

            {/* Row 2: Categoria */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Categoria <span className="text-red-500">*</span></Label>
                <button type="button" onClick={() => openProcessModal('categorias')}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline" tabIndex={-1}>
                  <Settings2 className="h-3 w-3" /> Gerenciar categorias
                </button>
              </div>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {categories.length === 0
                    ? <div className="px-3 py-2 text-sm text-slate-400">Nenhuma categoria cadastrada</div>
                    : categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Row 3: Origem + Detalhe */}
            <div className="grid grid-cols-2 gap-4 items-end">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Origem do Recurso <span className="text-red-500">*</span></Label>
                  <button type="button" onClick={() => openProcessModal('origens')}
                    className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 hover:underline" tabIndex={-1}>
                    <Settings2 className="h-3 w-3" /> Gerenciar
                  </button>
                </div>
                <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {sources.length === 0
                      ? <div className="px-3 py-2 text-sm text-slate-400">Nenhuma origem cadastrada</div>
                      : sources.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Detalhe da Origem</Label>
                <Input placeholder="Número ou referência" value={form.sourceDetail} onChange={set('sourceDetail')} />
              </div>
            </div>

            {/* Row 4: Assunto */}
            <div className="space-y-1.5">
              <Label>Assunto <span className="text-red-500">*</span></Label>
              <Textarea required placeholder="Descreva o assunto do processo..." rows={3} value={form.subject} onChange={set('subject')} className="resize-none" />
            </div>

            {/* Row 5: Empresa + CNPJ */}
            <div className="grid grid-cols-2 gap-4 items-end">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Empresa Contratada</Label>
                  <button type="button" onClick={() => openProcessModal('empresas')}
                    className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 hover:underline" tabIndex={-1}>
                    <Settings2 className="h-3 w-3" /> Gerenciar
                  </button>
                </div>
                <Select value={form.companyName} onValueChange={v => setForm(f => ({ ...f, companyName: v }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {companies.length === 0
                      ? <div className="px-3 py-2 text-sm text-slate-400">Nenhuma empresa cadastrada</div>
                      : companies.map(c => <SelectItem key={c.id} value={c.name}>{c.name}{c.cnpj ? ` — ${c.cnpj}` : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>CNPJ / CPF</Label>
                <Input
                  inputMode="numeric"
                  value={form.companyCnpj}
                  onChange={e => setForm(f => ({ ...f, companyCnpj: formatDocument(e.target.value) }))}
                />
              </div>
            </div>

            {/* Row 6: Datas */}
            <div className="grid grid-cols-2 gap-4 items-end">
              <DatePickerField label="Data de Início" date={startDate} onChange={setStartDate} />
              <DatePickerField label="Data de Encerramento" date={endDate} onChange={setEndDate} />
            </div>

            {/* Row 7: Conta Bancária */}
            <div className="space-y-1.5">
              <Label>Conta Bancária</Label>
              <Select
                value={form.bankAccountId}
                onValueChange={v => {
                  const acc = bankAccounts.find(a => a.id === v)
                  setForm(f => ({
                    ...f,
                    bankAccountId: v,
                    bankName: acc?.name ?? '',
                    agency: acc?.agency ?? '',
                    bankAccount: acc?.accountNumber ?? '',
                  }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.length === 0
                    ? <div className="px-3 py-2 text-sm text-slate-400">Nenhuma conta cadastrada</div>
                    : bankAccounts.map(a => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}{a.agency ? ` — Ag. ${a.agency}` : ''}{a.accountNumber ? ` · Cc ${a.accountNumber}` : ''}
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
              {form.bankName && (
                <p className="text-xs text-slate-400">
                  {[form.bankName, form.agency && `Ag. ${form.agency}`, form.bankAccount && `Cc ${form.bankAccount}`].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </form>
        </ScrollArea>
        <DialogFooter className="px-6 py-4 border-t border-slate-100">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button type="submit" form="create-process-form" className="bg-[#0A5BC4] hover:bg-[#094FA8] text-white" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Autuar Processo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// --- Upload Document Dialog ---
type UploadDialogProps = { open: boolean; onOpenChange: (v: boolean) => void; processId: string | null; workspaceId: undefined }

function UploadDocumentDialog({ open, onOpenChange, processId, workspaceId }: UploadDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [tag, setTag] = useState('')
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const { mutateAsync: upload } = useUploadProcessDocument(processId, workspaceId)

  function handleClose() { setFile(null); setTag(''); setDescription(''); onOpenChange(false) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !tag.trim()) return
    setUploading(true)
    try {
      await upload({ file, tag: tag.trim(), description: description.trim() || undefined })
      toast({ title: 'Documento anexado com sucesso' })
      handleClose()
    } catch {
      toast({ title: 'Erro ao enviar documento', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Anexar Documento</DialogTitle>
          <DialogDescription>Selecione um arquivo e informe a etiqueta do documento.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Etiqueta <span className="text-red-500">*</span></Label>
            <Input required placeholder="Ex: Contrato, Nota Fiscal, Ofício..." value={tag} onChange={e => setTag(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input placeholder="Descrição opcional" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Arquivo <span className="text-red-500">*</span></Label>
            {file ? (
              <div className="flex items-center gap-2 p-3 border border-emerald-200 bg-emerald-50 rounded-lg">
                <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="text-sm text-emerald-800 truncate flex-1">{file.name}</span>
                <button type="button" onClick={() => setFile(null)}><X className="h-4 w-4 text-emerald-500" /></button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 w-full h-16 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-[#0A5BC4] transition-colors text-sm text-slate-500">
                <Paperclip className="h-4 w-4" />
                Selecionar arquivo
                <input type="file" className="hidden" onChange={e => e.target.files?.[0] && setFile(e.target.files[0])} />
              </label>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={uploading}>Cancelar</Button>
            <Button type="submit" className="bg-[#0A5BC4] hover:bg-[#094FA8] text-white" disabled={uploading || !file || !tag.trim()}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enviar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// --- Process Detail Panel ---
type DetailPanelProps = { processId: string; onClose: () => void; workspaceId: undefined }

function ProcessDetailPanel({ processId, onClose, workspaceId }: DetailPanelProps) {
  const { data, isLoading, refetch } = useVirtualProcessDetail(processId)
  const { mutate: updateStatus } = useUpdateProcessStatus(workspaceId)
  const { mutate: deleteDoc, isPending: deletingDoc } = useDeleteProcessDocument(processId, workspaceId)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null)

  const process = data?.process

  function handleStatusChange(status: string) {
    updateStatus({ id: processId, status }, {
      onSuccess: () => { toast({ title: 'Status atualizado' }); refetch() },
      onError: () => toast({ title: 'Erro ao atualizar status', variant: 'destructive' }),
    })
  }

  function confirmDeleteDoc() {
    if (!deletingDocId) return
    deleteDoc(deletingDocId, {
      onSuccess: () => { toast({ title: 'Documento removido' }); setDeletingDocId(null) },
      onError: () => { toast({ title: 'Erro ao remover documento', variant: 'destructive' }); setDeletingDocId(null) },
    })
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-32 w-full mt-4" />
      </div>
    )
  }

  if (!process) return null

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900 text-sm">{process.processNumber}</span>
            {statusBadge(process.status)}
          </div>
          <div className="text-xs text-slate-400 mt-0.5 truncate">{process.secretaria}</div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-5 py-4 space-y-5">
          {/* Assunto */}
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Assunto</div>
            <p className="text-sm text-slate-700 leading-relaxed">{process.subject}</p>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <div className="text-xs text-slate-400">Categoria</div>
              <div className="font-medium text-slate-700">{process.category}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Origem</div>
              <div className="font-medium text-slate-700">{process.source}{process.sourceDetail ? ` — ${process.sourceDetail}` : ''}</div>
            </div>
            {process.companyName && (
              <div className="col-span-2">
                <div className="text-xs text-slate-400">Empresa / Interessado</div>
                <div className="font-medium text-slate-700">{process.companyName}{process.companyCnpj ? ` (${process.companyCnpj})` : ''}</div>
              </div>
            )}
            {process.bankName && (
              <div className="col-span-2">
                <div className="text-xs text-slate-400">Conta Bancária</div>
                <div className="font-medium text-slate-700">
                  {[process.bankName, process.agency && `Ag. ${process.agency}`, process.bankAccount && `Cc ${process.bankAccount}`].filter(Boolean).join(' · ')}
                </div>
              </div>
            )}
            {(process.startDate || process.endDate) && (
              <div className="col-span-2">
                <div className="text-xs text-slate-400">Período</div>
                <div className="font-medium text-slate-700">{formatDate(process.startDate)} → {formatDate(process.endDate)}</div>
              </div>
            )}
            <div>
              <div className="text-xs text-slate-400">Autuado em</div>
              <div className="font-medium text-slate-700">{formatDate(process.createdAt)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Por</div>
              <div className="font-medium text-slate-700">
                {process.creator ? `${process.creator.firstName} ${process.creator.lastName}` : '—'}
              </div>
            </div>
          </div>

          {/* Status change */}
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Alterar Status</div>
            <div className="flex flex-wrap gap-1.5">
              {PROCESS_STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                    process.status === s
                      ? 'border-transparent ' + (STATUS_COLORS[s] ?? 'bg-slate-100 text-slate-600')
                      : 'border-slate-200 text-slate-500 hover:border-slate-400'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Convênios Vinculados */}
          {(process.covenants ?? []).length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Convênios Vinculados
              </div>
              <div className="space-y-2">
                {(process.covenants ?? []).map(cv => {
                  const statusColors: Record<string, string> = {
                    EM_ANALISE:       'bg-amber-100 text-amber-700',
                    APROVADO:         'bg-blue-100 text-blue-700',
                    EM_EXECUCAO:      'bg-emerald-100 text-emerald-700',
                    PRESTACAO_CONTAS: 'bg-violet-100 text-violet-700',
                    CONCLUIDO:        'bg-slate-100 text-slate-600',
                    DEVOLVIDO:        'bg-red-100 text-red-600',
                  }
                  const statusLabels: Record<string, string> = {
                    EM_ANALISE:       'Em Análise',
                    APROVADO:         'Aprovado',
                    EM_EXECUCAO:      'Em Execução',
                    PRESTACAO_CONTAS: 'Prestação de Contas',
                    CONCLUIDO:        'Concluído',
                    DEVOLVIDO:        'Devolvido',
                  }
                  return (
                    <div key={cv.id} className="flex items-start gap-2 p-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                      <Handshake className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-medium text-slate-800">{cv.number}</span>
                          {cv.covenantType && (
                            <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              {cv.covenantType.name}
                            </span>
                          )}
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[cv.status] ?? 'bg-slate-100 text-slate-600'}`}>
                            {statusLabels[cv.status] ?? cv.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{cv.processObject}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Documents */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Documentos</div>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setUploadOpen(true)}>
                <Upload className="h-3 w-3" />
                Anexar
              </Button>
            </div>

            {!process.documents || process.documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center rounded-lg border border-dashed border-slate-200">
                <Paperclip className="h-6 w-6 text-slate-300 mb-1.5" />
                <div className="text-xs text-slate-400">Nenhum documento anexado</div>
              </div>
            ) : (
              <div className="space-y-2">
                {process.documents.map(doc => (
                  <div key={doc.id} className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    <FileText className="h-4 w-4 text-[#0A5BC4] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-700 truncate">{doc.fileName}</div>
                      <div className="text-xs text-slate-400">{doc.tag} · {formatBytes(doc.fileSize)} · {formatDate(doc.uploadedAt)}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        className="p-1 text-slate-400 hover:text-[#0A5BC4] transition-colors"
                        title="Download"
                        onClick={async () => {
                          try {
                            const data = await virtualProcessService.getDownloadUrl(processId!, doc.id)
                            window.open(data.url, '_blank')
                          } catch {
                            toast({ title: 'Erro ao baixar documento', variant: 'destructive' })
                          }
                        }}
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingDocId(doc.id)}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <UploadDocumentDialog open={uploadOpen} onOpenChange={v => { setUploadOpen(v); if (!v) refetch() }} processId={processId} workspaceId={workspaceId} />

      {/* Delete doc confirm */}
      <Dialog open={!!deletingDocId} onOpenChange={v => !v && setDeletingDocId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <DialogTitle className="text-center">Remover Documento?</DialogTitle>
            <DialogDescription className="text-center text-sm">
              Documentos só podem ser removidos dentro de 24h do upload.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-2">
            <Button variant="outline" onClick={() => setDeletingDocId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDeleteDoc} disabled={deletingDoc}>
              {deletingDoc ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// --- Process List Item ---
function ProcessItem({ process, selected, onClick }: { process: VirtualProcess; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 border-b border-slate-100 hover:bg-slate-50 transition-colors flex items-start gap-3 ${selected ? 'bg-blue-50 border-l-2 border-l-[#0A5BC4]' : ''}`}
    >
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 mt-0.5">
        <FolderArchive className="h-4 w-4 text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-slate-800">{process.processNumber}</span>
          {statusBadge(process.status)}
        </div>
        <div className="text-xs text-slate-500 truncate mt-0.5">{process.subject}</div>
        <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
          <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{process.category}</span>
          <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{process.secretaria}</span>
          {(process._count?.documents ?? 0) > 0 && (
            <span className="flex items-center gap-1"><Paperclip className="h-3 w-3" />{process._count!.documents}</span>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-300 shrink-0 mt-1" />
    </button>
  )
}

// --- Main Page ---
export default function ProcessosVirtuais() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [deletingProcessId, setDeletingProcessId] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useVirtualProcesses(undefined, {
    page, limit: 30,
    search: search || undefined,
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
    category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
  })

  const { mutate: deleteProcess, isPending: deleting } = useDeleteVirtualProcess(undefined)
  const { data: categories = [] } = useVirtualProcessCategories(undefined)

  const processes = data?.data ?? []
  const totalPages = data?.meta?.totalPages ?? 1

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setPage(1)
  }, [])

  function confirmDeleteProcess() {
    if (!deletingProcessId) return
    deleteProcess(deletingProcessId, {
      onSuccess: () => {
        toast({ title: 'Processo removido' })
        setDeletingProcessId(null)
        if (selectedId === deletingProcessId) setSelectedId(null)
      },
      onError: (e: unknown) => {
        const msg = (e as { message?: string })?.message
        toast({ title: 'Erro ao remover processo', description: typeof msg === 'string' && msg.length <= 120 ? msg : 'Verifique se o prazo de 24h não expirou.', variant: 'destructive' })
        setDeletingProcessId(null)
      },
    })
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden -m-6">
      {/* Left panel — list */}
      <div className={`flex flex-col border-r border-slate-200 bg-white ${selectedId ? 'hidden lg:flex lg:w-[420px] shrink-0' : 'flex-1'}`}>
        {/* Header */}
        <div className="px-4 pt-5 pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xl font-semibold text-slate-900">Processos Virtuais</div>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="bg-[#0A5BC4] hover:bg-[#094FA8] text-white gap-1.5">
              <Plus className="h-4 w-4" />
              Autuar
            </Button>
          </div>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={search}
              onChange={handleSearch}
              placeholder="Buscar por número, assunto, secretaria..."
              className="pl-8 h-8 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="h-7 text-xs flex-1">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os status</SelectItem>
                {PROCESS_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); setPage(1) }}>
              <SelectTrigger className="h-7 text-xs flex-1">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as categorias</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* List */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-3 px-4 py-3.5">
                  <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : processes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <FolderArchive className="h-10 w-10 text-slate-300 mb-3" />
              <div className="text-sm font-medium text-slate-600">Nenhum processo encontrado</div>
              <div className="text-xs text-slate-400 mt-1">
                {search || statusFilter !== 'ALL' || categoryFilter !== 'ALL'
                  ? 'Tente ajustar os filtros.'
                  : 'Clique em "Autuar" para registrar o primeiro processo.'}
              </div>
            </div>
          ) : (
            <>
              {processes.map(p => (
                <ProcessItem
                  key={p.id}
                  process={p}
                  selected={selectedId === p.id}
                  onClick={() => setSelectedId(p.id)}
                />
              ))}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 py-3">
                  <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                  <span className="text-xs text-slate-400 self-center">Página {page}/{totalPages}</span>
                  <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
                </div>
              )}
            </>
          )}
        </ScrollArea>
      </div>

      {/* Right panel — detail */}
      {selectedId ? (
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          <ProcessDetailPanel processId={selectedId} onClose={() => setSelectedId(null)} workspaceId={undefined} />
          {/* Delete button in detail header area */}
          <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
            <Button size="sm" variant="outline" className="text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200 gap-1.5 text-xs" onClick={() => setDeletingProcessId(selectedId)}>
              <Trash2 className="h-3.5 w-3.5" />
              Excluir Processo
            </Button>
          </div>
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center bg-slate-50">
          <div className="text-center">
            <FolderArchive className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <div className="text-sm text-slate-400">Selecione um processo para ver os detalhes</div>
          </div>
        </div>
      )}

      {/* Create dialog */}
      <CreateProcessDialog open={createOpen} onOpenChange={setCreateOpen} workspaceId={undefined} />

      {/* Delete process confirm */}
      <Dialog open={!!deletingProcessId} onOpenChange={v => !v && setDeletingProcessId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-center">Excluir Processo?</DialogTitle>
            <DialogDescription className="text-center">
              Processos só podem ser excluídos dentro de 24h da autuação. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-2">
            <Button variant="outline" onClick={() => setDeletingProcessId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDeleteProcess} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Sim, Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
