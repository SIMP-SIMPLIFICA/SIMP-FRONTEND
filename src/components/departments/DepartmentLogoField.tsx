import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ImageIcon, Loader2, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'
import { type Department, departmentService } from '@/lib/api/departments'

/**
 * Logo própria da secretaria, para o cabeçalho dos documentos dela.
 *
 * Sem logo, o documento cai na marca da prefeitura — é cascata, não ausência.
 * Por isso remover não é destrutivo: o setor volta à identidade do município.
 *
 * Só PNG e JPEG, e a recusa acontece ANTES do envio: o motor de PDF não embute
 * outros formatos, e deixar subir um WebP faria a logo sumir do documento em
 * silêncio — falha que só apareceria num PDF já emitido.
 */

const ACCEPTED = ['image/png', 'image/jpeg']
const MAX_BYTES = 2 * 1024 * 1024

interface Props {
  department: Department
  disabled?: boolean
}

export function DepartmentLogoField({ department, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)
  // Prévia local em vez de reler do servidor: o arquivo já está na memória do
  // navegador, e uma ida ao servidor só para mostrar o que o usuário acabou de
  // escolher seria trabalho à toa.
  const [preview, setPreview] = useState<string | null>(null)
  const [hasLogo, setHasLogo] = useState(Boolean(department.logoUrl))

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['departments'] })
  }

  async function handleFile(file: File) {
    if (!ACCEPTED.includes(file.type)) {
      toast({
        title: 'Formato não aceito',
        description: 'A logo precisa ser PNG ou JPEG para entrar nos documentos oficiais.',
        variant: 'destructive',
      })
      return
    }
    if (file.size > MAX_BYTES) {
      toast({ title: 'Arquivo muito grande', description: 'A logo deve ter no máximo 2 MB.', variant: 'destructive' })
      return
    }

    setBusy(true)
    try {
      await departmentService.uploadLogo(department.id, file)
      setPreview(URL.createObjectURL(file))
      setHasLogo(true)
      refresh()
      toast({ title: 'Logo atualizada.' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Não foi possível enviar a logo.'
      toast({ title: 'Erro no envio', description: message, variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove() {
    setBusy(true)
    try {
      await departmentService.removeLogo(department.id)
      setPreview(null)
      setHasLogo(false)
      refresh()
      toast({ title: 'Logo removida.', description: 'Os documentos voltam a usar a logo da prefeitura.' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Não foi possível remover a logo.'
      toast({ title: 'Erro ao remover', description: message, variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <Label>Logo do Setor</Label>

      <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
        <div className="h-14 w-14 shrink-0 rounded-md border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
          {preview ? (
            <img src={preview} alt="Prévia da logo do setor" className="h-full w-full object-contain" />
          ) : (
            <ImageIcon className="h-5 w-5 text-slate-300" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500">
            {hasLogo
              ? 'Esta logo aparece no cabeçalho dos documentos do setor.'
              : 'Sem logo própria, os documentos usam a marca da prefeitura.'}
          </p>
          <div className="flex gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              disabled={disabled || busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              {hasLogo ? 'Trocar' : 'Enviar'}
            </Button>

            {hasLogo && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs text-red-600 hover:text-red-700"
                disabled={disabled || busy}
                onClick={handleRemove}
              >
                <Trash2 className="h-3 w-3" />
                Remover
              </Button>
            )}
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          // Limpa o valor para que escolher O MESMO arquivo de novo volte a
          // disparar o evento — sem isso, corrigir um upload que falhou exigiria
          // selecionar outro arquivo antes.
          e.target.value = ''
          if (file) void handleFile(file)
        }}
      />
    </div>
  )
}
