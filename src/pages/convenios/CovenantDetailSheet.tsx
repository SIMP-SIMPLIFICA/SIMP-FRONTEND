import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CalendarIcon, FileText, Upload, Loader2, FolderArchive,
  ExternalLink, Download, Paperclip, Building2, Link2, Link2Off, Search,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from '@/hooks/use-toast'
import { useUpdateCovenant, useLinkProcess, useUnlinkProcess } from '@/hooks/useCovenants'
import { useVirtualProcesses } from '@/hooks/useVirtualProcesses'
import { covenantService } from '@/lib/api/covenants'
import { libraryService } from '@/lib/api/library'
import type { Covenant, CovenantStatus, UpdateCovenantDTO } from '@/lib/api/covenants'

// ── Types ─────────────────────────────────────────────────────────────────────

interface VPDocument {
  id: string
  tag: string
  description?: string | null
  fileName: string
  fileUrl: string
  fileSize: number
  uploadedAt: string
  uploader: { id: string; firstName: string | null; lastName: string | null }
}

interface LinkedProcess {
  id: string
  processNumber: string
  status: string
  subject: string
  documents: VPDocument[]
}

interface CovenantDetail extends Covenant {
  virtualProcesses: LinkedProcess[]
  libraryDocuments: Array<{
    id: string
    title: string
    fileName: string
    fileSize: number
    mimeType: string
    accessLevel: number
    createdAt: string
    uploader: { id: string; firstName: string | null; lastName: string | null; avatar: string | null }
    category: { id: string; name: string } | null
  }>
}

// ── Label maps ────────────────────────────────────────────────────────────────


const STATUS_OPTIONS: { value: CovenantStatus; label: string }[] = [
  { value: 'EM_ANALISE',       label: 'Em Análise' },
  { value: 'APROVADO',         label: 'Aprovado' },
  { value: 'EM_EXECUCAO',      label: 'Em Execução' },
  { value: 'PRESTACAO_CONTAS', label: 'Prestação de Contas' },
  { value: 'CONCLUIDO',        label: 'Concluído' },
  { value: 'DEVOLVIDO',        label: 'Devolvido' },
]

const STATUS_CONFIG: Record<CovenantStatus, { label: string; className: string }> = {
  EM_ANALISE:       { label: 'Em Análise',          className: 'bg-amber-100 text-amber-700' },
  APROVADO:         { label: 'Aprovado',             className: 'bg-blue-100 text-blue-700' },
  EM_EXECUCAO:      { label: 'Em Execução',          className: 'bg-emerald-100 text-emerald-700' },
  PRESTACAO_CONTAS: { label: 'Prestação de Contas',  className: 'bg-violet-100 text-violet-700' },
  CONCLUIDO:        { label: 'Concluído',            className: 'bg-slate-100 text-slate-600' },
  DEVOLVIDO:        { label: 'Devolvido',            className: 'bg-red-100 text-red-600' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso?: string | null) {
  if (!iso) return '—'
  return format(new Date(iso), 'dd/MM/yyyy', { locale: ptBR })
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function DateField({ label, date, onChange }: {
  label: string; date: Date | undefined; onChange: (d: Date | undefined) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-slate-500 uppercase tracking-wide">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button" variant="outline"
            className={`w-full justify-start text-left font-normal text-sm h-9 ${!date ? 'text-muted-foreground' : ''}`}
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
            {date ? format(date, 'dd/MM/yyyy') : 'Selecionar'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={date} onSelect={onChange} locale={ptBR} initialFocus />
        </PopoverContent>
      </Popover>
    </div>
  )
}

// ── Form state ────────────────────────────────────────────────────────────────

interface FormState {
  number: string; processObject: string; budgetaryAction: string; termDays: string
  transferValue: string; counterpartValue: string; status: CovenantStatus | ''
  bankName: string; bankAgency: string; bankAccount: string
  executionStartDate: Date | undefined; validityEndDate: Date | undefined
}

function toFormState(c: CovenantDetail): FormState {
  return {
    number: c.number,
    processObject: c.processObject, budgetaryAction: c.budgetaryAction ?? '',
    termDays: c.termDays != null ? String(c.termDays) : '',
    transferValue: c.transferValue != null ? String(Number(c.transferValue)) : '',
    counterpartValue: c.counterpartValue != null ? String(Number(c.counterpartValue)) : '',
    status: c.status,
    bankName: c.bankName ?? '', bankAgency: c.bankAgency ?? '', bankAccount: c.bankAccount ?? '',
    executionStartDate: c.executionStartDate ? new Date(c.executionStartDate) : undefined,
    validityEndDate: c.validityEndDate ? new Date(c.validityEndDate) : undefined,
  }
}

// ── Tab: Dados Gerais ─────────────────────────────────────────────────────────

function DadosGeraisTab({ covenant, onSaved }: { covenant: CovenantDetail; onSaved: () => void }) {
  const [form, setForm] = useState<FormState>(() => toFormState(covenant))
  const updateMutation = useUpdateCovenant()

  useEffect(() => { setForm(toFormState(covenant)) }, [covenant])

  function set(field: keyof FormState, value: string | Date | undefined) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload: UpdateCovenantDTO = {
      number: form.number,
      processObject: form.processObject,
      status: form.status as CovenantStatus,
      budgetaryAction: form.budgetaryAction || undefined,
      termDays: form.termDays ? Number(form.termDays) : undefined,
      transferValue: form.transferValue ? Number(form.transferValue) : undefined,
      counterpartValue: form.counterpartValue ? Number(form.counterpartValue) : undefined,
      bankName: form.bankName || undefined,
      bankAgency: form.bankAgency || undefined,
      bankAccount: form.bankAccount || undefined,
      executionStartDate: form.executionStartDate?.toISOString(),
      validityEndDate: form.validityEndDate?.toISOString(),
    }
    try {
      await updateMutation.mutateAsync({ id: covenant.id, data: payload })
      toast({ title: 'Convênio atualizado.' })
      onSaved()
    } catch {
      toast({ title: 'Erro ao salvar.', variant: 'destructive' })
    }
  }

  const isBusy = updateMutation.isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-0">
      {/* Linha 1: Número + Tipo + Status */}
      <section className="grid grid-cols-3 gap-4 p-5 border-b border-slate-100">
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500 uppercase tracking-wide">Número</Label>
          <Input value={form.number} onChange={e => set('number', e.target.value)} required
            className="font-mono text-sm" placeholder="010400.00464/2021" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500 uppercase tracking-wide">Tipo</Label>
          <div className="h-9 flex items-center px-3 border rounded-md bg-slate-50 text-sm text-slate-700">
            {covenant.covenantType?.name ?? '—'}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500 uppercase tracking-wide">Status</Label>
          <Select value={form.status} onValueChange={v => set('status', v)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Linha 2: Empresa / Contratada */}
      <section className="p-5 border-b border-slate-100">
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500 uppercase tracking-wide">Empresa / Contratada</Label>
          <div className="h-9 flex items-center px-3 border rounded-md bg-slate-50 text-sm text-slate-700">
            {covenant.proponent?.name ?? '—'}
          </div>
        </div>
      </section>

      {/* Linha 3: Datas + Valores */}
      <section className="grid grid-cols-5 gap-4 p-5 border-b border-slate-100">
        <DateField label="Início Execução" date={form.executionStartDate}
          onChange={d => set('executionStartDate', d)} />
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500 uppercase tracking-wide">Prazo (dias)</Label>
          <Input type="number" min="1" value={form.termDays}
            onChange={e => set('termDays', e.target.value)} placeholder="365" className="h-9" />
        </div>
        <DateField label="Vigência — Fim" date={form.validityEndDate}
          onChange={d => set('validityEndDate', d)} />
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500 uppercase tracking-wide">Valor Repasse (R$)</Label>
          <Input type="number" min="0" step="0.01" value={form.transferValue}
            onChange={e => set('transferValue', e.target.value)} placeholder="0,00" className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500 uppercase tracking-wide">Contrapartida (R$)</Label>
          <Input type="number" min="0" step="0.01" value={form.counterpartValue}
            onChange={e => set('counterpartValue', e.target.value)} placeholder="0,00" className="h-9" />
        </div>
      </section>

      {/* Linha 4: Dados bancários */}
      <section className="grid grid-cols-3 gap-4 p-5 border-b border-slate-100">
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500 uppercase tracking-wide">Banco</Label>
          <Input value={form.bankName} onChange={e => set('bankName', e.target.value)}
            placeholder="Caixa Econômica" className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500 uppercase tracking-wide">Agência</Label>
          <Input value={form.bankAgency} onChange={e => set('bankAgency', e.target.value)}
            placeholder="0001" className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500 uppercase tracking-wide">Conta</Label>
          <Input value={form.bankAccount} onChange={e => set('bankAccount', e.target.value)}
            placeholder="12345-6" className="h-9" />
        </div>
      </section>

      {/* Linha 5: Ação Orçamentária */}
      <section className="p-5 border-b border-slate-100">
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500 uppercase tracking-wide">Ação Orçamentária</Label>
          <Input value={form.budgetaryAction} onChange={e => set('budgetaryAction', e.target.value)}
            placeholder="Ex: 2055 — Manutenção de Postos de Saúde" className="h-9" />
        </div>
      </section>

      {/* Linha 6: Objeto */}
      <section className="p-5 border-b border-slate-100">
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500 uppercase tracking-wide">Objeto do Processo</Label>
          <Textarea rows={4} value={form.processObject}
            onChange={e => set('processObject', e.target.value)} required
            placeholder="Descrição completa do objeto…" className="resize-none text-sm" />
        </div>
      </section>

      <div className="flex justify-end px-5 py-4">
        <Button type="submit" disabled={isBusy} className="bg-emerald-600 hover:bg-emerald-700">
          {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar alterações
        </Button>
      </div>
    </form>
  )
}

// ── Link Process Dialog ───────────────────────────────────────────────────────

function LinkProcessDialog({
  open, onOpenChange, covenantId, linkedIds,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  covenantId: string
  linkedIds: Set<string>
}) {
  const [search, setSearch] = useState('')
  const linkMutation = useLinkProcess(covenantId)

  const { data, isFetching } = useVirtualProcesses(undefined, {
    search: search || undefined,
    limit: 20,
  })

  const processes = data?.data ?? []

  async function handleLink(processId: string) {
    try {
      await linkMutation.mutateAsync(processId)
      toast({ title: 'Processo vinculado com sucesso.' })
    } catch {
      toast({ title: 'Erro ao vincular processo.', variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Vincular Processo Virtual</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Buscar por número ou assunto…"
              className="pl-8 h-9 text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <ScrollArea className="h-72 border rounded-md">
            {isFetching ? (
              <div className="flex items-center justify-center py-10 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : processes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
                <FolderArchive className="h-6 w-6" />
                <p className="text-sm">Nenhum processo encontrado.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {processes.map(vp => {
                  const already = linkedIds.has(vp.id)
                  return (
                    <div key={vp.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            {vp.processNumber}
                          </span>
                          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            {vp.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">{vp.subject}</p>
                      </div>
                      {already ? (
                        <span className="text-xs text-slate-400 shrink-0 pt-1">Já vinculado</span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs shrink-0"
                          disabled={linkMutation.isPending}
                          onClick={() => handleLink(vp.id)}
                        >
                          <Link2 className="h-3 w-3 mr-1" />
                          Vincular
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Tab: Processos Vinculados ─────────────────────────────────────────────────

function ProcessosTab({ processes, covenantId }: { processes: LinkedProcess[]; covenantId: string }) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const unlinkMutation = useUnlinkProcess(covenantId)
  const linkedIds = new Set(processes.map(p => p.id))

  async function handleUnlink(processId: string) {
    try {
      await unlinkMutation.mutateAsync(processId)
      toast({ title: 'Processo desvinculado.' })
    } catch {
      toast({ title: 'Erro ao desvincular processo.', variant: 'destructive' })
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
        <span className="text-xs text-slate-500">
          {processes.length} {processes.length === 1 ? 'processo vinculado' : 'processos vinculados'}
        </span>
        <Button
          size="sm" variant="outline" className="h-7 text-xs gap-1.5"
          onClick={() => setLinkDialogOpen(true)}
        >
          <Link2 className="h-3.5 w-3.5" />
          Vincular Processo
        </Button>
      </div>

      {processes.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
          <FolderArchive className="h-8 w-8" />
          <p className="text-sm">Nenhum processo virtual vinculado a este convênio.</p>
          <p className="text-xs text-slate-300">Clique em "Vincular Processo" para associar.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {processes.map(vp => (
            <div key={vp.id} className="p-5 hover:bg-slate-50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {vp.processNumber}
                    </span>
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      {vp.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 line-clamp-2">{vp.subject}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href="/processos-virtuais"
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Ver
                  </a>
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 text-slate-400 hover:text-red-500"
                    title="Desvincular processo"
                    disabled={unlinkMutation.isPending}
                    onClick={() => handleUnlink(vp.id)}
                  >
                    <Link2Off className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {vp.documents.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {vp.documents.map(doc => (
                    <span
                      key={doc.id}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600"
                    >
                      <Paperclip className="h-3 w-3" />
                      {doc.fileName}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <LinkProcessDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        covenantId={covenantId}
        linkedIds={linkedIds}
      />
    </div>
  )
}

// ── Tab: Documentos ───────────────────────────────────────────────────────────

function DocumentosTab({ covenant }: { covenant: CovenantDetail }) {
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  // GED docs linked directly to this covenant
  const { data: gedData, isLoading: gedLoading } = useQuery({
    queryKey: ['library', 'list', { covenantId: covenant.id }],
    queryFn: () => libraryService.list({ covenantId: covenant.id, limit: 100 }),
  })

  // VP docs collected from all linked processes
  const vpDocs = covenant.virtualProcesses.flatMap(vp =>
    vp.documents.map(doc => ({ ...doc, processNumber: vp.processNumber }))
  )

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', file.name.replace(/\.pdf$/i, ''))
    formData.append('accessLevel', '1')

    setUploading(true)
    try {
      await libraryService.upload(formData, covenant.id)
      toast({ title: 'Documento enviado e vinculado ao convênio.' })
      qc.invalidateQueries({ queryKey: ['library', 'list', { covenantId: covenant.id }] })
      qc.invalidateQueries({ queryKey: ['covenant', covenant.id] })
    } catch {
      toast({ title: 'Erro no upload.', variant: 'destructive' })
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleDownload(docId: string) {
    try {
      const { url } = await libraryService.download(docId)
      window.open(url, '_blank')
    } catch {
      toast({ title: 'Erro ao baixar documento.', variant: 'destructive' })
    }
  }

  const gedDocs = gedData?.data ?? []
  const totalDocs = gedDocs.length + vpDocs.length

  return (
    <div>
      {/* Upload bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
        <span className="text-xs text-slate-500">
          {totalDocs} {totalDocs === 1 ? 'documento' : 'documentos'} no acervo deste convênio
        </span>
        <div>
          <input ref={fileInputRef} type="file" accept="application/pdf"
            className="hidden" onChange={handleUpload} />
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5"
            disabled={uploading} onClick={() => fileInputRef.current?.click()}>
            {uploading
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Upload className="h-3.5 w-3.5" />
            }
            Enviar PDF
          </Button>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {/* GED docs section */}
        {gedLoading
          ? Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3">
              <Skeleton className="h-8 w-8 rounded" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-2.5 w-24" />
              </div>
            </div>
          ))
          : gedDocs.length === 0 && vpDocs.length === 0
            ? (
              <div className="flex flex-col items-center justify-center gap-2 py-14 text-slate-400">
                <FileText className="h-8 w-8" />
                <p className="text-sm">Nenhum documento no acervo deste convênio.</p>
                <p className="text-xs text-slate-300">Use "Enviar PDF" para adicionar documentos.</p>
              </div>
            )
            : null
        }

        {gedDocs.map(doc => (
          <div key={doc.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 shrink-0">
              <FileText className="h-4.5 w-4.5 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{doc.title}</p>
              <p className="text-xs text-slate-400">
                {formatBytes(doc.fileSize)} · GED · {formatDate(doc.createdAt)}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => handleDownload(doc.id)}>
              <Download className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}

        {/* VP docs section */}
        {vpDocs.length > 0 && (
          <div className="px-5 py-2 bg-slate-50 border-t border-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Documentos de Processos Vinculados
            </p>
          </div>
        )}
        {vpDocs.map(doc => (
          <div key={doc.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 shrink-0">
              <Building2 className="h-4 w-4 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{doc.fileName}</p>
              <p className="text-xs text-slate-400">
                {formatBytes(doc.fileSize)} · Processo {doc.processNumber} · {doc.tag}
              </p>
            </div>
            <a href={doc.fileUrl} target="_blank" rel="noreferrer">
              <Button variant="ghost" size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                <Download className="h-3.5 w-3.5" />
              </Button>
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Sheet ────────────────────────────────────────────────────────────────

interface Props {
  covenantId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function CovenantDetailSheet({ covenantId, open, onOpenChange }: Props) {
  const qc = useQueryClient()

  const { data: covenant, isLoading } = useQuery({
    queryKey: ['covenant', covenantId],
    queryFn: () => covenantService.getOne(covenantId!),
    enabled: !!covenantId && open,
  })

  const detail = covenant as CovenantDetail | undefined

  const statusCfg = detail ? STATUS_CONFIG[detail.status] : null

  function handleSaved() {
    qc.invalidateQueries({ queryKey: ['covenants'] })
    qc.invalidateQueries({ queryKey: ['covenant', covenantId] })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-4xl p-0 flex flex-col gap-0 overflow-hidden"
      >
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b border-slate-200 shrink-0">
          <div className="min-w-0 pr-8">
            {isLoading ? (
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-64" />
                <Skeleton className="h-4 w-40" />
              </div>
            ) : detail ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <SheetTitle className="font-mono text-base font-semibold text-slate-900">
                    {detail.number}
                  </SheetTitle>
                  {statusCfg && (
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.className}`}>
                      {statusCfg.label}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 truncate">{detail.proponent?.name ? `Empresa: ${detail.proponent.name}` : '—'}</p>
              </>
            ) : null}
          </div>
        </SheetHeader>

        {/* Tabs */}
        {isLoading ? (
          <div className="flex-1 p-6 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : detail ? (
          <Tabs defaultValue="dados" className="flex flex-col flex-1 overflow-hidden">
            <TabsList className="mx-6 mt-4 mb-0 w-fit shrink-0">
              <TabsTrigger value="dados">Dados Gerais</TabsTrigger>
              <TabsTrigger value="processos">
                Processos
                {detail.virtualProcesses.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                    {detail.virtualProcesses.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="documentos">
                Documentos
                {(detail.libraryDocuments.length + detail.virtualProcesses.reduce((a, vp) => a + vp.documents.length, 0)) > 0 && (
                  <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                    {detail.libraryDocuments.length + detail.virtualProcesses.reduce((a, vp) => a + vp.documents.length, 0)}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dados" className="flex-1 overflow-hidden mt-0">
              <ScrollArea className="h-full">
                <DadosGeraisTab covenant={detail} onSaved={handleSaved} />
              </ScrollArea>
            </TabsContent>

            <TabsContent value="processos" className="flex-1 overflow-hidden mt-0">
              <ScrollArea className="h-full">
                <ProcessosTab processes={detail.virtualProcesses} covenantId={detail.id} />
              </ScrollArea>
            </TabsContent>

            <TabsContent value="documentos" className="flex-1 overflow-hidden mt-0">
              <ScrollArea className="h-full">
                <DocumentosTab covenant={detail} />
              </ScrollArea>
            </TabsContent>
          </Tabs>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
