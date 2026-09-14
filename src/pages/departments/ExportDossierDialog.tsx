import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import {
  DOSSIER_SECTIONS,
  DOSSIER_SECTION_LABELS,
  type Department,
  type DossierSection,
  departmentService,
} from '@/lib/api/departments'

/**
 * Exportar Dossiê do Setor (Épico 4, Fase 1).
 *
 * O PDF é montado pelo BACKEND, no motor universal, com QR Code e rodapé de
 * validação. Aqui só se escolhe o que entra e se recebe o arquivo — gerar
 * documento no cliente produziria um PDF sem hash e sem rastro, que ninguém
 * conseguiria conferir no Portal.
 */

/** Explica o que cada seção traz, para a escolha não ser adivinhação. */
const SECTION_HINTS: Record<DossierSection, string> = {
  members: 'Nome e e-mail de quem está lotado no setor.',
  cnpj: 'Inscrição própria do setor, quando houver.',
  councils: 'Conselhos municipais ligados a esta secretaria.',
  qdd: 'Fichas orçamentárias, fonte, natureza e valor orçado.',
  covenants: 'Convênios cuja execução é deste setor.',
  virtualProcesses: 'Processos conduzidos por esta secretaria.',
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  department: Department
}

export function ExportDossierDialog({ open, onOpenChange, department }: Props) {
  const [selected, setSelected] = useState<Set<DossierSection>>(new Set(DOSSIER_SECTIONS))
  const [isExporting, setIsExporting] = useState(false)

  function toggle(section: DossierSection) {
    setSelected(current => {
      const next = new Set(current)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  async function handleExport() {
    const sections = DOSSIER_SECTIONS.filter(section => selected.has(section))
    setIsExporting(true)

    try {
      const blob = await departmentService.downloadDossier(department.id, sections)

      // `URL.createObjectURL` + clique programático: é o caminho para entregar
      // um blob já em memória sem uma segunda ida ao servidor — que, além de
      // lenta, geraria um novo PDF com outro identificador.
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `dossie-${department.code}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      // Revogar é obrigatório: sem isso o blob fica retido até a aba fechar, e
      // exportar várias vezes vai acumulando arquivos inteiros na memória.
      URL.revokeObjectURL(url)

      toast({ title: 'Dossiê exportado.' })
      onOpenChange(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Não foi possível gerar o dossiê.'
      toast({ title: 'Erro ao exportar', description: message, variant: 'destructive' })
    } finally {
      setIsExporting(false)
    }
  }

  const noneSelected = selected.size === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar Dossiê do Setor</DialogTitle>
          <DialogDescription>
            Escolha o que entra no documento. O PDF sai com QR Code de validação e pode ser
            conferido no Portal Público.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {DOSSIER_SECTIONS.map(section => (
            <label
              key={section}
              className="flex items-start gap-3 cursor-pointer rounded-lg px-2 py-1.5 hover:bg-slate-50"
            >
              <Checkbox
                checked={selected.has(section)}
                onCheckedChange={() => toggle(section)}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm text-slate-800">
                  {DOSSIER_SECTION_LABELS[section]}
                </span>
                <span className="block text-xs text-slate-400">{SECTION_HINTS[section]}</span>
              </span>
            </label>
          ))}
        </div>

        {noneSelected && (
          <p className="text-xs text-amber-600">
            Marque ao menos uma seção para exportar.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Cancelar
          </Button>
          {/* Desabilitado com nenhuma seção marcada: o backend recusaria com
              400, e é melhor impedir antes que explicar depois. */}
          <Button onClick={handleExport} disabled={noneSelected || isExporting} className="gap-2">
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" />
                Exportar PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
