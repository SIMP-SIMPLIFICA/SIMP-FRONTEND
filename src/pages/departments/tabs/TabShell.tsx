import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, Loader2 } from 'lucide-react'

/**
 * Casca das abas de vínculo do departamento.
 *
 * As três abas têm exatamente os mesmos três estados — carregando, erro e
 * vazio — e repeti-los em cada uma faria com que a terceira acabasse com um
 * texto ligeiramente diferente das outras duas.
 *
 * O estado vazio é EDUCACIONAL, não uma tabela em branco: quem abre a aba
 * "Convênios" de um setor recém-criado precisa saber que não há nada ali e
 * onde isso se cadastra, em vez de encarar um cabeçalho de tabela solto e
 * concluir que a tela quebrou.
 */

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 py-14 px-6 text-center">
      <div className="h-11 w-11 rounded-full bg-white border border-slate-200 flex items-center justify-center">
        <Icon className="h-5 w-5 text-slate-400" />
      </div>
      <p className="text-sm font-medium text-slate-700">{title}</p>
      <p className="text-xs text-slate-400 max-w-sm">{description}</p>
    </div>
  )
}

interface TabShellProps<T> {
  isLoading: boolean
  isError: boolean
  items: T[] | undefined
  empty: EmptyStateProps
  /** Mensagem de falha em pt-BR, específica do vínculo. */
  errorMessage: string
  children: (items: T[]) => React.ReactNode
}

export function TabShell<T>({
  isLoading,
  isError,
  items,
  empty,
  errorMessage,
  children,
}: TabShellProps<T>) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-14 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando...
      </div>
    )
  }

  if (isError) {
    // Falha e vazio precisam ser VISUALMENTE distintos: tratar erro como lista
    // vazia faria o usuário concluir que o setor não tem convênio nenhum quando
    // na verdade a consulta não chegou a acontecer.
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50/60 py-14 px-6 text-center">
        <AlertTriangle className="h-6 w-6 text-red-400" />
        <p className="text-sm font-medium text-red-700">{errorMessage}</p>
        <p className="text-xs text-red-400">Atualize a página para tentar novamente.</p>
      </div>
    )
  }

  if (!items || items.length === 0) {
    return <EmptyState {...empty} />
  }

  return <>{children(items)}</>
}
