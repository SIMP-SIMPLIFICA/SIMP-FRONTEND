import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { SignatureStatus } from '@/lib/api/councils'

const STATUS_MAP: Record<SignatureStatus, { label: string; cls: string }> = {
  PENDENTE: { label: 'Pendente', cls: 'bg-amber-100   text-amber-700   border-amber-200   hover:bg-amber-100'   },
  ASSINADO: { label: 'Assinado', cls: 'bg-emerald-100  text-emerald-700  border-emerald-200  hover:bg-emerald-100'  },
  FALHOU:   { label: 'Falhou',   cls: 'bg-red-100      text-red-700      border-red-200      hover:bg-red-100'      },
  EXPIRADO: { label: 'Expirado', cls: 'bg-slate-100    text-slate-500    border-slate-200    hover:bg-slate-100'    },
}

export function SignatureStatusBadge({ status }: { status: SignatureStatus }) {
  const cfg = STATUS_MAP[status] ?? { label: status, cls: '' }
  return (
    <Badge variant="outline" className={cn('font-medium', cfg.cls)}>
      {cfg.label}
    </Badge>
  )
}
