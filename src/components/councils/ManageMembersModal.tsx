import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Search, UserMinus, UserPlus, User } from 'lucide-react'
import { api } from '@/lib/api'
import {
  useCouncilMembers,
  useAddCouncilMember,
  useRemoveCouncilMember,
} from '@/hooks/useCouncils'
import { toast } from '@/hooks/use-toast'
import type { CouncilMemberRole, CouncilMembership } from '@/lib/api/councils'

// ── Constants ──────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<CouncilMemberRole, string> = {
  PRESIDENTE:      'Presidente',
  VICE_PRESIDENTE: 'Vice-Presidente',
  SECRETARIO:      'Secretário',
  MEMBRO_TITULAR:  'Membro Titular',
  MEMBRO_SUPLENTE: 'Membro Suplente',
}

const ROLES = Object.entries(ROLE_LABELS) as [CouncilMemberRole, string][]

// ── Types ──────────────────────────────────────────────────────────────────────

interface OrgUser {
  id: string
  firstName: string
  lastName: string | null
  email: string
}

// ── Hook: user search ──────────────────────────────────────────────────────────

function useOrgUserSearch(query: string) {
  const [results, setResults]   = useState<OrgUser[]>([])
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await api.get<{ data: OrgUser[] }>(
          `/api/v1/users?search=${encodeURIComponent(query)}&limit=10`,
        )
        setResults(res.data.data ?? [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  return { results, loading }
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  councilId: string
}

// ── Component ──────────────────────────────────────────────────────────────────

export function ManageMembersModal({ open, onClose, councilId }: Props) {
  // Current members
  const { data: members = [], isLoading: membersLoading } = useCouncilMembers(councilId)
  const removeMember = useRemoveCouncilMember(councilId)
  const addMember    = useAddCouncilMember(councilId)

  // Add-member form state
  const [search, setSearch]           = useState('')
  const [selectedUser, setSelectedUser] = useState<OrgUser | null>(null)
  const [role, setRole]               = useState<CouncilMemberRole>('MEMBRO_TITULAR')
  const [startDate, setStartDate]     = useState('')
  const [endDate, setEndDate]         = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  const { results, loading: searchLoading } = useOrgUserSearch(search)

  function selectUser(user: OrgUser) {
    setSelectedUser(user)
    setSearch(`${user.firstName} ${user.lastName ?? ''}`.trim())
    setShowDropdown(false)
  }

  function handleSearchChange(v: string) {
    setSearch(v)
    setSelectedUser(null)
    setShowDropdown(v.length >= 2)
  }

  function handleAdd() {
    if (!selectedUser) return
    addMember.mutate(
      {
        userId:    selectedUser.id,
        role,
        startDate: startDate || undefined,
        endDate:   endDate   || undefined,
      },
      {
        onSuccess: () => {
          toast({ title: 'Membro adicionado ao conselho.' })
          resetAddForm()
        },
        onError: () => {
          toast({ title: 'Erro ao adicionar membro.', variant: 'destructive' })
        },
      },
    )
  }

  function handleRemove(membershipId: string) {
    removeMember.mutate(membershipId, {
      onSuccess: () => toast({ title: 'Membro removido do conselho.' }),
      onError:   () => toast({ title: 'Erro ao remover membro.', variant: 'destructive' }),
    })
  }

  function resetAddForm() {
    setSearch('')
    setSelectedUser(null)
    setRole('MEMBRO_TITULAR')
    setStartDate('')
    setEndDate('')
    setShowDropdown(false)
  }

  function handleOpenChange(v: boolean) {
    if (!v) {
      onClose()
      resetAddForm()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Gerenciar Membros</DialogTitle>
        </DialogHeader>

        {/* ── Current members list ── */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Membros Atuais
          </p>
          <ScrollArea className="h-44 rounded-md border border-slate-200">
            {membersLoading ? (
              <div className="flex items-center justify-center h-44 text-slate-400 text-sm">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Carregando...
              </div>
            ) : members.length === 0 ? (
              <div className="flex items-center justify-center h-44 text-slate-400 text-sm">
                Nenhum membro cadastrado.
              </div>
            ) : (
              <ul>
                {members.map((membership: CouncilMembership) => {
                  const isRemoving =
                    removeMember.isPending && removeMember.variables === membership.id
                  return (
                    <li
                      key={membership.id}
                      className="flex items-center gap-3 px-3 py-2.5 border-b border-slate-100 last:border-0"
                    >
                      <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {membership.user.firstName} {membership.user.lastName}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {ROLE_LABELS[membership.role] ?? membership.role}
                          {membership.user.email ? ` · ${membership.user.email}` : ''}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 shrink-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleRemove(membership.id)}
                        disabled={isRemoving}
                        title="Remover membro"
                      >
                        {isRemoving
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <UserMinus className="h-3.5 w-3.5" />
                        }
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </ScrollArea>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200" />

        {/* ── Add member form ── */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Adicionar Novo Membro
          </p>

          {/* User search */}
          <div className="flex flex-col gap-1.5 relative">
            <Label htmlFor="member-search">Buscar usuário</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                id="member-search"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => { if (results.length > 0) setShowDropdown(true) }}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                placeholder="Nome ou e-mail do usuário"
                className="pl-8"
                autoComplete="off"
              />
              {searchLoading && (
                <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
              )}
            </div>

            {/* Dropdown results */}
            {showDropdown && results.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-md shadow-md overflow-hidden">
                {results.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onMouseDown={() => selectUser(user)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-slate-50 transition-colors"
                  >
                    <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <User className="h-3 w-3 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 truncate">
                        {user.firstName} {user.lastName ?? ''}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Role + dates row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="member-role">Cargo</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as CouncilMemberRole)}
              >
                <SelectTrigger id="member-role" className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(([value, label]) => (
                    <SelectItem key={value} value={value} className="text-xs">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="member-start" className="truncate">
                Início <span className="text-slate-400 font-normal">(opcional)</span>
              </Label>
              <Input
                id="member-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="member-end" className="truncate">
                Término <span className="text-slate-400 font-normal">(opcional)</span>
              </Label>
              <Input
                id="member-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onClose(); resetAddForm() }}>
            Fechar
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!selectedUser || addMember.isPending}
            className="gap-1.5"
          >
            {addMember.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <UserPlus className="h-4 w-4" />
            }
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
