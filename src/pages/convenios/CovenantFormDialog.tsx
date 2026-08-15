import { useMemo, useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon, Loader2, Plus } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from '@/hooks/use-toast'
import { useCreateCovenant, useUpdateCovenant } from '@/hooks/useCovenants'
import { useCovenantTypes, useCreateCovenantType } from '@/hooks/useCovenants'
import { useConvenentes, useCreateConvenente } from '@/hooks/useCovenants'
import { useConcedentes, useCreateConcedente } from '@/hooks/useCovenants'
import { useVirtualProcessCompanies, useCreateVirtualProcessCompany } from '@/hooks/useVirtualProcesses'
import type { Covenant, CovenantStatus, CreateCovenantDTO } from '@/lib/api/covenants'

// ─── Status options ───────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: CovenantStatus; label: string }[] = [
  { value: 'EM_ANALISE',       label: 'Em Análise' },
  { value: 'APROVADO',         label: 'Aprovado' },
  { value: 'EM_EXECUCAO',      label: 'Em Execução' },
  { value: 'PRESTACAO_CONTAS', label: 'Prestação de Contas' },
  { value: 'CONCLUIDO',        label: 'Concluído' },
  { value: 'DEVOLVIDO',        label: 'Devolvido' },
]

// ─── Currency helpers ─────────────────────────────────────────────────────────

function parseCurrency(raw: string): string {
  return raw.replace(/[^\d,]/g, '')
}

function formatCurrencyInput(raw: string): string {
  if (!raw) return ''
  const num = parseFloat(raw.replace(',', '.'))
  if (isNaN(num)) return raw
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num)
}

function currencyToNumber(raw: string): number | undefined {
  if (!raw) return undefined
  const cleaned = raw.replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? undefined : n
}

// ─── DateField ────────────────────────────────────────────────────────────────

function DateField({ label, date, onChange }: {
  label: string; date: Date | undefined; onChange: (d: Date | undefined) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button" variant="outline"
            className={`w-full justify-start text-left font-normal text-sm ${!date ? 'text-muted-foreground' : ''}`}
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

// ─── EntitySelectField ────────────────────────────────────────────────────────

interface EntityItem { id: string; name: string }

function EntitySelectField({
  label, value, onChange, items, placeholder, onAddNew, isLoading,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  items: EntityItem[]
  placeholder: string
  onAddNew: () => void
  isLoading?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex gap-1.5">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="flex-1 text-sm">
            <SelectValue placeholder={isLoading ? 'Carregando…' : placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— Nenhum —</SelectItem>
            {items.map(item => (
              <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button" variant="outline" size="icon"
          className="shrink-0 h-9 w-9"
          title={`Novo ${label}`}
          onClick={onAddNew}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ─── CreateEntityDialog (name + optional cnpj) ───────────────────────────────

function CreateEntityDialog({
  open, onOpenChange, title, onSave, isSaving,
}: {
  open: boolean; onOpenChange: (v: boolean) => void
  title: string; onSave: (name: string, cnpj?: string) => void; isSaving: boolean
}) {
  const [name, setName] = useState('')
  const [cnpj, setCnpj] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onSave(name.trim(), cnpj.trim() || undefined)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="entity-name">Nome <span className="text-red-500">*</span></Label>
            <Input id="entity-name" required autoFocus placeholder="Ex: Fundo Municipal de Saúde"
              value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="entity-cnpj">CNPJ</Label>
            <Input id="entity-cnpj" placeholder="00.000.000/0000-00"
              value={cnpj} onChange={e => setCnpj(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancelar</Button>
            <Button type="submit" disabled={isSaving || !name.trim()} className="bg-emerald-600 hover:bg-emerald-700">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── CreateTypeDialog (name only) ─────────────────────────────────────────────

function CreateTypeDialog({
  open, onOpenChange, onSave, isSaving,
}: {
  open: boolean; onOpenChange: (v: boolean) => void
  onSave: (name: string) => void; isSaving: boolean
}) {
  const [name, setName] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onSave(name.trim())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Novo Tipo de Convênio</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="type-name">Nome <span className="text-red-500">*</span></Label>
            <Input id="type-name" required autoFocus placeholder="Ex: Emenda Especial"
              value={name} onChange={e => setName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancelar</Button>
            <Button type="submit" disabled={isSaving || !name.trim()} className="bg-emerald-600 hover:bg-emerald-700">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  number: string; typeId: string; proponentId: string
  convenenteId: string; concedenteId: string
  processObject: string; budgetaryAction: string; status: CovenantStatus | ''
  executionStartDate: Date | undefined; validityStartDate: Date | undefined; validityEndDate: Date | undefined
  termDays: string; transferValue: string; counterpartValue: string
  bankName: string; bankAgency: string; bankAccount: string
}

const EMPTY: FormState = {
  number: '', typeId: '', proponentId: '', convenenteId: '', concedenteId: '',
  processObject: '', budgetaryAction: '', status: '',
  executionStartDate: undefined, validityStartDate: undefined, validityEndDate: undefined,
  termDays: '', transferValue: '', counterpartValue: '',
  bankName: '', bankAgency: '', bankAccount: '',
}

// ─── Main dialog ──────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  covenant: Covenant | null
}

export default function CovenantFormDialog({ open, onOpenChange, covenant }: Props) {
  const [form, setForm] = useState<FormState>(() => {
    if (covenant) {
      return {
        number:             covenant.number,
        typeId:             covenant.typeId        ?? '',
        proponentId:        covenant.proponentId   ?? '',
        convenenteId:       covenant.convenenteId  ?? '',
        concedenteId:       covenant.concedenteId  ?? '',
        processObject:      covenant.processObject,
        budgetaryAction:    covenant.budgetaryAction ?? '',
        status:             covenant.status,
        executionStartDate: covenant.executionStartDate ? new Date(covenant.executionStartDate) : undefined,
        validityStartDate:  covenant.validityStartDate  ? new Date(covenant.validityStartDate)  : undefined,
        validityEndDate:    covenant.validityEndDate    ? new Date(covenant.validityEndDate)    : undefined,
        termDays:           covenant.termDays != null ? String(covenant.termDays) : '',
        transferValue:      covenant.transferValue    != null ? formatCurrencyInput(String(Number(covenant.transferValue)))  : '',
        counterpartValue:   covenant.counterpartValue != null ? formatCurrencyInput(String(Number(covenant.counterpartValue))) : '',
        bankName:    covenant.bankName    ?? '',
        bankAgency:  covenant.bankAgency  ?? '',
        bankAccount: covenant.bankAccount ?? '',
      }
    }
    return EMPTY
  })

  const [typeDialogOpen,       setTypeDialogOpen]       = useState(false)
  const [proponentDialogOpen,  setProponentDialogOpen]  = useState(false)
  const [convenenteDialogOpen, setConvenenteDialogOpen] = useState(false)
  const [concedenteDialogOpen, setConcedenteDialogOpen] = useState(false)

  const { data: covenantTypes = [], isLoading: loadingTypes }       = useCovenantTypes()
  const { data: convenentes   = [], isLoading: loadingConvenentes } = useConvenentes()
  const { data: concedentes   = [], isLoading: loadingConcedentes } = useConcedentes()
  const { data: companies     = [], isLoading: loadingCompanies }   = useVirtualProcessCompanies()

  const createCovenant   = useCreateCovenant()
  const updateCovenant   = useUpdateCovenant()
  const createType       = useCreateCovenantType()
  const createConvenente = useCreateConvenente()
  const createConcedente = useCreateConcedente()
  const createCompany    = useCreateVirtualProcessCompany()

  const isBusy = createCovenant.isPending || updateCovenant.isPending

  // Auto-calculate termDays from validity dates (derived — no effect needed)
  const autoTermDays = useMemo(() => {
    if (form.validityStartDate && form.validityEndDate) {
      const days = differenceInDays(form.validityEndDate, form.validityStartDate)
      return days >= 0 ? String(days) : ''
    }
    return ''
  }, [form.validityStartDate, form.validityEndDate])

  function set(field: keyof FormState, value: string | Date | undefined) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleCreateType(name: string) {
    try {
      const created = await createType.mutateAsync(name)
      setForm(prev => ({ ...prev, typeId: created.id }))
      setTypeDialogOpen(false)
    } catch { toast({ title: 'Erro ao criar tipo.', variant: 'destructive' }) }
  }

  async function handleCreateProponent(name: string, cnpj?: string) {
    try {
      const created = await createCompany.mutateAsync({ name, cnpj: cnpj ?? null })
      setForm(prev => ({ ...prev, proponentId: created.id }))
      setProponentDialogOpen(false)
    } catch { toast({ title: 'Erro ao criar empresa.', variant: 'destructive' }) }
  }

  async function handleCreateConvenente(name: string, cnpj?: string) {
    try {
      const created = await createConvenente.mutateAsync({ name, cnpj })
      setForm(prev => ({ ...prev, convenenteId: created.id }))
      setConvenenteDialogOpen(false)
    } catch { toast({ title: 'Erro ao criar convenente.', variant: 'destructive' }) }
  }

  async function handleCreateConcedente(name: string, cnpj?: string) {
    try {
      const created = await createConcedente.mutateAsync({ name, cnpj })
      setForm(prev => ({ ...prev, concedenteId: created.id }))
      setConcedenteDialogOpen(false)
    } catch { toast({ title: 'Erro ao criar concedente.', variant: 'destructive' }) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.status) {
      toast({ title: 'Status é obrigatório.', variant: 'destructive' })
      return
    }
    const payload: CreateCovenantDTO = {
      number:        form.number,
      processObject: form.processObject,
      status:        form.status as CovenantStatus,
      typeId:        form.typeId        || undefined,
      proponentId:   form.proponentId   || undefined,
      convenenteId:  form.convenenteId  || undefined,
      concedenteId:  form.concedenteId  || undefined,
      budgetaryAction:    form.budgetaryAction    || undefined,
      executionStartDate: form.executionStartDate?.toISOString(),
      validityStartDate:  form.validityStartDate?.toISOString(),
      validityEndDate:    form.validityEndDate?.toISOString(),
      termDays:           autoTermDays ? Number(autoTermDays) : undefined,
      transferValue:      currencyToNumber(form.transferValue),
      counterpartValue:   currencyToNumber(form.counterpartValue),
      bankName:    form.bankName    || undefined,
      bankAgency:  form.bankAgency  || undefined,
      bankAccount: form.bankAccount || undefined,
    }
    try {
      if (covenant) {
        await updateCovenant.mutateAsync({ id: covenant.id, data: payload })
        toast({ title: 'Convênio atualizado com sucesso.' })
      } else {
        await createCovenant.mutateAsync(payload)
        toast({ title: 'Convênio criado com sucesso.' })
      }
      onOpenChange(false)
    } catch {
      toast({ title: 'Erro ao salvar convênio.', variant: 'destructive' })
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl overflow-hidden p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>{covenant ? 'Editar Convênio' : 'Novo Convênio'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <ScrollArea className="max-h-[70vh]">
              <div className="px-6 py-5 space-y-5">

                {/* Número + Tipo */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="number">Número <span className="text-red-500">*</span></Label>
                    <Input id="number" required placeholder="010400.00464/2021"
                      value={form.number} onChange={e => set('number', e.target.value)} />
                  </div>
                  <EntitySelectField
                    label="Tipo"
                    value={form.typeId}
                    onChange={v => set('typeId', v === '__none__' ? '' : v)}
                    items={covenantTypes}
                    placeholder="Selecionar tipo"
                    onAddNew={() => setTypeDialogOpen(true)}
                    isLoading={loadingTypes}
                  />
                </div>

                {/* Empresa / Contratada */}
                <EntitySelectField
                  label="Empresa / Contratada"
                  value={form.proponentId}
                  onChange={v => set('proponentId', v === '__none__' ? '' : v)}
                  items={companies}
                  placeholder="Selecionar empresa"
                  onAddNew={() => setProponentDialogOpen(true)}
                  isLoading={loadingCompanies}
                />

                {/* Convenente + Concedente */}
                <div className="grid grid-cols-2 gap-4">
                  <EntitySelectField
                    label="Convenente"
                    value={form.convenenteId}
                    onChange={v => set('convenenteId', v === '__none__' ? '' : v)}
                    items={convenentes}
                    placeholder="Selecionar convenente"
                    onAddNew={() => setConvenenteDialogOpen(true)}
                    isLoading={loadingConvenentes}
                  />
                  <EntitySelectField
                    label="Concedente"
                    value={form.concedenteId}
                    onChange={v => set('concedenteId', v === '__none__' ? '' : v)}
                    items={concedentes}
                    placeholder="Selecionar concedente"
                    onAddNew={() => setConcedenteDialogOpen(true)}
                    isLoading={loadingConcedentes}
                  />
                </div>

                {/* Objeto */}
                <div className="space-y-1.5">
                  <Label htmlFor="processObject">Objeto <span className="text-red-500">*</span></Label>
                  <Textarea id="processObject" required rows={3}
                    placeholder="Descrição do objeto do convênio…"
                    value={form.processObject} onChange={e => set('processObject', e.target.value)} />
                </div>

                {/* Ação Orçamentária + Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="budgetaryAction">Ação Orçamentária</Label>
                    <Input id="budgetaryAction" placeholder="Ex: 2055"
                      value={form.budgetaryAction} onChange={e => set('budgetaryAction', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Status <span className="text-red-500">*</span></Label>
                    <Select value={form.status} onValueChange={v => set('status', v)}>
                      <SelectTrigger><SelectValue placeholder="Selecionar status" /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Datas */}
                <div className="grid grid-cols-2 gap-4">
                  <DateField label="Início de Execução" date={form.executionStartDate}
                    onChange={d => set('executionStartDate', d)} />
                  <DateField label="Vigência — Início" date={form.validityStartDate}
                    onChange={d => set('validityStartDate', d)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <DateField label="Vigência — Fim" date={form.validityEndDate}
                    onChange={d => set('validityEndDate', d)} />
                  <div className="space-y-1.5">
                    <Label htmlFor="termDays">Prazo (dias)</Label>
                    <Input id="termDays" readOnly
                      placeholder="Calculado automaticamente"
                      className="bg-slate-50 cursor-not-allowed text-slate-500"
                      value={autoTermDays} />
                    {(!form.validityStartDate || !form.validityEndDate) && (
                      <p className="text-xs text-slate-400">Preencha Vigência Início e Fim</p>
                    )}
                  </div>
                </div>

                {/* Valores */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="transferValue">Valor da Transferência (R$)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">R$</span>
                      <Input id="transferValue" className="pl-9" placeholder="0,00"
                        value={form.transferValue}
                        onChange={e => set('transferValue', parseCurrency(e.target.value))}
                        onBlur={() => set('transferValue', formatCurrencyInput(form.transferValue))} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="counterpartValue">Contrapartida (R$)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">R$</span>
                      <Input id="counterpartValue" className="pl-9" placeholder="0,00"
                        value={form.counterpartValue}
                        onChange={e => set('counterpartValue', parseCurrency(e.target.value))}
                        onBlur={() => set('counterpartValue', formatCurrencyInput(form.counterpartValue))} />
                    </div>
                  </div>
                </div>

                {/* Dados bancários */}
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Dados Bancários
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="bankName">Banco</Label>
                      <Input id="bankName" placeholder="Caixa Econômica"
                        value={form.bankName} onChange={e => set('bankName', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bankAgency">Agência</Label>
                      <Input id="bankAgency" placeholder="0001"
                        value={form.bankAgency} onChange={e => set('bankAgency', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bankAccount">Conta</Label>
                      <Input id="bankAccount" placeholder="12345-6"
                        value={form.bankAccount} onChange={e => set('bankAccount', e.target.value)} />
                    </div>
                  </div>
                </div>

              </div>
            </ScrollArea>

            <DialogFooter className="px-6 py-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isBusy}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isBusy} className="bg-emerald-600 hover:bg-emerald-700">
                {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {covenant ? 'Salvar alterações' : 'Criar convênio'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {typeDialogOpen && (
        <CreateTypeDialog
          open={typeDialogOpen} onOpenChange={setTypeDialogOpen}
          onSave={handleCreateType} isSaving={createType.isPending}
        />
      )}
      {proponentDialogOpen && (
        <CreateEntityDialog
          open={proponentDialogOpen} onOpenChange={setProponentDialogOpen}
          title="Nova Empresa / Contratada"
          onSave={handleCreateProponent} isSaving={createCompany.isPending}
        />
      )}
      {convenenteDialogOpen && (
        <CreateEntityDialog
          open={convenenteDialogOpen} onOpenChange={setConvenenteDialogOpen}
          title="Novo Convenente"
          onSave={handleCreateConvenente} isSaving={createConvenente.isPending}
        />
      )}
      {concedenteDialogOpen && (
        <CreateEntityDialog
          open={concedenteDialogOpen} onOpenChange={setConcedenteDialogOpen}
          title="Novo Concedente"
          onSave={handleCreateConcedente} isSaving={createConcedente.isPending}
        />
      )}
    </>
  )
}
