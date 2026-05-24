import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/Drawer'
import { toast } from 'sonner'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import type { Member } from '@/hooks/infra/useSupabase'
import type { PendingAuthUser } from '../hooks/useAdminData'
import type { DbClientRow } from '@/types/db'
import {
  Plus,
  Building,
  Check,
  Search,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Key,
  Clock,
  Mail,
  Link2,
  UserX,
  Pencil,
  X,
} from 'lucide-react'

interface GoogleUser {
  id: string
  email: string
  avatarUrl: string | null
  name: string
}

interface UsersPanelProps {
  users: Member[]
  clients: DbClientRow[]
  onSetRole: (userId: string, role: 'admin' | 'user') => Promise<boolean>
  onLink: (userId: string, clientId: string) => Promise<boolean>
  onUnlink: (userId: string, clientId: string) => Promise<boolean>
  onCreate: (
    name: string,
    role: string,
    authUserId?: string | null,
    accessRole?: 'admin' | 'user',
    clientIds?: string[],
    email?: string | null,
    avatarUrl?: string | null
  ) => Promise<boolean>
  onUpdate: (userId: string, name: string, role: string, email?: string | null, capacity?: number | null) => Promise<boolean>
  onSetAuthId: (userId: string, authUserId: string | null, avatarUrl?: string | null) => Promise<boolean>
  onListGoogleUsers: (search?: string) => Promise<GoogleUser[]>
  onDeactivate: (userId: string) => Promise<boolean>
  onReactivate: (userId: string) => Promise<boolean>
  userClientsMap: Record<string, string[]>
  pendingUsers: PendingAuthUser[]
}

const PAGE_SIZE = 15

const ROLE_SUGGESTIONS = [
  'Diretor de Arte', 'Redator', 'Designer Gráfico', 'Designer Motion', 'Editor de Vídeo',
  'Fotógrafo', 'Ilustrador', 'UX Designer', 'UI Designer', 'Product Designer',
  'Social Media', 'Content Creator', 'Copywriter', 'Community Manager',
  'Planejamento', 'Estratégia', 'Branding', 'Analista de Branding',
  'Mídia', 'Analista de Mídia', 'Analista de Performance', 'Analista de Tráfego',
  'Gestor de Tráfego', 'Especialista em Ads',
  'Atendimento', 'Account Executive', 'Account Manager', 'Gerente de Contas',
  'Diretor de Contas', 'Customer Success',
  'Gestor de Projetos', 'Project Manager', 'Scrum Master', 'Produtor',
  'Produtor Executivo', 'Coordenador de Projetos', 'Head de Operações',
  'Diretor de Criação', 'Diretor de Marketing', 'Head de Criação', 'Head de Mídia',
  'Head de Conteúdo', 'Head de Performance', 'Gerente de Marketing',
  'Gerente de Projetos', 'Gerente de Mídia',
  'Front-end Developer', 'Back-end Developer', 'Full Stack Developer',
  'Web Developer', 'Mobile Developer', 'Tech Lead', 'CTO', 'QA / Tester', 'DevOps',
  'Analista de Dados', 'BI Analyst', 'Data Scientist',
  'Estagiário de Criação', 'Estagiário de Marketing', 'Estagiário de Mídia',
  'Estagiário de Social Media', 'Estagiário de Design', 'Estagiário de Desenvolvimento',
  'Assistente de Marketing', 'Assistente de Atendimento', 'Assistente de Mídia',
]

type ValidationErrors = { name?: string; role?: string; email?: string }
type StatusFilter = 'all' | 'active' | 'pending' | 'deactivated'
type CurrentTab = 'members' | 'pending'

const EASE_OUT_QUINT = [0.22, 1, 0.36, 1] as const

export function UsersPanel({
  users, clients, onSetRole, onLink, onUnlink, onCreate, onUpdate, onSetAuthId, onListGoogleUsers, onDeactivate, onReactivate, userClientsMap, pendingUsers
}: UsersPanelProps) {
  const reduced = useReducedMotion()

  // Edit drawer
  const [editDrawerOpen, setEditDrawerOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<Member | null>(null)
  const [editRole, setEditRole] = useState<'admin' | 'user'>('user')
  const [editName, setEditName] = useState('')
  const [editUserRole, setEditUserRole] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editCapacity, setEditCapacity] = useState<number>(6)
  const [editClients, setEditClients] = useState<string[]>([])
  const [savingEdit, setSavingEdit] = useState(false)
  const [editErrors, setEditErrors] = useState<ValidationErrors>({})
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)
  const [showReactivateConfirm, setShowReactivateConfirm] = useState(false)
  const [togglingActive, setTogglingActive] = useState(false)
  const [pendingDeactivateId, setPendingDeactivateId] = useState<string | null>(null)
  const [pendingDeactivateName, setPendingDeactivateName] = useState<string>('')
  const [pendingReactivateId, setPendingReactivateId] = useState<string | null>(null)
  const [pendingReactivateName, setPendingReactivateName] = useState<string>('')

  // Create inline form
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createRole, setCreateRole] = useState('')
  const [createEmail, setCreateEmail] = useState('')
  const [createAccessRole, setCreateAccessRole] = useState<'admin' | 'user'>('user')
  const [createClients, setCreateClients] = useState<string[]>([])
  const [createErrors, setCreateErrors] = useState<ValidationErrors>({})
  const [creating, setCreating] = useState(false)
  const createNameRef = useRef<HTMLInputElement>(null)
  const [createFromPendingUser, setCreateFromPendingUser] = useState<PendingAuthUser | null>(null)

  // List
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)
  const [currentTab, setCurrentTab] = useState<CurrentTab>('members')

  // Link drawer
  const [linkDrawerOpen, setLinkDrawerOpen] = useState(false)
  const [linkingPendingUser, setLinkingPendingUser] = useState<PendingAuthUser | null>(null)
  const [linkSearch, setLinkSearch] = useState('')
  const [linkingUserId, setLinkingUserId] = useState<string | null>(null)
  const [linking, setLinking] = useState(false)

  // Google search (create)
  const [googleSearch, setGoogleSearch] = useState('')
  const [googleResults, setGoogleResults] = useState<GoogleUser[]>([])
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [showGoogleDropdown, setShowGoogleDropdown] = useState(false)
  const googleDropdownRef = useRef<HTMLDivElement>(null)
  const googleSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Google search (edit)
  const [editGoogleSearch, setEditGoogleSearch] = useState('')
  const [editGoogleResults, setEditGoogleResults] = useState<GoogleUser[]>([])
  const [editLoadingGoogle, setEditLoadingGoogle] = useState(false)
  const [editShowGoogleDropdown, setEditShowGoogleDropdown] = useState(false)
  const editGoogleDropdownRef = useRef<HTMLDivElement>(null)
  const editGoogleSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (googleDropdownRef.current && !googleDropdownRef.current.contains(e.target as Node)) {
        setShowGoogleDropdown(false)
      }
      if (editGoogleDropdownRef.current && !editGoogleDropdownRef.current.contains(e.target as Node)) {
        setEditShowGoogleDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredUsers = useMemo(() => {
    let filtered = users
    if (statusFilter === 'deactivated') {
      filtered = filtered.filter(u => u.is_active === false)
    } else {
      filtered = filtered.filter(u => u.is_active !== false)
      if (statusFilter === 'active') filtered = filtered.filter(u => !!u.auth_user_id)
      else if (statusFilter === 'pending') filtered = filtered.filter(u => !u.auth_user_id)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      )
    }
    return filtered
  }, [users, searchQuery, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE))
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredUsers.slice(start, start + PAGE_SIZE)
  }, [filteredUsers, page])

  useEffect(() => { setPage(1) }, [searchQuery, statusFilter, currentTab])

  const openEditDrawer = useCallback((user: Member) => {
    setEditingUser(user)
    setEditName(user.name)
    setEditUserRole(user.role)
    setEditEmail(user.email ?? '')
    setEditRole(user.access_role ?? 'user')
    setEditCapacity(user.capacity ?? 6)
    setEditClients(userClientsMap[user.id] ?? [])
    setEditGoogleSearch('')
    setEditGoogleResults([])
    setEditDrawerOpen(true)
  }, [userClientsMap])

  const hasUnsavedEditChanges = () => {
    if (!editingUser) return false
    const currentClientIds = userClientsMap[editingUser.id] ?? []
    return (
      editName.trim() !== editingUser.name ||
      editUserRole.trim() !== editingUser.role ||
      editEmail.trim() !== (editingUser.email ?? '') ||
      editRole !== (editingUser.access_role ?? 'user') ||
      editCapacity !== (editingUser.capacity ?? 6) ||
      editClients.length !== currentClientIds.length ||
      editClients.some(id => !currentClientIds.includes(id)) ||
      (editGoogleSearch !== '' && editGoogleSearch !== (editingUser.email ?? ''))
    )
  }

  const resetEditState = () => {
    setEditDrawerOpen(false)
    setEditingUser(null)
    setEditName('')
    setEditUserRole('')
    setEditEmail('')
    setEditRole('user')
    setEditCapacity(6)
    setEditClients([])
    setEditErrors({})
    setSavingEdit(false)
  }

  const closeEditDrawer = (force = false) => {
    if (!force && hasUnsavedEditChanges()) {
      setShowDiscardConfirm(true)
      return
    }
    resetEditState()
  }

  const openCreateInline = useCallback((prefill?: { name: string; email: string; avatarUrl?: string | null; googleId?: string }) => {
    setCreateName(prefill?.name ?? '')
    setCreateRole('')
    setCreateEmail(prefill?.email ?? '')
    setCreateAccessRole('user')
    setCreateClients([])
    setCreateErrors({})
    if (prefill?.email) {
      setGoogleSearch(prefill.email)
      if (prefill.googleId) {
        setGoogleResults([{ id: prefill.googleId, email: prefill.email, name: prefill.name, avatarUrl: prefill.avatarUrl ?? null }])
      }
    } else {
      setGoogleSearch('')
      setGoogleResults([])
    }
    setCreateOpen(true)
    setTimeout(() => createNameRef.current?.focus(), 50)
  }, [])

  const closeCreate = () => {
    setCreateOpen(false)
    setCreating(false)
    setCreateFromPendingUser(null)
  }

  const validateCreate = (name: string, role: string, email?: string): ValidationErrors => {
    const errs: ValidationErrors = {}
    if (!name.trim()) errs.name = 'Nome é obrigatório'
    else if (name.trim().length < 2) errs.name = 'Nome deve ter pelo menos 2 caracteres'
    else if (name.trim().length > 100) errs.name = 'Nome deve ter no máximo 100 caracteres'
    if (!role.trim()) errs.role = 'Cargo é obrigatório'
    else if (role.trim().length > 50) errs.role = 'Cargo deve ter no máximo 50 caracteres'
    if (email && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = 'Email inválido'
    return errs
  }

  const validateEdit = (name: string, role: string, email?: string): ValidationErrors => {
    const errs: ValidationErrors = {}
    if (!name.trim()) errs.name = 'Nome é obrigatório'
    else if (name.trim().length < 2) errs.name = 'Nome deve ter pelo menos 2 caracteres'
    else if (name.trim().length > 100) errs.name = 'Nome deve ter no máximo 100 caracteres'
    if (!role.trim()) errs.role = 'Cargo é obrigatório'
    else if (role.trim().length > 50) errs.role = 'Cargo deve ter no máximo 50 caracteres'
    if (email && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = 'Email inválido'
    return errs
  }

  const handleGoogleSearch = async (query: string, isEdit = false) => {
    if (isEdit) { setEditLoadingGoogle(true) } else { setLoadingGoogle(true) }
    const results = await onListGoogleUsers(query)
    if (isEdit) {
      setEditGoogleResults(results)
      setEditShowGoogleDropdown(true)
      setEditLoadingGoogle(false)
    } else {
      setGoogleResults(results)
      setShowGoogleDropdown(true)
      setLoadingGoogle(false)
    }
  }

  const handleGoogleSearchChange = (value: string, isEdit = false) => {
    if (isEdit) {
      setEditGoogleSearch(value)
      if (editGoogleSearchTimeout.current) clearTimeout(editGoogleSearchTimeout.current)
      editGoogleSearchTimeout.current = setTimeout(() => handleGoogleSearch(value, true), 300)
    } else {
      setGoogleSearch(value)
      if (googleSearchTimeout.current) clearTimeout(googleSearchTimeout.current)
      googleSearchTimeout.current = setTimeout(() => handleGoogleSearch(value), 300)
    }
  }

  const handleCreate = async () => {
    const errs = validateCreate(createName, createRole, createEmail)
    setCreateErrors(errs)
    if (Object.keys(errs).length > 0) { toast.error('Corrija os erros antes de criar'); return }
    setCreating(true)
    const googleUser = googleResults.find(u => u.email === googleSearch)
    const ok = await onCreate(
      createName.trim(), createRole.trim(),
      googleUser?.id ?? null, createAccessRole, createClients,
      createEmail.trim() || null, googleUser?.avatarUrl ?? null
    )
    setCreating(false)
    if (ok) {
      toast.success(`Utilizador "${createName}" criado`)
      if (createFromPendingUser) {
        setLinkDrawerOpen(false)
        setLinkingPendingUser(null)
        setLinkingUserId(null)
        setLinkSearch('')
      }
      closeCreate()
    } else {
      toast.error('Erro ao criar utilizador')
    }
  }

  const handleUpdateUser = async () => {
    if (!editingUser) return
    const errs = validateEdit(editName, editUserRole, editEmail)
    setEditErrors(errs)
    if (Object.keys(errs).length > 0) { toast.error('Corrija os erros antes de salvar'); return }
    setSavingEdit(true)

    const nameChanged = editName.trim() !== editingUser.name
    const roleChanged = editUserRole.trim() !== editingUser.role
    const emailChanged = editEmail.trim() !== (editingUser.email ?? '')
    const capacityChanged = editCapacity !== (editingUser.capacity ?? 6)

    let basicOk = true
    if (nameChanged || roleChanged || emailChanged || capacityChanged) {
      basicOk = await onUpdate(editingUser.id, editName.trim(), editUserRole.trim(), editEmail.trim() || null, editCapacity)
    }

    const accessRoleChanged = editRole !== (editingUser.access_role ?? 'user')
    let roleOk = true
    if (accessRoleChanged) roleOk = await onSetRole(editingUser.id, editRole)

    const currentClientIds = userClientsMap[editingUser.id] ?? []
    const toAdd = editClients.filter(id => !currentClientIds.includes(id))
    const toRemove = currentClientIds.filter(id => !editClients.includes(id))

    let clientOk = true
    for (const cid of toAdd) { const ok = await onLink(editingUser.id, cid); if (!ok) { clientOk = false; break } }
    for (const cid of toRemove) { const ok = await onUnlink(editingUser.id, cid); if (!ok) { clientOk = false; break } }

    let authChanged = false
    let authOk = true
    const googleUser = editGoogleResults.find(u => u.email === editGoogleSearch)
    if (googleUser) {
      const newAuthId = googleUser.id
      if (newAuthId !== editingUser.auth_user_id) {
        authChanged = true
        authOk = await onSetAuthId(editingUser.id, newAuthId, googleUser.avatarUrl)
      }
    } else if (editGoogleSearch === '' && editingUser.auth_user_id) {
      authChanged = true
      authOk = await onSetAuthId(editingUser.id, null, null)
    }

    setSavingEdit(false)
    if (basicOk && (roleOk || clientOk || authChanged)) {
      toast.success('Utilizador atualizado')
      closeEditDrawer(true)
    } else if (!basicOk) {
      toast.error('Erro ao atualizar dados do utilizador')
    } else if (!authOk) {
      toast.error('Erro ao atualizar conta Google')
    } else {
      toast.error('Erro ao atualizar utilizador')
    }
  }

  const handleDeactivateUser = async () => {
    const userId = pendingDeactivateId
    const userName = pendingDeactivateName
    if (!userId) return
    setTogglingActive(true)
    try {
      const ok = await onDeactivate(userId)
      if (ok) { toast.success(`Utilizador "${userName}" desativado`); setEditDrawerOpen(false); setEditingUser(null) }
      else toast.error('Erro ao desativar utilizador')
    } catch {
      toast.error('Ocorreu um erro inesperado ao desativar.')
    } finally {
      setTogglingActive(false)
      setShowDeactivateConfirm(false)
      setPendingDeactivateId(null)
    }
  }

  const handleReactivateUser = async () => {
    const userId = pendingReactivateId
    const userName = pendingReactivateName
    if (!userId) return
    setTogglingActive(true)
    try {
      const ok = await onReactivate(userId)
      if (ok) { toast.success(`Utilizador "${userName}" reativado`); setEditDrawerOpen(false); setEditingUser(null) }
      else toast.error('Erro ao reativar utilizador')
    } catch {
      toast.error('Ocorreu um erro inesperado ao reativar.')
    } finally {
      setTogglingActive(false)
      setShowReactivateConfirm(false)
      setPendingReactivateId(null)
    }
  }

  const getUserClients = useCallback((userId: string) => {
    const clientIds = userClientsMap[userId] ?? []
    return clients.filter(c => clientIds.includes(c.id))
  }, [clients, userClientsMap])

  const memberFilters: { key: StatusFilter; label: string; icon?: React.ReactNode }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'active', label: 'Ativos', icon: <Key className="w-3 h-3" /> },
    { key: 'pending', label: 'Sem acesso', icon: <Clock className="w-3 h-3" /> },
    { key: 'deactivated', label: 'Desativados', icon: <UserX className="w-3 h-3" /> },
  ]

  return (
    <div className="space-y-0">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por nome, cargo ou email..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(1) }}
            className="pl-8 h-8 w-64 text-sm"
          />
        </div>

        {/* Tab: Members / Pending */}
        <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
          <button
            onClick={() => { setCurrentTab('members'); setPage(1) }}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
              currentTab === 'members'
                ? 'bg-background text-foreground font-medium shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Membros
          </button>
          <button
            onClick={() => { setCurrentTab('pending'); setPage(1) }}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
              currentTab === 'pending'
                ? 'bg-background text-foreground font-medium shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className={`w-3 h-3 ${currentTab === 'pending' ? 'text-orange-500' : 'text-orange-400 opacity-70'}`} />
            Pendentes ({pendingUsers.length})
          </button>
        </div>

        {/* Status filters (members only) */}
        {currentTab === 'members' && (
          <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
            {memberFilters.map(f => (
              <button
                key={f.key}
                onClick={() => { setStatusFilter(f.key); setPage(1) }}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
                  statusFilter === f.key
                    ? 'bg-background text-foreground font-medium shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {f.icon && <span className={statusFilter === f.key ? 'opacity-100' : 'opacity-60'}>{f.icon}</span>}
                {f.label}
              </button>
            ))}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {currentTab === 'members' && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {filteredUsers.length} membro{filteredUsers.length !== 1 ? 's' : ''}
            </span>
          )}
          {currentTab === 'members' && (
            <Button
              size="sm"
              onClick={() => { setCreateFromPendingUser(null); openCreateInline() }}
              className="h-8 text-xs gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo usuário
            </Button>
          )}
        </div>
      </div>

      {/* Inline create form */}
      <AnimatePresence>
        {createOpen && currentTab === 'members' && (
          <motion.div
            key="create-form"
            initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: EASE_OUT_QUINT }}
            className="overflow-hidden"
          >
            <div className="border border-border rounded-lg mb-1 bg-background">
              <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
                <span className="text-sm font-medium">
                  {createFromPendingUser ? `Criar membro a partir de ${createFromPendingUser.email}` : 'Novo usuário'}
                </span>
                <button
                  onClick={closeCreate}
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-4 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="create-user-name" className="text-xs">Nome completo</Label>
                  <Input
                    id="create-user-name"
                    ref={createNameRef}
                    value={createName}
                    onChange={e => { setCreateName(e.target.value); if (createErrors.name) setCreateErrors(p => ({ ...p, name: undefined })) }}
                    placeholder="Ex: Maria Silva"
                    aria-invalid={!!createErrors.name}
                    className="h-8 text-sm"
                  />
                  {createErrors.name && <p role="alert" className="text-xs text-destructive">{createErrors.name}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="create-user-role" className="text-xs">Cargo / Função</Label>
                  <Input
                    id="create-user-role"
                    value={createRole}
                    onChange={e => { setCreateRole(e.target.value); if (createErrors.role) setCreateErrors(p => ({ ...p, role: undefined })) }}
                    placeholder="Ex: Social Media"
                    list="create-user-role-suggestions"
                    aria-invalid={!!createErrors.role}
                    className="h-8 text-sm"
                  />
                  <datalist id="create-user-role-suggestions">
                    {ROLE_SUGGESTIONS.map(role => <option key={role} value={role} />)}
                  </datalist>
                  {createErrors.role && <p role="alert" className="text-xs text-destructive">{createErrors.role}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="create-user-email" className="text-xs">Email corporativo</Label>
                  <Input
                    id="create-user-email"
                    type="email"
                    value={createEmail}
                    onChange={e => { setCreateEmail(e.target.value); if (createErrors.email) setCreateErrors(p => ({ ...p, email: undefined })) }}
                    placeholder="Ex: maria@empresa.com"
                    aria-invalid={!!createErrors.email}
                    className="h-8 text-sm"
                  />
                  {createErrors.email && <p role="alert" className="text-xs text-destructive">{createErrors.email}</p>}
                </div>
              </div>

              <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Access role */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Nível de acesso</Label>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setCreateAccessRole('user')}
                      className={`flex-1 flex items-center justify-center gap-1.5 h-8 text-xs rounded-md border transition-colors cursor-pointer ${
                        createAccessRole === 'user'
                          ? 'bg-foreground text-background border-foreground'
                          : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                      }`}
                      aria-pressed={createAccessRole === 'user'}
                    >
                      {createAccessRole === 'user' && <Check className="w-3 h-3" />}
                      Utilizador
                    </button>
                    <button
                      onClick={() => setCreateAccessRole('admin')}
                      className={`flex-1 flex items-center justify-center gap-1.5 h-8 text-xs rounded-md border transition-colors cursor-pointer ${
                        createAccessRole === 'admin'
                          ? 'bg-foreground text-background border-foreground'
                          : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                      }`}
                      aria-pressed={createAccessRole === 'admin'}
                    >
                      {createAccessRole === 'admin' && <Check className="w-3 h-3" />}
                      Administrador
                    </button>
                  </div>
                </div>

                {/* Google account */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Conta Google (opcional)</Label>
                  <div className="relative" ref={googleDropdownRef}>
                    <Input
                      type="email"
                      value={googleSearch}
                      onChange={e => handleGoogleSearchChange(e.target.value)}
                      onFocus={() => { if (googleSearch) handleGoogleSearch(googleSearch) }}
                      placeholder="Buscar email Google..."
                      className="h-8 text-sm w-full"
                    />
                    {showGoogleDropdown && googleResults.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {googleResults.map(u => (
                          <div
                            key={u.id}
                            className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted cursor-pointer"
                            onClick={() => { setGoogleSearch(u.email); setShowGoogleDropdown(false) }}
                          >
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                              {u.avatarUrl
                                ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                                : <UserCheck className="w-3.5 h-3.5 text-primary" />
                              }
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">{u.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {showGoogleDropdown && googleSearch && googleResults.length === 0 && !loadingGoogle && (
                      <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg px-3 py-2 text-xs text-muted-foreground">
                        Nenhum utilizador Google encontrado
                      </div>
                    )}
                    {loadingGoogle && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 border-t border-border/60 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={closeCreate} disabled={creating} className="h-7 text-xs">
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreate}
                  isLoading={creating}
                  disabled={!createName.trim() || !createRole.trim()}
                  className="h-7 text-xs gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  Criar
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pending tab content */}
      {currentTab === 'pending' && (
        <div>
          {pendingUsers.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-muted-foreground">Nenhum usuário pendente</p>
              <p className="text-xs text-muted-foreground mt-1">
                Usuários que fizerem login com o domínio permitido mas ainda não foram vinculados aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto] items-center px-4 py-2 bg-muted/50 border-b border-border">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Usuário</span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-36 text-center hidden sm:block">Último login</span>
                <span className="w-24" />
              </div>
              <AnimatePresence mode="popLayout">
                {pendingUsers.map((pu, i) => (
                  <motion.div
                    key={pu.id}
                    layout={!reduced}
                    initial={reduced ? { opacity: 0 } : { opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, x: 8 }}
                    transition={{ duration: 0.18, ease: EASE_OUT_QUINT, delay: reduced ? 0 : i * 0.025 }}
                    className="group grid grid-cols-[1fr_auto_auto] items-center px-4 py-3 border-b border-border/60 last:border-b-0 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-4">
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium overflow-hidden shrink-0">
                        {pu.avatarUrl
                          ? <img src={pu.avatarUrl} alt="" className="w-full h-full object-cover" />
                          : pu.email.charAt(0).toUpperCase()
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{pu.name}</p>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          <Mail className="w-3 h-3 shrink-0" />{pu.email}
                        </p>
                      </div>
                    </div>

                    <div className="w-36 text-center hidden sm:block">
                      {pu.lastSignInAt ? (
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {new Date(pu.lastSignInAt).toLocaleDateString('pt-BR')}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>

                    <div className="w-24 flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => { setLinkingPendingUser(pu); setLinkDrawerOpen(true) }}
                      >
                        <Link2 className="w-3 h-3" />
                        Vincular
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Members list */}
      {currentTab === 'members' && (
        <>
          {filteredUsers.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-muted-foreground">
                {searchQuery || statusFilter !== 'all'
                  ? 'Nenhum membro corresponde ao filtro.'
                  : 'Ainda não há membros. Crie o primeiro.'}
              </p>
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              {/* List header */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] items-center px-4 py-2 bg-muted/50 border-b border-border">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Membro</span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-28 text-center hidden sm:block">Clientes</span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-24 text-center hidden md:block">Status</span>
                <span className="w-16" />
              </div>

              <AnimatePresence mode="popLayout">
                {paginatedUsers.map((u, i) => {
                  const ucs = getUserClients(u.id)
                  const hasGoogle = !!u.auth_user_id
                  const isDeactivated = u.is_active === false
                  const isAdmin = u.access_role === 'admin'

                  return (
                    <motion.div
                      key={u.id}
                      layout={!reduced}
                      initial={reduced ? { opacity: 0 } : { opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={reduced ? { opacity: 0 } : { opacity: 0, x: 8 }}
                      transition={{ duration: 0.18, ease: EASE_OUT_QUINT, delay: reduced ? 0 : i * 0.025 }}
                      className="group grid grid-cols-[1fr_auto_auto_auto] items-center px-4 py-3 border-b border-border/60 last:border-b-0 hover:bg-muted/30 transition-colors"
                    >
                      {/* Avatar + name + role */}
                      <div className="flex items-center gap-2.5 min-w-0 pr-4">
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium overflow-hidden shrink-0">
                          {u.avatar_url
                            ? <img src={u.avatar_url} alt={u.name} className="w-full h-full object-cover" />
                            : u.name.charAt(0).toUpperCase()
                          }
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => openEditDrawer(u)}
                              className="text-sm font-medium truncate hover:underline underline-offset-2 cursor-pointer text-left"
                              title={u.name}
                            >
                              {u.name}
                            </button>
                            {isAdmin && (
                              <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                                Admin
                              </span>
                            )}
                            {isDeactivated && (
                              <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                                Desativado
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate mt-0.5">
                            {u.role}
                            {u.email && (
                              <span className="ml-2 opacity-70">{u.email}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Client count */}
                      <div className="w-28 text-center hidden sm:flex justify-center items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm tabular-nums">{ucs.length}</span>
                        {ucs.length > 0 && (
                          <span className="text-xs text-muted-foreground truncate max-w-[60px]" title={ucs.map(c => c.name).join(', ')}>
                            {ucs[0].name}{ucs.length > 1 ? ` +${ucs.length - 1}` : ''}
                          </span>
                        )}
                      </div>

                      {/* Status dot */}
                      <div className="w-24 hidden md:flex justify-center">
                        {isDeactivated ? (
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="h-2 w-2 rounded-full bg-border" />
                            Inativo
                          </span>
                        ) : hasGoogle ? (
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            Ativo
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-60" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
                            </span>
                            Pendente
                          </span>
                        )}
                      </div>

                      {/* Hover actions */}
                      <div className="w-16 flex justify-end items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditDrawer(u)}
                          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                          aria-label={`Editar ${u.name}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <span className="text-xs text-muted-foreground">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredUsers.length)} de {filteredUsers.length}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-7 w-7 p-0"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground px-2 tabular-nums">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="h-7 w-7 p-0"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit drawer */}
      <Drawer direction="right" open={editDrawerOpen} onOpenChange={open => { if (!open && !showDeactivateConfirm && !showReactivateConfirm && !showDiscardConfirm) closeEditDrawer() }}>
        <DrawerContent data-vaul-drawer-direction="right">
          <DrawerHeader>
            <DrawerTitle>Editar Utilizador</DrawerTitle>
            <DrawerDescription>Altere os dados e clientes do utilizador.</DrawerDescription>
          </DrawerHeader>

          <div className="px-6 pb-6 space-y-6 overflow-y-auto max-h-[calc(100vh-200px)]">
            {editingUser && (
              <>
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-medium overflow-hidden">
                    {editingUser.avatar_url
                      ? <img src={editingUser.avatar_url} alt="" className="w-full h-full object-cover" />
                      : editingUser.name.charAt(0).toUpperCase()
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{editingUser.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{editingUser.role}</p>
                    {editingUser.email && <p className="text-xs text-muted-foreground truncate mt-1">{editingUser.email}</p>}
                  </div>
                </div>

                <div className="flex flex-col gap-1 text-xs text-muted-foreground px-1">
                  {editingUser.created_at && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      Criado em {new Date(editingUser.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  {editingUser.deactivated_at && (
                    <span className="flex items-center gap-1.5 text-destructive">
                      <UserX className="w-3.5 h-3.5 shrink-0" />
                      Desativado em {new Date(editingUser.deactivated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>

                {!editingUser.auth_user_id && (
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Key className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-orange-800 dark:text-orange-200">Conta Google não vinculada</p>
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                          O utilizador ainda não fez login. Vincule a conta Google abaixo quando ele acessar.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="edit-name">Nome completo</Label>
                    <Input
                      id="edit-name"
                      value={editName}
                      onChange={e => { setEditName(e.target.value); if (editErrors.name) setEditErrors(p => ({ ...p, name: undefined })) }}
                      placeholder="Ex: Maria Silva"
                      aria-invalid={!!editErrors.name}
                    />
                    {editErrors.name && <p role="alert" className="text-xs text-red-500 mt-1">{editErrors.name}</p>}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="edit-role">Cargo / Função</Label>
                    <Input
                      id="edit-role"
                      value={editUserRole}
                      onChange={e => { setEditUserRole(e.target.value); if (editErrors.role) setEditErrors(p => ({ ...p, role: undefined })) }}
                      placeholder="Ex: Social Media"
                      list="edit-role-suggestions"
                      aria-invalid={!!editErrors.role}
                    />
                    <datalist id="edit-role-suggestions">
                      {ROLE_SUGGESTIONS.map(role => <option key={role} value={role} />)}
                    </datalist>
                    {editErrors.role && <p role="alert" className="text-xs text-red-500 mt-1">{editErrors.role}</p>}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="edit-email">Email corporativo</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editEmail}
                      onChange={e => { setEditEmail(e.target.value); if (editErrors.email) setEditErrors(p => ({ ...p, email: undefined })) }}
                      placeholder="Ex: maria@empresa.com"
                      aria-invalid={!!editErrors.email}
                    />
                    {editErrors.email && <p role="alert" className="text-xs text-red-500 mt-1">{editErrors.email}</p>}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="edit-capacity">Capacidade (subtarefas simultâneas)</Label>
                    <Input
                      id="edit-capacity"
                      type="number"
                      min={1}
                      max={50}
                      value={editCapacity}
                      onChange={e => setEditCapacity(Math.min(50, Math.max(1, Number(e.target.value) || 1)))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Número máximo de subtarefas ativas antes de ser considerado sobrecarregado.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-medium">Acesso</Label>
                  <div className="flex gap-2">
                    <Button variant={editRole === 'user' ? 'default' : 'outline'} size="sm" onClick={() => setEditRole('user')} className="flex-1" aria-pressed={editRole === 'user'}>
                      <Check className={`w-4 h-4 mr-1 ${editRole === 'user' ? 'opacity-100' : 'opacity-0'}`} />
                      Utilizador
                    </Button>
                    <Button variant={editRole === 'admin' ? 'default' : 'outline'} size="sm" onClick={() => setEditRole('admin')} className="flex-1" aria-pressed={editRole === 'admin'}>
                      <Check className={`w-4 h-4 mr-1 ${editRole === 'admin' ? 'opacity-100' : 'opacity-0'}`} />
                      Administrador
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-medium">Clientes associados</Label>
                  {clients.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">Nenhum cliente disponível</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {clients.map(c => {
                        const isLinked = editClients.includes(c.id)
                        return (
                          <div
                            key={c.id}
                            className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isLinked ? 'bg-primary/10 border border-primary' : 'border hover:bg-muted/50'}`}
                          >
                            <div
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer ${isLinked ? 'bg-primary border-primary' : 'border-muted-foreground'}`}
                              onClick={() => setEditClients(prev => isLinked ? prev.filter(id => id !== c.id) : [...prev, c.id])}
                            >
                              {isLinked && <Check className="w-3 h-3 text-primary-foreground" />}
                            </div>
                            <div className="flex-1 cursor-pointer" onClick={() => setEditClients(prev => isLinked ? prev.filter(id => id !== c.id) : [...prev, c.id])}>
                              <p className="text-sm font-medium">{c.name}</p>
                              <p className="text-xs text-muted-foreground">/{c.slug}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {editingUser && (
            <div className="px-6 pb-4 space-y-3">
              <Label className="text-base font-medium">Conta Google</Label>
              <div className="relative" ref={editGoogleDropdownRef}>
                <Input
                  type="email"
                  value={editGoogleSearch}
                  onChange={e => handleGoogleSearchChange(e.target.value, true)}
                  onFocus={() => { if (editGoogleSearch) handleGoogleSearch(editGoogleSearch, true) }}
                  placeholder="Buscar email Google..."
                  className="w-full"
                />
                {editShowGoogleDropdown && editGoogleResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {editGoogleResults.map(u => (
                      <div
                        key={u.id}
                        className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer"
                        onClick={() => { setEditGoogleSearch(u.email); setEditShowGoogleDropdown(false) }}
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                          {u.avatarUrl ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" /> : <UserCheck className="w-4 h-4 text-primary" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{u.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {editShowGoogleDropdown && editGoogleSearch && editGoogleResults.length === 0 && !editLoadingGoogle && (
                  <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg p-3 text-sm text-muted-foreground">
                    Nenhum utilizador Google encontrado
                  </div>
                )}
                {editLoadingGoogle && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              {editingUser.auth_user_id && !editGoogleSearch && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200 font-medium flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Conta Google vinculada
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 font-mono mt-1">{editingUser.auth_user_id}</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {editingUser.auth_user_id
                  ? 'Substitua a conta Google por outra ou deixe vazio para desvincular.'
                  : 'Busque e vincule uma conta Google para ativar o utilizador.'}
              </p>
            </div>
          )}

          <DrawerFooter className="flex-row justify-between gap-2">
            {editingUser?.is_active !== false ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => { setPendingDeactivateId(editingUser?.id ?? null); setPendingDeactivateName(editingUser?.name ?? ''); setShowDeactivateConfirm(true) }}
                disabled={savingEdit || togglingActive}
              >
                <UserX className="w-4 h-4 mr-1" />
                Desativar
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setPendingReactivateId(editingUser?.id ?? null); setPendingReactivateName(editingUser?.name ?? ''); setShowReactivateConfirm(true) }}
                disabled={savingEdit || togglingActive}
              >
                <UserCheck className="w-4 h-4 mr-1" />
                Reativar
              </Button>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => closeEditDrawer()} disabled={savingEdit || togglingActive}>Cancelar</Button>
              <Button onClick={handleUpdateUser} isLoading={savingEdit} disabled={togglingActive}>Guardar</Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Link drawer */}
      <Drawer direction="right" open={linkDrawerOpen} onOpenChange={setLinkDrawerOpen}>
        <DrawerContent data-vaul-drawer-direction="right">
          <DrawerHeader>
            <DrawerTitle>Vincular Utilizador</DrawerTitle>
            <DrawerDescription>Selecione o membro para vincular a esta conta Google.</DrawerDescription>
          </DrawerHeader>

          {linkingPendingUser && (
            <div className="px-6 pb-6 space-y-4 overflow-y-auto max-h-[calc(100vh-200px)]">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-medium overflow-hidden">
                  {linkingPendingUser.avatarUrl
                    ? <img src={linkingPendingUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                    : linkingPendingUser.email.charAt(0).toUpperCase()
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{linkingPendingUser.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{linkingPendingUser.email}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="link-search">Vincular a membro existente</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCreateFromPendingUser(linkingPendingUser)
                    openCreateInline({ name: linkingPendingUser.name, email: linkingPendingUser.email, avatarUrl: linkingPendingUser.avatarUrl, googleId: linkingPendingUser.id })
                  }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Criar novo membro
                </Button>
              </div>

              <div className="space-y-1">
                <Input
                  id="link-search"
                  value={linkSearch}
                  onChange={e => setLinkSearch(e.target.value)}
                  placeholder="Buscar por nome ou cargo..."
                />
                <p className="text-xs text-muted-foreground">Apenas membros sem conta Google vinculada são mostrados.</p>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {users
                  .filter(u => !u.auth_user_id)
                  .filter(u => !linkSearch.trim() || u.name.toLowerCase().includes(linkSearch.toLowerCase()) || u.role.toLowerCase().includes(linkSearch.toLowerCase()))
                  .map(u => (
                    <div
                      key={u.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${linkingUserId === u.id ? 'bg-primary/10 border border-primary' : 'border hover:bg-muted/50'}`}
                      onClick={() => setLinkingUserId(u.id)}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${linkingUserId === u.id ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                        {linkingUserId === u.id && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{u.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.role}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <DrawerFooter className="flex-row justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => { setLinkDrawerOpen(false); setLinkingUserId(null); setLinkingPendingUser(null); setLinkSearch('') }}
              disabled={linking}
            >
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!linkingUserId || !linkingPendingUser) return
                setLinking(true)
                const ok = await onSetAuthId(linkingUserId, linkingPendingUser.id, linkingPendingUser.avatarUrl)
                setLinking(false)
                if (ok) {
                  toast.success('Utilizador vinculado com sucesso')
                  setLinkDrawerOpen(false)
                  setLinkingUserId(null)
                  setLinkingPendingUser(null)
                } else {
                  toast.error('Erro ao vincular utilizador')
                }
              }}
              isLoading={linking}
              disabled={!linkingUserId}
            >
              Vincular
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {showDeactivateConfirm && (
        <ConfirmModal
          title="Desativar utilizador?"
          message={`O membro "${pendingDeactivateName}" perderá o acesso à plataforma. As tasks e steps associadas serão preservadas. Esta ação pode ser revertida.`}
          confirmLabel="Desativar"
          cancelLabel="Cancelar"
          onConfirm={handleDeactivateUser}
          onCancel={() => setShowDeactivateConfirm(false)}
        />
      )}

      {showReactivateConfirm && (
        <ConfirmModal
          title="Reativar utilizador?"
          message={`O membro "${pendingReactivateName}" voltará a ter acesso à plataforma.`}
          confirmLabel="Reativar"
          cancelLabel="Cancelar"
          onConfirm={handleReactivateUser}
          onCancel={() => setShowReactivateConfirm(false)}
        />
      )}

      {showDiscardConfirm && (
        <ConfirmModal
          title="Descartar alterações?"
          message="Há alterações não salvas. Se fechar agora, elas serão perdidas."
          confirmLabel="Descartar"
          cancelLabel="Continuar editando"
          onConfirm={() => { setShowDiscardConfirm(false); resetEditState() }}
          onCancel={() => setShowDiscardConfirm(false)}
        />
      )}
    </div>
  )
}
