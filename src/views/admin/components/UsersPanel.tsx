import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
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
import type { Member } from '@/hooks/useSupabase'
import type { PendingAuthUser } from '../hooks/useAdminData'
import type { DbClientRow } from '@/types/db'
import { Plus, Building, Check, Search, UserCheck, ChevronLeft, ChevronRight, Key, Clock, Mail, Link2, UserX } from 'lucide-react'

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
  onUpdate: (userId: string, name: string, role: string, email?: string | null) => Promise<boolean>
  onSetAuthId: (userId: string, authUserId: string | null, avatarUrl?: string | null) => Promise<boolean>
  onListGoogleUsers: (search?: string) => Promise<GoogleUser[]>
  onDeactivate: (userId: string) => Promise<boolean>
  onReactivate: (userId: string) => Promise<boolean>
  userClientsMap: Record<string, string[]>
  pendingUsers: PendingAuthUser[]
}

const PAGE_SIZE = 12

const ROLE_SUGGESTIONS = [
  // Criação
  'Diretor de Arte',
  'Redator',
  'Designer Gráfico',
  'Designer Motion',
  'Editor de Vídeo',
  'Fotógrafo',
  'Ilustrador',
  'UX Designer',
  'UI Designer',
  'Product Designer',

  // Social / Conteúdo
  'Social Media',
  'Content Creator',
  'Copywriter',
  'Community Manager',

  // Planejamento / Estratégia
  'Planejamento',
  'Estratégia',
  'Branding',
  'Analista de Branding',

  // Mídia / Performance
  'Mídia',
  'Analista de Mídia',
  'Analista de Performance',
  'Analista de Tráfego',
  'Gestor de Tráfego',
  'Especialista em Ads',

  // Atendimento / Account
  'Atendimento',
  'Account Executive',
  'Account Manager',
  'Gerente de Contas',
  'Diretor de Contas',
  'Customer Success',

  // Projetos / Operações
  'Gestor de Projetos',
  'Project Manager',
  'Scrum Master',
  'Produtor',
  'Produtor Executivo',
  'Coordenador de Projetos',
  'Head de Operações',

  // Liderança
  'Diretor de Criação',
  'Diretor de Marketing',
  'Head de Criação',
  'Head de Mídia',
  'Head de Conteúdo',
  'Head de Performance',
  'Gerente de Marketing',
  'Gerente de Projetos',
  'Gerente de Mídia',

  // Desenvolvimento / Tech
  'Front-end Developer',
  'Back-end Developer',
  'Full Stack Developer',
  'Web Developer',
  'Mobile Developer',
  'Tech Lead',
  'CTO',
  'QA / Tester',
  'DevOps',

  // Dados / BI
  'Analista de Dados',
  'BI Analyst',
  'Data Scientist',

  // Estágio / Júnior
  'Estagiário de Criação',
  'Estagiário de Marketing',
  'Estagiário de Mídia',
  'Estagiário de Social Media',
  'Estagiário de Design',
  'Estagiário de Desenvolvimento',
  'Assistente de Marketing',
  'Assistente de Atendimento',
  'Assistente de Mídia',
]

type ValidationErrors = {
  name?: string
  role?: string
  email?: string
}

type StatusFilter = 'all' | 'active' | 'pending' | 'deactivated'
type CurrentTab = 'members' | 'pending'

export function UsersPanel({
  users, clients, onSetRole, onLink, onUnlink, onCreate, onUpdate, onSetAuthId, onListGoogleUsers, onDeactivate, onReactivate, userClientsMap, pendingUsers
}: UsersPanelProps) {
  const [editDrawerOpen, setEditDrawerOpen] = useState(false)
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<Member | null>(null)
  const [editRole, setEditRole] = useState<'admin' | 'user'>('user')
  const [editName, setEditName] = useState('')
  const [editUserRole, setEditUserRole] = useState('')
  const [editEmail, setEditEmail] = useState('')
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

  const [createName, setCreateName] = useState('')
  const [createRole, setCreateRole] = useState('')
  const [createEmail, setCreateEmail] = useState('')
  const [createAccessRole, setCreateAccessRole] = useState<'admin' | 'user'>('user')
  const [createClients, setCreateClients] = useState<string[]>([])
  const [createErrors, setCreateErrors] = useState<ValidationErrors>({})
  const [creating, setCreating] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)
  const [currentTab, setCurrentTab] = useState<CurrentTab>('members')

  const [linkDrawerOpen, setLinkDrawerOpen] = useState(false)
  const [linkingPendingUser, setLinkingPendingUser] = useState<PendingAuthUser | null>(null)
  const [linkSearch, setLinkSearch] = useState('')
  const [linkingUserId, setLinkingUserId] = useState<string | null>(null)
  const [linking, setLinking] = useState(false)

  const [googleSearch, setGoogleSearch] = useState('')
  const [googleResults, setGoogleResults] = useState<GoogleUser[]>([])
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [showGoogleDropdown, setShowGoogleDropdown] = useState(false)
  const googleDropdownRef = useRef<HTMLDivElement>(null)
  const googleSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

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
      if (statusFilter === 'active') {
        filtered = filtered.filter(u => !!u.auth_user_id)
      } else if (statusFilter === 'pending') {
        filtered = filtered.filter(u => !u.auth_user_id)
      }
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

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPage(1) }, [searchQuery])

  const openEditDrawer = useCallback((user: Member) => {
    setEditingUser(user)
    setEditName(user.name)
    setEditUserRole(user.role)
    setEditEmail(user.email ?? '')
    setEditRole(user.access_role ?? 'user')
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

  const openCreateDrawer = useCallback(() => {
    setCreateName('')
    setCreateRole('')
    setCreateEmail('')
    setCreateAccessRole('user')
    setCreateClients([])
    setCreateErrors({})
    setGoogleSearch('')
    setGoogleResults([])
    setCreateDrawerOpen(true)
  }, [])

  const closeCreateDrawer = () => {
    setCreateDrawerOpen(false)
    setCreating(false)
  }

  const validateCreate = (name: string, role: string, email?: string): ValidationErrors => {
    const errs: ValidationErrors = {}
    if (!name.trim()) errs.name = 'Nome é obrigatório'
    else if (name.trim().length < 2) errs.name = 'Nome deve ter pelo menos 2 caracteres'
    else if (name.trim().length > 100) errs.name = 'Nome deve ter no máximo 100 caracteres'
    if (!role.trim()) errs.role = 'Cargo é obrigatório'
    else if (role.trim().length > 50) errs.role = 'Cargo deve ter no máximo 50 caracteres'
    if (email && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Email inválido'
    }
    return errs
  }

  const validateEdit = (name: string, role: string, email?: string): ValidationErrors => {
    const errs: ValidationErrors = {}
    if (!name.trim()) errs.name = 'Nome é obrigatório'
    else if (name.trim().length < 2) errs.name = 'Nome deve ter pelo menos 2 caracteres'
    else if (name.trim().length > 100) errs.name = 'Nome deve ter no máximo 100 caracteres'
    if (!role.trim()) errs.role = 'Cargo é obrigatório'
    else if (role.trim().length > 50) errs.role = 'Cargo deve ter no máximo 50 caracteres'
    if (email && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Email inválido'
    }
    return errs
  }

  const handleGoogleSearch = async (query: string, isEdit = false) => {
    if (isEdit) {
      setEditLoadingGoogle(true)
    } else {
      setLoadingGoogle(true)
    }
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
    if (Object.keys(errs).length > 0) {
      toast.error('Corrija os erros antes de criar')
      return
    }
    setCreating(true)
    const googleUser = googleResults.find(u => u.email === googleSearch)
    const ok = await onCreate(
      createName.trim(),
      createRole.trim(),
      googleUser?.id ?? null,
      createAccessRole,
      createClients,
      createEmail.trim() || null,
      googleUser?.avatarUrl ?? null
    )
    setCreating(false)
    if (ok) {
      toast.success(`Utilizador "${createName}" criado`)
      closeCreateDrawer()
    } else {
      toast.error('Erro ao criar utilizador')
    }
  }

  const handleUpdateUser = async () => {
    if (!editingUser) return

    const errs = validateEdit(editName, editUserRole, editEmail)
    setEditErrors(errs)
    if (Object.keys(errs).length > 0) {
      toast.error('Corrija os erros antes de salvar')
      return
    }

    setSavingEdit(true)

    const nameChanged = editName.trim() !== editingUser.name
    const roleChanged = editUserRole.trim() !== editingUser.role
    const emailChanged = editEmail.trim() !== (editingUser.email ?? '')

    let basicOk = true
    if (nameChanged || roleChanged || emailChanged) {
      basicOk = await onUpdate(
        editingUser.id,
        editName.trim(),
        editUserRole.trim(),
        editEmail.trim() || null
      )
    }

    const accessRoleChanged = editRole !== (editingUser.access_role ?? 'user')
    let roleOk = true
    if (accessRoleChanged) {
      roleOk = await onSetRole(editingUser.id, editRole)
    }

    const currentClientIds = userClientsMap[editingUser.id] ?? []
    const toAdd = editClients.filter(id => !currentClientIds.includes(id))
    const toRemove = currentClientIds.filter(id => !editClients.includes(id))

    let clientOk = true
    for (const cid of toAdd) {
      const ok = await onLink(editingUser.id, cid)
      if (!ok) { clientOk = false; break }
    }
    for (const cid of toRemove) {
      const ok = await onUnlink(editingUser.id, cid)
      if (!ok) { clientOk = false; break }
    }

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
      if (ok) {
        toast.success(`Utilizador "${userName}" desativado`)
        setEditDrawerOpen(false)
        setEditingUser(null)
      } else {
        toast.error('Erro ao desativar utilizador')
      }
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
      if (ok) {
        toast.success(`Utilizador "${userName}" reativado`)
        setEditDrawerOpen(false)
        setEditingUser(null)
      } else {
        toast.error('Erro ao reativar utilizador')
      }
    } catch {
      toast.error('Ocorreu um erro inesperado ao reativar.')
    } finally {
      setTogglingActive(false)
      setShowReactivateConfirm(false)
      setPendingReactivateId(null)
    }
  }

  const handleLinkClient = (_clientId: string, _clientName: string) => {
    setEditClients(prev => [...prev, _clientId])
  }

  const handleUnlinkClient = (_clientId: string, _clientName: string) => {
    setEditClients(prev => prev.filter(id => id !== _clientId))
  }

  const toggleCreateClient = (clientId: string) => {
    setCreateClients(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    )
  }

  const getUserClients = useCallback((userId: string) => {
    const clientIds = userClientsMap[userId] ?? []
    return clients.filter(c => clientIds.includes(c.id))
  }, [clients, userClientsMap])

  const createNameId = 'create-user-name'
  const createRoleId = 'create-user-role'
  const createRoleSuggestionsId = 'create-user-role-suggestions'
  const createEmailId = 'create-user-email'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-56 md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, cargo ou email..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(1) }}
            className="pl-9"
          />
        </div>

        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          <button
            onClick={() => { setCurrentTab('members'); setPage(1) }}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
              currentTab === 'members'
                ? 'bg-background shadow-sm font-medium'
                : 'hover:bg-background/50 text-muted-foreground'
            }`}
          >
            Membros
          </button>
          <button
            onClick={() => { setCurrentTab('pending'); setPage(1) }}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
              currentTab === 'pending'
                ? 'bg-background shadow-sm font-medium'
                : 'hover:bg-background/50 text-muted-foreground'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
            Pendentes ({pendingUsers.length})
          </button>
        </div>

        {currentTab === 'members' && (
          <div className="flex gap-1 bg-muted p-1 rounded-lg">
            <button
              onClick={() => { setStatusFilter('all'); setPage(1) }}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                statusFilter === 'all'
                  ? 'bg-background shadow-sm font-medium'
                  : 'hover:bg-background/50 text-muted-foreground'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => { setStatusFilter('active'); setPage(1) }}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                statusFilter === 'active'
                  ? 'bg-background shadow-sm font-medium'
                  : 'hover:bg-background/50 text-muted-foreground'
              }`}
            >
              <Key className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
              Ativos
            </button>
            <button
              onClick={() => { setStatusFilter('pending'); setPage(1) }}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                statusFilter === 'pending'
                  ? 'bg-background shadow-sm font-medium'
                  : 'hover:bg-background/50 text-muted-foreground'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
              Sem acesso
            </button>
            <button
              onClick={() => { setStatusFilter('deactivated'); setPage(1) }}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                statusFilter === 'deactivated'
                  ? 'bg-background shadow-sm font-medium'
                  : 'hover:bg-background/50 text-muted-foreground'
              }`}
            >
              <UserX className="w-3.5 h-3.5 text-gray-500" />
              Desativados
            </button>
          </div>
        )}

        {currentTab === 'members' && (
          <Button onClick={openCreateDrawer} aria-label="Criar novo utilizador" className="ml-auto">
            <Plus className="w-4 h-4 mr-1" aria-hidden="true" />
            Novo usuário
          </Button>
        )}
      </div>

      {currentTab === 'members' && (
        <div className="text-sm text-muted-foreground">
          Mostrando {filteredUsers.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0} - {Math.min(page * PAGE_SIZE, filteredUsers.length)} de {filteredUsers.length} utilizador(es)
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {currentTab === 'pending' && pendingUsers.length === 0 && (
          <div className="col-span-full py-12 text-center">
            <p className="text-muted-foreground">Nenhum usuário pendente</p>
            <p className="text-sm text-muted-foreground mt-1">
              Usuários que fizerem login com o domínio permitido mas ainda não foram vinculados aparecerão aqui.
            </p>
          </div>
        )}
        {currentTab === 'pending' && pendingUsers.length > 0 && pendingUsers.map(pu => (
          <Card key={pu.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium overflow-hidden relative">
                  {pu.avatarUrl ? (
                    <img src={pu.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    pu.email.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base truncate">{pu.name}</CardTitle>
                  <CardDescription className="text-xs truncate">{pu.email}</CardDescription>
                  {pu.lastSignInAt && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Último login: {new Date(pu.lastSignInAt).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                size="sm"
                onClick={() => {
                  setLinkingPendingUser(pu)
                  setLinkDrawerOpen(true)
                }}
              >
                <Link2 className="w-4 h-4 mr-1" />
                Vincular
              </Button>
            </CardContent>
          </Card>
        ))}
        {currentTab === 'members' && paginatedUsers.map(u => {
          const ucs = getUserClients(u.id)
          const hasEmail = !!u.email
          const hasGoogle = !!u.auth_user_id
          return (
            <Card key={u.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEditDrawer(u)}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium overflow-hidden relative">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      u.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base truncate">{u.name}</CardTitle>
                      {u.is_active === false && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                          Desativado
                        </span>
                      )}
                    </div>
                    <CardDescription className="text-xs truncate">{u.role}</CardDescription>
                    {hasEmail && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {u.email}
                      </p>
                    )}
                    {!hasEmail && (
                      <p className="text-xs text-gray-400 mt-0.5">Sem email</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building className="w-4 h-4" aria-hidden="true" />
                  <span>{ucs.length} cliente{ucs.length !== 1 ? 's' : ''}</span>
                </div>
                {ucs.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {ucs.slice(0, 3).map(c => (
                      <span key={c.id} className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full">
                        {c.name}
                      </span>
                    ))}
                    {ucs.length > 3 && (
                      <span className="px-2 py-0.5 text-muted-foreground text-xs">+{ucs.length - 3}</span>
                    )}
                  </div>
                )}
                <div className="mt-3 pt-3 border-t flex items-center justify-between">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      u.access_role === 'admin'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                        : 'bg-muted'
                    }`}
                  >
                    {u.access_role === 'admin' ? 'Administrador' : 'Utilizador'}
                  </span>
                  {(!hasGoogle || !hasEmail) && (
                    <span className="text-xs px-2 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Pendente
                    </span>
                  )}
                  {hasGoogle && (
                    <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 flex items-center gap-1">
                      <Key className="w-3 h-3" />
                      Ativo
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {currentTab === 'members' && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      <Drawer direction="right" open={createDrawerOpen} onOpenChange={setCreateDrawerOpen}>
        <DrawerContent data-vaul-drawer-direction="right">
          <DrawerHeader>
            <DrawerTitle>Criar Utilizador</DrawerTitle>
            <DrawerDescription>
              Crie um novo utilizador. Vincule uma conta Google depois.
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-6 pb-6 space-y-6 overflow-y-auto max-h-[calc(100vh-200px)]">
            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor={createNameId}>Nome completo</Label>
                <Input
                  id={createNameId}
                  value={createName}
                  onChange={e => { setCreateName(e.target.value); if (createErrors.name) setCreateErrors(prev => ({ ...prev, name: undefined })) }}
                  placeholder="Ex: Maria Silva"
                  aria-invalid={!!createErrors.name}
                  aria-describedby={createErrors.name ? `${createNameId}-error` : undefined}
                />
                {createErrors.name && (
                  <p id={`${createNameId}-error`} role="alert" className="text-xs text-red-500 mt-1">
                    {createErrors.name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Nome que aparecerá para outros usuários.
                </p>
              </div>

              <div className="space-y-1">
                <Label htmlFor={createRoleId}>Cargo / Função</Label>
                <Input
                  id={createRoleId}
                  value={createRole}
                  onChange={e => { setCreateRole(e.target.value); if (createErrors.role) setCreateErrors(prev => ({ ...prev, role: undefined })) }}
                  placeholder="Ex: Social Media"
                  list={createRoleSuggestionsId}
                  aria-invalid={!!createErrors.role}
                  aria-describedby={createErrors.role ? `${createRoleId}-error` : undefined}
                />
                <datalist id={createRoleSuggestionsId}>
                  {ROLE_SUGGESTIONS.map(role => (
                    <option key={role} value={role} />
                  ))}
                </datalist>
                {createErrors.role && (
                  <p id={`${createRoleId}-error`} role="alert" className="text-xs text-red-500 mt-1">
                    {createErrors.role}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Escolha uma sugestão ou digite livremente.
                </p>
              </div>

              <div className="space-y-1">
                <Label htmlFor={createEmailId}>Email corporativo</Label>
                <Input
                  id={createEmailId}
                  type="email"
                  value={createEmail}
                  onChange={e => { setCreateEmail(e.target.value); if (createErrors.email) setCreateErrors(prev => ({ ...prev, email: undefined })) }}
                  placeholder="Ex: maria@empresa.com"
                  aria-invalid={!!createErrors.email}
                  aria-describedby={createErrors.email ? `${createEmailId}-error` : undefined}
                />
                {createErrors.email && (
                  <p id={`${createEmailId}-error`} role="alert" className="text-xs text-red-500 mt-1">
                    {createErrors.email}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Email do Google do colaborador. A conta será vinculada automaticamente no primeiro login.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">Nível de acesso</Label>
              <p className="text-xs text-muted-foreground -mt-2">
                Define o que o usuário pode fazer no sistema.
              </p>
              <div className="flex gap-2">
                <Button
                  variant={createAccessRole === 'user' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCreateAccessRole('user')}
                  className="flex-1"
                  aria-pressed={createAccessRole === 'user'}
                >
                  <Check className={`w-4 h-4 mr-1 ${createAccessRole === 'user' ? 'opacity-100' : 'opacity-0'}`} />
                  Utilizador
                </Button>
                <Button
                  variant={createAccessRole === 'admin' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCreateAccessRole('admin')}
                  className="flex-1"
                  aria-pressed={createAccessRole === 'admin'}
                >
                  <Check className={`w-4 h-4 mr-1 ${createAccessRole === 'admin' ? 'opacity-100' : 'opacity-0'}`} />
                  Administrador
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">Clientes</Label>
              <p className="text-xs text-muted-foreground -mt-2">
                Selecione os clientes que este usuário terá acesso.
              </p>
              {clients.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                  Nenhum cliente disponível
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {clients.map(c => (
                    <div
                      key={c.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        createClients.includes(c.id)
                          ? 'bg-primary/10 border border-primary'
                          : 'border hover:bg-muted/50'
                      }`}
                      onClick={() => toggleCreateClient(c.id)}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        createClients.includes(c.id) ? 'bg-primary border-primary' : 'border-muted-foreground'
                      }`}>
                        {createClients.includes(c.id) && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">/{c.slug}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          <div className="px-6 pb-4 space-y-3">
            <Label className="text-base font-medium">Conta Google</Label>
            <p className="text-xs text-muted-foreground -mt-2">
              Busque uma conta Google já cadastrada para vincular agora. Pode deixar para depois.
            </p>
            <div className="relative" ref={googleDropdownRef}>
              <Input
                type="email"
                value={googleSearch}
                onChange={e => handleGoogleSearchChange(e.target.value)}
                onFocus={() => { if (googleSearch) handleGoogleSearch(googleSearch) }}
                placeholder="Buscar email Google..."
                className="w-full"
              />
              {showGoogleDropdown && googleResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {googleResults.map(u => (
                    <div
                      key={u.id}
                      className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer"
                      onClick={() => {
                        setGoogleSearch(u.email)
                        setShowGoogleDropdown(false)
                      }}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <UserCheck className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{u.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {showGoogleDropdown && googleSearch && googleResults.length === 0 && !loadingGoogle && (
                <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg p-3 text-sm text-muted-foreground">
                  Nenhum utilizador Google encontrado
                </div>
              )}
              {loadingGoogle && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>

          <DrawerFooter className="flex-row justify-end gap-2">
            <Button variant="outline" onClick={closeCreateDrawer} disabled={creating}>Cancelar</Button>
            <Button
              onClick={handleCreate}
              isLoading={creating}
              disabled={!createName.trim() || !createRole.trim()}
            >
              Criar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Drawer direction="right" open={editDrawerOpen} onOpenChange={open => { if (!open && !showDeactivateConfirm && !showReactivateConfirm && !showDiscardConfirm) closeEditDrawer() }}>
        <DrawerContent data-vaul-drawer-direction="right">
          <DrawerHeader>
            <DrawerTitle>Editar Utilizador</DrawerTitle>
            <DrawerDescription>
              Altere os dados e clientes do utilizador.
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-6 pb-6 space-y-6 overflow-y-auto max-h-[calc(100vh-200px)]">
            {editingUser && (
              <>
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-medium overflow-hidden relative">
                    {editingUser.avatar_url ? (
                      <img src={editingUser.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      editingUser.name.charAt(0).toUpperCase()
                    )}
                    
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{editingUser.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{editingUser.role}</p>
                    {editingUser.email && (
                      <p className="text-xs text-muted-foreground truncate mt-1">{editingUser.email}</p>
                    )}
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
                        <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                          Conta Google não vinculada
                        </p>
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
                      onChange={e => { setEditName(e.target.value); if (editErrors.name) setEditErrors(prev => ({ ...prev, name: undefined })) }}
                      placeholder="Ex: Maria Silva"
                      aria-invalid={!!editErrors.name}
                    />
                    {editErrors.name && (
                      <p role="alert" className="text-xs text-red-500 mt-1">{editErrors.name}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="edit-role">Cargo / Função</Label>
                    <Input
                      id="edit-role"
                      value={editUserRole}
                      onChange={e => { setEditUserRole(e.target.value); if (editErrors.role) setEditErrors(prev => ({ ...prev, role: undefined })) }}
                      placeholder="Ex: Social Media"
                      list="edit-role-suggestions"
                      aria-invalid={!!editErrors.role}
                    />
                    <datalist id="edit-role-suggestions">
                      {ROLE_SUGGESTIONS.map(role => (
                        <option key={role} value={role} />
                      ))}
                    </datalist>
                    {editErrors.role && (
                      <p role="alert" className="text-xs text-red-500 mt-1">{editErrors.role}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="edit-email">Email corporativo</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editEmail}
                      onChange={e => { setEditEmail(e.target.value); if (editErrors.email) setEditErrors(prev => ({ ...prev, email: undefined })) }}
                      placeholder="Ex: maria@empresa.com"
                      aria-invalid={!!editErrors.email}
                    />
                    {editErrors.email && (
                      <p role="alert" className="text-xs text-red-500 mt-1">{editErrors.email}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-medium">Acesso</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={editRole === 'user' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setEditRole('user')}
                      className="flex-1"
                      aria-pressed={editRole === 'user'}
                    >
                      <Check className={`w-4 h-4 mr-1 ${editRole === 'user' ? 'opacity-100' : 'opacity-0'}`} />
                      Utilizador
                    </Button>
                    <Button
                      variant={editRole === 'admin' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setEditRole('admin')}
                      className="flex-1"
                      aria-pressed={editRole === 'admin'}
                    >
                      <Check className={`w-4 h-4 mr-1 ${editRole === 'admin' ? 'opacity-100' : 'opacity-0'}`} />
                      Administrador
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-medium">Clientes associados</Label>
                  {clients.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                      Nenhum cliente disponível
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {clients.map(c => {
                        const isLinked = editClients.includes(c.id)
                        return (
                          <div
                            key={c.id}
                            className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                              isLinked
                                ? 'bg-primary/10 border border-primary'
                                : 'border hover:bg-muted/50'
                            }`}
                          >
                            <div
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer ${
                                isLinked ? 'bg-primary border-primary' : 'border-muted-foreground'
                              }`}
                              onClick={() => isLinked ? handleUnlinkClient(c.id, c.name) : handleLinkClient(c.id, c.name)}
                            >
                              {isLinked && <Check className="w-3 h-3 text-primary-foreground" />}
                            </div>
                            <div className="flex-1 cursor-pointer" onClick={() => isLinked ? handleUnlinkClient(c.id, c.name) : handleLinkClient(c.id, c.name)}>
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
                        onClick={() => {
                          setEditGoogleSearch(u.email)
                          setEditShowGoogleDropdown(false)
                        }}
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <UserCheck className="w-4 h-4 text-primary" />
                          )}
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
                  <p className="text-xs text-green-600 dark:text-green-400 font-mono mt-1">
                    {editingUser.auth_user_id}
                  </p>
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

      <Drawer direction="right" open={linkDrawerOpen} onOpenChange={setLinkDrawerOpen}>
        <DrawerContent data-vaul-drawer-direction="right">
          <DrawerHeader>
            <DrawerTitle>Vincular Utilizador</DrawerTitle>
            <DrawerDescription>
              Selecione o membro para vincular a esta conta Google.
            </DrawerDescription>
          </DrawerHeader>

          {linkingPendingUser && (
            <div className="px-6 pb-6 space-y-4 overflow-y-auto max-h-[calc(100vh-200px)]">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-medium overflow-hidden">
                  {linkingPendingUser.avatarUrl ? (
                    <img src={linkingPendingUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    linkingPendingUser.email.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{linkingPendingUser.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{linkingPendingUser.email}</p>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="link-search">Buscar membro</Label>
                <Input
                  id="link-search"
                  value={linkSearch}
                  onChange={e => setLinkSearch(e.target.value)}
                  placeholder="Buscar por nome ou cargo..."
                />
                <p className="text-xs text-muted-foreground">
                  Apenas membros sem conta Google vinculada são mostrados.
                </p>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {users
                  .filter(u => !u.auth_user_id)
                  .filter(u =>
                    !linkSearch.trim() ||
                    u.name.toLowerCase().includes(linkSearch.toLowerCase()) ||
                    u.role.toLowerCase().includes(linkSearch.toLowerCase())
                  )
                  .map(u => (
                    <div
                      key={u.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        linkingUserId === u.id
                          ? 'bg-primary/10 border border-primary'
                          : 'border hover:bg-muted/50'
                      }`}
                      onClick={() => setLinkingUserId(u.id)}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        linkingUserId === u.id ? 'bg-primary border-primary' : 'border-muted-foreground'
                      }`}>
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
            <Button variant="outline" onClick={() => { setLinkDrawerOpen(false); setLinkingUserId(null); setLinkingPendingUser(null); setLinkSearch('') }} disabled={linking}>Cancelar</Button>
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
