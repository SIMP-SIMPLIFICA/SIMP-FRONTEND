import { useState } from 'react'
import {
  CheckCircle2,
  XCircle,
  Minus,
  Pencil,
  Trash2,
  Check,
  X,
  Plus,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useAddAgendaItem,
  useUpdateAgendaItem,
  useRemoveAgendaItem,
} from '@/hooks/useCouncils'
import { toast } from '@/hooks/use-toast'
import type { MeetingAgendaItem } from '@/lib/api/councils'

function RowSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-slate-100">
      <Skeleton className="h-6 w-6 rounded-full shrink-0" />
      <div className="flex-1 flex flex-col gap-1.5">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}

interface EditState {
  id: string
  title: string
  description: string
}

interface Props {
  items: MeetingAgendaItem[]
  isLoading: boolean
  councilId: string
  meetingId: string
}

export function AgendaItemsEditor({ items, isLoading, councilId, meetingId }: Props) {
  const sorted = [...items].sort((a, b) => a.order - b.order)

  const [editing, setEditing]           = useState<EditState | null>(null)
  const [showAdd, setShowAdd]           = useState(false)
  const [newTitle, setNewTitle]         = useState('')
  const [newDescription, setNewDescription] = useState('')

  const addItem    = useAddAgendaItem(councilId, meetingId)
  const updateItem = useUpdateAgendaItem(councilId, meetingId)
  const removeItem = useRemoveAgendaItem(councilId, meetingId)

  function startEdit(item: MeetingAgendaItem) {
    setShowAdd(false)
    setEditing({ id: item.id, title: item.title, description: item.description ?? '' })
  }

  function cancelEdit() {
    setEditing(null)
  }

  function saveEdit() {
    if (!editing?.title.trim()) return
    updateItem.mutate(
      {
        itemId: editing.id,
        data: {
          title: editing.title.trim(),
          description: editing.description.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          setEditing(null)
          toast({ title: 'Item da pauta atualizado.' })
        },
        onError: () => {
          toast({ title: 'Erro ao atualizar item.', variant: 'destructive' })
        },
      },
    )
  }

  function deleteItem(itemId: string) {
    removeItem.mutate(itemId, {
      onSuccess: () => toast({ title: 'Item removido da pauta.' }),
      onError:   () => toast({ title: 'Erro ao remover item.', variant: 'destructive' }),
    })
  }

  function addNewItem() {
    if (!newTitle.trim()) return
    const nextOrder =
      sorted.length > 0 ? Math.max(...sorted.map((i) => i.order)) + 1 : 1
    addItem.mutate(
      {
        order:       nextOrder,
        title:       newTitle.trim(),
        description: newDescription.trim() || undefined,
      },
      {
        onSuccess: () => {
          setNewTitle('')
          setNewDescription('')
          setShowAdd(false)
          toast({ title: 'Item adicionado à pauta.' })
        },
        onError: () => {
          toast({ title: 'Erro ao adicionar item.', variant: 'destructive' })
        },
      },
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
        <h2 className="text-sm font-semibold text-slate-700">Pauta da Reunião</h2>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => { setShowAdd(true); setEditing(null) }}
          disabled={showAdd}
        >
          <Plus className="h-4 w-4" />
          Adicionar Item
        </Button>
      </div>

      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)
      ) : (
        <>
          {/* Empty state */}
          {sorted.length === 0 && !showAdd && (
            <p className="py-12 text-center text-slate-400 text-sm">
              Nenhuma pauta registrada. Adicione o primeiro item.
            </p>
          )}

          {/* Existing items */}
          {sorted.map((item) => {
            const isEditingThis = editing?.id === item.id

            if (isEditingThis && editing) {
              return (
                <div
                  key={item.id}
                  className="border-b border-slate-100 last:border-0 px-4 py-3 bg-blue-50/60"
                >
                  <div className="flex items-start gap-3">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold shrink-0 mt-0.5">
                      {item.order}
                    </span>
                    <div className="flex-1 flex flex-col gap-2">
                      <Input
                        autoFocus
                        value={editing.title}
                        onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                        placeholder="Título do item *"
                        className="h-8 text-sm bg-white"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) saveEdit()
                          if (e.key === 'Escape') cancelEdit()
                        }}
                      />
                      <Textarea
                        value={editing.description}
                        onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                        placeholder="Descrição (opcional)"
                        className="h-16 text-sm resize-none bg-white"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          className="h-7 gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={saveEdit}
                          disabled={!editing.title.trim() || updateItem.isPending}
                        >
                          {updateItem.isPending
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Check className="h-3.5 w-3.5" />
                          }
                          Salvar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 gap-1 text-slate-600"
                          onClick={cancelEdit}
                          disabled={updateItem.isPending}
                        >
                          <X className="h-3.5 w-3.5" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            }

            const isDeleting =
              removeItem.isPending && removeItem.variables === item.id

            return (
              <div
                key={item.id}
                className="flex items-start gap-3 px-4 py-3 border-b border-slate-100 last:border-0 group hover:bg-slate-50/60 transition-colors"
              >
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold shrink-0 mt-0.5">
                  {item.order}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{item.title}</p>
                  {item.description && (
                    <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                  )}
                </div>

                {/* Vote status */}
                <div className="shrink-0 mt-0.5">
                  {item.approved === true && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Aprovado
                    </span>
                  )}
                  {item.approved === false && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                      <XCircle className="h-3.5 w-3.5" />
                      Rejeitado
                    </span>
                  )}
                  {item.approved === null && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                      <Minus className="h-3.5 w-3.5" />
                      Não votado
                    </span>
                  )}
                </div>

                {/* Action buttons — visible on row hover */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700"
                    onClick={() => startEdit(item)}
                    disabled={isDeleting}
                    title="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => deleteItem(item.id)}
                    disabled={isDeleting}
                    title="Remover"
                  >
                    {isDeleting
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Trash2 className="h-3.5 w-3.5" />
                    }
                  </Button>
                </div>
              </div>
            )
          })}

          {/* Add new item inline form */}
          {showAdd && (
            <div className="px-4 py-3 bg-emerald-50/60 border-t border-slate-100">
              <div className="flex items-start gap-3">
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold shrink-0 mt-0.5">
                  {sorted.length + 1}
                </span>
                <div className="flex-1 flex flex-col gap-2">
                  <Input
                    autoFocus
                    placeholder="Título do item *"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="h-8 text-sm bg-white"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) addNewItem()
                      if (e.key === 'Escape') {
                        setShowAdd(false)
                        setNewTitle('')
                        setNewDescription('')
                      }
                    }}
                  />
                  <Textarea
                    placeholder="Descrição (opcional)"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="h-16 text-sm resize-none bg-white"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="h-7 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={addNewItem}
                      disabled={!newTitle.trim() || addItem.isPending}
                    >
                      {addItem.isPending
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Check className="h-3.5 w-3.5" />
                      }
                      Adicionar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 text-slate-600"
                      onClick={() => {
                        setShowAdd(false)
                        setNewTitle('')
                        setNewDescription('')
                      }}
                      disabled={addItem.isPending}
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
