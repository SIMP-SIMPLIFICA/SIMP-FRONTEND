import { useEffect, useRef, useState } from 'react'
import { Loader2, UserMinus, UserPlus, Crown } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from '@/hooks/use-toast'
import {
  useDepartmentMembers,
  useAddDepartmentMembers,
  useRemoveDepartmentMember,
  useUpdateDepartment,
} from '@/hooks/useDepartments'
import { workspaceService } from '@/lib/api/workspaces'
import type { Department, DepartmentMember } from '@/lib/api/departments'

interface OrgUser {
  id: string
  firstName: string
  lastName: string | null
  email: string
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  department: Department | null
}

function initials(u: { firstName: string | null; lastName: string | null }) {
  return ((u.firstName?.[0] ?? '') + (u.lastName?.[0] ?? '')).toUpperCase() || '?'
}

// Referência estável para evitar loop infinito no useEffect que depende de `members`
const EMPTY_MEMBERS: DepartmentMember[] = []

export function DepartmentMembersSheet({ open, onOpenChange, department }: Props) {
  const deptId = department?.id ?? null

  const { data: members = EMPTY_MEMBERS, isLoading: loadingMembers } = useDepartmentMembers(deptId)
  const addMut    = useAddDepartmentMembers()
  const removeMut = useRemoveDepartmentMember()
  const updateDept = useUpdateDepartment()

  // Manager select
  const [managerId, setManagerId] = useState<string>('none')
  useEffect(() => {
    setManagerId(department?.managerId ?? 'none')
  }, [department?.managerId])

  async function handleSetManager(value: string) {
    if (!deptId) return
    const newManagerId = value === 'none' ? null : value
    setManagerId(value)
    try {
      await updateDept.mutateAsync({ id: deptId, data: { managerId: newManagerId } })
      toast({ title: 'Chefia atualizada.' })
    } catch {
      toast({ title: 'Erro ao atualizar chefia.', variant: 'destructive' })
    }
  }

  // Add member combobox
  const [search, setSearch] = useState('')
  const [suggestions, setSuggestions] = useState<OrgUser[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedUser, setSelectedUser] = useState<OrgUser | null>(null)
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (selectedUser) return
    if (search.trim().length < 2) { setSuggestions([]); setShowDropdown(false); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const memberIds = new Set(members.map((m: DepartmentMember) => m.id))
        const results = await workspaceService.searchOrgUsers(search.trim())
        const filtered = results.filter(u => !memberIds.has(u.id))
        setSuggestions(filtered)
        setShowDropdown(filtered.length > 0)
      } catch {
        setSuggestions([])
      } finally {
        setSearching(false)
      }
    }, 300)
  }, [search, selectedUser, members])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleAddMember() {
    if (!deptId || !selectedUser) return
    try {
      await addMut.mutateAsync({ id: deptId, userIds: [selectedUser.id] })
      toast({ title: `${selectedUser.firstName} adicionado ao departamento.` })
      setSearch('')
      setSelectedUser(null)
      setSuggestions([])
    } catch {
      toast({ title: 'Erro ao adicionar membro.', variant: 'destructive' })
    }
  }

  async function handleRemove(userId: string, name: string) {
    if (!deptId) return
    try {
      await removeMut.mutateAsync({ deptId, userId })
      toast({ title: `${name} removido do departamento.` })
    } catch {
      toast({ title: 'Erro ao remover membro.', variant: 'destructive' })
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            {department?.name ?? 'Departamento'}
          </SheetTitle>
          <SheetDescription>Gerencie membros e chefia do setor.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* ── Secretário / Chefe ─────────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Crown className="h-3.5 w-3.5 text-amber-500" />
              Secretário / Chefe do Setor
            </Label>
            <Select value={managerId} onValueChange={handleSetManager} disabled={updateDept.isPending}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar chefe..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem chefia definida</SelectItem>
                {members.map((m: DepartmentMember) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.firstName} {m.lastName} — {m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-400">O chefe deve ser membro do departamento.</p>
          </div>

          <Separator />

          {/* ── Adicionar novo membro ──────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <UserPlus className="h-3.5 w-3.5 text-blue-500" />
              Adicionar Membro
            </Label>
            <div ref={containerRef} className="relative flex gap-2">
              <div className="relative flex-1">
                <Input
                  placeholder="Buscar por nome ou e-mail..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setSelectedUser(null) }}
                  onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                  autoComplete="off"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-slate-400" />
                )}
                {showDropdown && suggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {suggestions.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex flex-col"
                        onMouseDown={() => {
                          setSelectedUser(u)
                          setSearch(`${u.firstName} ${u.lastName ?? ''} (${u.email})`)
                          setShowDropdown(false)
                        }}
                      >
                        <span className="font-medium">{u.firstName} {u.lastName}</span>
                        <span className="text-xs text-slate-400">{u.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button
                type="button"
                disabled={!selectedUser || addMut.isPending}
                onClick={handleAddMember}
                className="shrink-0"
              >
                {addMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Adicionar'}
              </Button>
            </div>
          </div>

          <Separator />

          {/* ── Lista de membros ───────────────────────────────────────── */}
          <div className="space-y-2">
            <Label>
              Membros do Setor
              <span className="ml-2 text-xs font-normal text-slate-400">({members.length})</span>
            </Label>

            {loadingMembers ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : members.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">Nenhum membro no setor ainda.</p>
            ) : (
              <ul className="space-y-2">
                {members.map((m: DepartmentMember) => {
                  const isManager = m.id === (managerId === 'none' ? null : managerId)
                  const name = `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim()
                  return (
                    <li key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-bold">
                          {initials(m)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 flex items-center gap-1.5 truncate">
                          {name || m.email}
                          {isManager && (
                            <span title="Chefe do setor"><Crown className="h-3 w-3 text-amber-500 shrink-0" /></span>
                          )}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{m.email}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                        onClick={() => handleRemove(m.id, name || m.email)}
                        disabled={removeMut.isPending}
                        title="Remover do setor"
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
