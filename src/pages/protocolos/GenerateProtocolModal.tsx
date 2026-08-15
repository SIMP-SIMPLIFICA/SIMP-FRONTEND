import { useRef, useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  CheckCircle2, Copy, Paperclip, Loader2, Clock, FileText,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useGenerateProtocol, useAttachProtocolDocument } from '@/hooks/useProtocols'
import { useDepartmentOptions } from '@/hooks/useDepartments'
import { useMe } from '@/hooks/useMe'
import type { OfficialDocument, DocumentCategory } from '@/lib/api/protocols'

// ─── Document type options by category ───────────────────────────────────────

const COMUNICACAO_TYPES = ['Ofício', 'Ofício Circular', 'Memorando', 'CI', 'Nota Informativa']
const NORMATIVO_TYPES   = ['Lei', 'Decreto', 'Portaria', 'Edital', 'Resolução', 'Instrução Normativa']

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  documentCategory: DocumentCategory
  documentType: string
  numberingType: 'SEQUENTIAL' | 'RANDOM'
  departmentId: string
  subject: string
  recipient: string
  /** Ato Normativo: número oficial digitado pelo usuário. */
  actNumber: string
  /** Ato Normativo: ano do ato (pode ser exercício anterior). */
  actYear: string
}

function emptyForm(category: DocumentCategory): FormState {
  return {
    documentCategory: category,
    documentType: '',
    numberingType: 'SEQUENTIAL',
    departmentId: '',
    subject: '',
    recipient: '',
    actNumber: '',
    actYear: String(new Date().getFullYear()),
  }
}

// ─── Success screen ───────────────────────────────────────────────────────────

function SuccessScreen({
  doc,
  onClose,
}: {
  doc: OfficialDocument
  onClose: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const attachDocument = useAttachProtocolDocument()
  const [uploading, setUploading] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(doc.formattedNumber)
    toast({ title: 'Número copiado para a área de transferência.' })
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await attachDocument.mutateAsync({ protocol: doc, file })
      toast({ title: 'PDF anexado. Documento marcado como Emitido.' })
      onClose()
    } catch (err: unknown) {
      const data = err as { message?: string; issues?: Array<{ message: string }> }
      const msg = data?.message ?? data?.issues?.[0]?.message ?? 'Verifique o arquivo e tente novamente.'
      toast({ title: 'Erro ao anexar PDF', description: msg, variant: 'destructive' })
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 py-4 px-2 text-center">
      {/* Animated check */}
      <div className="relative">
        <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center animate-in zoom-in-50 duration-300">
          <CheckCircle2 className="h-10 w-10 text-emerald-600" strokeWidth={1.5} />
        </div>
        <div className="absolute inset-0 rounded-full bg-emerald-200 animate-ping opacity-20" />
      </div>

      <div>
        <p className="text-sm text-slate-500 mb-2">
          {doc.documentCategory === 'NORMATIVO' ? 'Ato normativo registrado' : 'Número oficial reservado'}
        </p>
        <div className="inline-block bg-slate-900 text-white font-mono text-lg font-bold px-6 py-3 rounded-xl tracking-wider shadow-lg">
          {doc.formattedNumber}
        </div>
      </div>

      <div className="text-left w-full bg-slate-50 rounded-lg px-4 py-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">Tipo</span>
          <span className="text-slate-700 font-medium">{doc.documentType}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Setor</span>
          <span className="text-slate-700 font-medium">{doc.sector}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Status</span>
          <span className="text-blue-600 font-medium">Reservado</span>
        </div>
      </div>

      <div className="flex gap-3 w-full">
        <Button
          variant="outline"
          className="flex-1 gap-2"
          onClick={handleCopy}
        >
          <Copy className="h-4 w-4" />
          Copiar Número
        </Button>
        <Button
          className="flex-1 gap-2 bg-indigo-600 hover:bg-indigo-700"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Paperclip className="h-4 w-4" />
          }
          Anexar PDF Agora
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      <button
        onClick={onClose}
        className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
      >
        Fechar sem anexar
      </button>
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  /** Categoria fixada pela aba de origem (Ato Normativo / Comunicação) — ver OfficialProtocolsPage. */
  category: DocumentCategory
  /** Admins (protocols:admin ou super admin) veem todos os departamentos da organização; demais usuários veem apenas os seus. */
  isAdmin: boolean
}

export default function GenerateProtocolModal({ open, onOpenChange, category, isAdmin }: Props) {
  const { data: deptData } = useDepartmentOptions()
  const { data: me } = useMe()
  const allDepartments = (deptData?.data ?? []).filter(d => d.isActive)
  const departments = isAdmin ? allDepartments : (me?.user?.departments ?? [])

  const [form, setForm]       = useState<FormState>(() => emptyForm(category))
  const [generated, setGenerated] = useState<OfficialDocument | null>(null)
  const generateMutation      = useGenerateProtocol()

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(prev => {
      const next = { ...prev, [k]: v }
      if (k === 'documentCategory') {
        next.documentType = ''
        // normativos always sequential
        if (v === 'NORMATIVO') next.numberingType = 'SEQUENTIAL'
      }
      return next
    })
  }

  function handleClose() {
    setForm(emptyForm(category))
    setGenerated(null)
    onOpenChange(false)
  }

  const typeOptions = form.documentCategory === 'NORMATIVO'
    ? NORMATIVO_TYPES
    : COMUNICACAO_TYPES

  const isNormativo = form.documentCategory === 'NORMATIVO'
  const isValid = !!(
    form.documentType &&
    form.subject.trim() &&
    (isNormativo || form.departmentId) &&
    (isNormativo || form.recipient.trim()) &&
    (!isNormativo || (Number(form.actNumber) > 0 && Number(form.actYear) > 1900))
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return
    try {
      const doc = await generateMutation.mutateAsync({
        documentCategory: form.documentCategory,
        documentType:     form.documentType,
        subject:          form.subject.trim(),
        recipient:        isNormativo ? undefined : form.recipient.trim() || undefined,
        departmentId:     isNormativo ? undefined : form.departmentId,
        numberingType:    isNormativo ? 'MANUAL' : form.numberingType,
        sequenceNumber:   isNormativo ? Number(form.actNumber) : undefined,
        year:             isNormativo ? Number(form.actYear) : undefined,
      })
      setGenerated(doc)
    } catch (err: unknown) {
      const data = err as { message?: string; issues?: Array<{ message: string }> }
      const msg = data?.message ?? data?.issues?.[0]?.message ?? 'Verifique os campos e tente novamente.'
      toast({
        title: isNormativo ? 'Erro ao registrar ato' : 'Erro ao gerar número',
        description: msg,
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="sm:max-w-2xl w-[95vw] overflow-hidden p-0 gap-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>
            {generated
              ? (isNormativo ? 'Ato Normativo Registrado com Sucesso' : 'Número Gerado com Sucesso')
              : isNormativo ? 'Registrar Ato Normativo' : 'Gerar Nova Comunicação'}
          </DialogTitle>
          {!generated && (
            <DialogDescription>
              {isNormativo
                ? 'Informe o número oficial do ato e preencha os dados do documento.'
                : 'Preencha os dados do documento. A numeração é atribuída automaticamente.'}
            </DialogDescription>
          )}
        </DialogHeader>

        {generated ? (
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-4">
              <SuccessScreen doc={generated} onClose={handleClose} />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
            <div className="flex-1 overflow-y-auto">
              <div className="px-6 py-5 space-y-5">

                {/* Campo 1: Tipo de Numeração — apenas Comunicação (Normativo é sempre sequencial) */}
                {form.documentCategory === 'COMUNICACAO' && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Tipo de Numeração</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {([
                        { value: 'SEQUENTIAL', label: 'Sequencial', desc: 'Nº 001, 002, 003…' },
                        { value: 'RANDOM',     label: 'Aleatório',  desc: 'Código único não sequencial' },
                      ] as const).map(opt => {
                        const selected = form.numberingType === opt.value
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => set('numberingType', opt.value)}
                            className={`rounded-xl border-2 px-4 py-3 text-left transition-all ${
                              selected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <p className={`text-sm font-semibold ${selected ? 'text-blue-700' : 'text-slate-700'}`}>
                              {opt.label}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Campo 1b: Número e Ano — apenas Ato Normativo (numeração manual).
                    A numeração oficial vem do processo legislativo, externa ao sistema. */}
                {isNormativo && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>
                        Número da Lei/Ato <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        placeholder="Ex: 1"
                        value={form.actNumber}
                        onChange={e => set('actNumber', e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>
                        Ano <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="number"
                        min={1900}
                        max={2200}
                        placeholder="Ex: 2026"
                        value={form.actYear}
                        onChange={e => set('actYear', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Campo 2: Tipo */}
                <div className="space-y-1.5">
                  <Label>
                    Tipo de Documento <span className="text-red-500">*</span>
                  </Label>
                  <Select value={form.documentType} onValueChange={v => set('documentType', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar tipo…" />
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Campo 3: Setor */}
                <div className="space-y-1.5">
                  <Label>Setor de Origem</Label>
                  {isNormativo ? (
                    <div className="flex items-center gap-2 h-9 px-3 border border-slate-200 rounded-md bg-slate-50 text-sm text-slate-400">
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      Numeração Centralizada — Geral do Município
                    </div>
                  ) : (
                    <Select value={form.departmentId} onValueChange={v => set('departmentId', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar departamento..." />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map(d => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.code} — {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Campo 4: Assunto */}
                {form.documentType && (
                  <>
                    <div className="space-y-1.5">
                      <Label>
                        Assunto / Ementa <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        rows={3}
                        placeholder="Descreva o objeto ou ementa do documento…"
                        value={form.subject}
                        onChange={e => set('subject', e.target.value)}
                        className="resize-none"
                        required
                      />
                    </div>

                    {/* Destinatário — apenas Comunicação */}
                    {!isNormativo && (
                      <div className="space-y-1.5">
                        <Label>
                          Destinatário <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          placeholder="Ex: Secretaria Municipal de Educação"
                          value={form.recipient}
                          onChange={e => set('recipient', e.target.value)}
                          required
                        />
                      </div>
                    )}

                    {/* Data — aviso sutil */}
                    <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2.5">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      A data e hora serão registradas automaticamente pelo sistema no momento da geração.
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t">
              <Button type="button" variant="outline" onClick={handleClose}
                disabled={generateMutation.isPending}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 gap-2"
                disabled={!isValid || generateMutation.isPending}
              >
                {generateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isNormativo ? 'Registrar Ato' : 'Gerar Número'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
