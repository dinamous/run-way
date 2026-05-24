import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/Drawer'
import { toast } from 'sonner'
import type { DbClientRow } from '@/types/db'
import type { Member } from '@/hooks/infra/useSupabase'
import { Plus, Trash2, Users, Search, ChevronLeft, ChevronRight, Clock, Building2, Pencil, X, Check, CalendarDays, UserCheck, UserX, UserMinus } from 'lucide-react'

interface ClientsPanelProps {
  clients: DbClientRow[]
  users: Member[]
  userClientsMap: Record<string, string[]>
  onCreate: (name: string, slug: string) => Promise<boolean>
  onUpdate: (id: string, name: string, slug: string) => Promise<boolean>
  onDelete: (id: string, name: string) => Promise<boolean>
  onLinkUser?: (clientId: string, userId: string) => Promise<boolean>
  onUnlinkUser?: (clientId: string, userId: string) => Promise<boolean>
}

type ValidationErrors = { name?: string; slug?: string }
type StatusFilter = 'all' | 'with_pending' | 'no_pending'

const PAGE_SIZE = 15

function toSlug(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

function validateFields(n: string, s: string): ValidationErrors {
  const errs: ValidationErrors = {}
  if (!n.trim()) errs.name = 'Nome é obrigatório'
  else if (n.trim().length < 2) errs.name = 'Mínimo 2 caracteres'
  else if (n.trim().length > 100) errs.name = 'Máximo 100 caracteres'

  if (!s.trim()) errs.slug = 'Slug é obrigatório'
  else if (!/^[a-z0-9-]+$/.test(s.trim())) errs.slug = 'Apenas letras minúsculas, números e hífens'
  else if (s.trim().length < 2) errs.slug = 'Mínimo 2 caracteres'
  else if (s.trim().length > 50) errs.slug = 'Máximo 50 caracteres'
  return errs
}

// Flip animation for the count number
function FlipCount({ value }: { value: number }) {
  const reduced = useReducedMotion()
  const [displayed, setDisplayed] = useState(value)
  const [flip, setFlip] = useState(false)

  useEffect(() => {
    if (value === displayed) return
    if (reduced) { setDisplayed(value); return }
    setFlip(true)
    const t = setTimeout(() => { setDisplayed(value); setFlip(false) }, 140)
    return () => clearTimeout(t)
  }, [value, displayed, reduced])

  return (
    <motion.span
      key={displayed}
      animate={flip ? { y: [0, -6, 0], opacity: [1, 0, 1] } : {}}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="tabular-nums"
    >
      {displayed}
    </motion.span>
  )
}

const EASE_OUT_QUINT = [0.22, 1, 0.36, 1] as const

export function ClientsPanel({
  clients, users, userClientsMap, onCreate, onUpdate, onDelete
}: ClientsPanelProps) {
  const reduced = useReducedMotion()

  // Create inline form state
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createSlug, setCreateSlug] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [createErrors, setCreateErrors] = useState<ValidationErrors>({})
  const [creating, setCreating] = useState(false)
  const createNameRef = useRef<HTMLInputElement>(null)

  // Edit drawer state
  const [editDrawerOpen, setEditDrawerOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<DbClientRow | null>(null)
  const [editName, setEditName] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [editErrors, setEditErrors] = useState<ValidationErrors>({})
  const [saving, setSaving] = useState(false)

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingDeleteClient, setPendingDeleteClient] = useState<DbClientRow | null>(null)

  // List state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)

  const getClientUsers = useCallback((clientId: string) => {
    const userIds = Object.entries(userClientsMap)
      .filter(([, clientIds]) => clientIds.includes(clientId))
      .map(([userId]) => userId)
    return users.filter(u => userIds.includes(u.id))
  }, [userClientsMap, users])

  const getPendingUsers = useCallback((clientId: string) => {
    return getClientUsers(clientId).filter(u => !u.auth_user_id)
  }, [getClientUsers])

  const filteredClients = useMemo(() => {
    let filtered = clients
    if (statusFilter === 'with_pending') {
      filtered = filtered.filter(c => getPendingUsers(c.id).length > 0)
    } else if (statusFilter === 'no_pending') {
      filtered = filtered.filter(c => {
        const ul = getClientUsers(c.id)
        return ul.length > 0 && getPendingUsers(c.id).length === 0
      })
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)
      )
    }
    return filtered
  }, [clients, searchQuery, statusFilter, getClientUsers, getPendingUsers])

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / PAGE_SIZE))
  const paginatedClients = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredClients.slice(start, start + PAGE_SIZE)
  }, [filteredClients, page])

  // Auto-slug from name
  const handleCreateNameChange = (val: string) => {
    setCreateName(val)
    if (createErrors.name) setCreateErrors(p => ({ ...p, name: undefined }))
    if (!slugManual) {
      setCreateSlug(toSlug(val))
      if (createErrors.slug) setCreateErrors(p => ({ ...p, slug: undefined }))
    }
  }

  const openCreate = () => {
    setCreateName('')
    setCreateSlug('')
    setSlugManual(false)
    setCreateErrors({})
    setCreateOpen(true)
    setTimeout(() => createNameRef.current?.focus(), 50)
  }

  const closeCreate = () => {
    setCreateOpen(false)
    setCreating(false)
  }

  const handleCreate = async () => {
    const errs = validateFields(createName, createSlug)
    setCreateErrors(errs)
    if (Object.keys(errs).length > 0) return
    setCreating(true)
    const ok = await onCreate(createName.trim(), createSlug.trim())
    setCreating(false)
    if (ok) { toast.success(`"${createName}" criado`); closeCreate() }
    else toast.error('Erro ao criar cliente')
  }

  const openEdit = (client: DbClientRow) => {
    editingClientRef.current = client
    setEditingClient(client)
    setEditName(client.name)
    setEditSlug(client.slug)
    setEditErrors({})
    setEditDrawerOpen(true)
  }

  const closeEdit = () => {
    setEditDrawerOpen(false)
    setEditingClient(null)
    setEditErrors({})
    setSaving(false)
  }

  const editingClientRef = useRef<DbClientRow | null>(null)

  const handleUpdate = async () => {
    const client = editingClientRef.current
    if (!client) return
    const errs = validateFields(editName, editSlug)
    setEditErrors(errs)
    if (Object.keys(errs).length > 0) return
    setSaving(true)
    const ok = await onUpdate(client.id, editName.trim(), editSlug.trim())
    setSaving(false)
    if (ok) { toast.success('Cliente atualizado'); closeEdit() }
    else toast.error('Erro ao atualizar')
  }

  const handleDelete = async (client: DbClientRow) => {
    setDeletingId(client.id)
    const ok = await onDelete(client.id, client.name)
    setDeletingId(null)
    if (ok) { toast.success('Cliente eliminado'); if (editingClient?.id === client.id) closeEdit() }
    else toast.error('Erro ao eliminar cliente')
  }

  const filters: { key: StatusFilter; label: string; icon?: React.ReactNode }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'with_pending', label: 'Com pendentes', icon: <Clock className="w-3 h-3" /> },
    { key: 'no_pending', label: 'Ativos', icon: <Building2 className="w-3 h-3" /> },
  ]

  return (
    <div className="space-y-0">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar cliente ou slug..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(1) }}
            className="pl-8 h-8 w-56 text-sm"
          />
        </div>

        <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => { setStatusFilter(f.key); setPage(1) }}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
                statusFilter === f.key
                  ? 'bg-background text-foreground font-medium shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.icon && (
                <span className={statusFilter === f.key ? 'opacity-100' : 'opacity-60'}>
                  {f.icon}
                </span>
              )}
              {f.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground tabular-nums">
            <FlipCount value={filteredClients.length} /> cliente{filteredClients.length !== 1 ? 's' : ''}
          </span>
          <Button size="sm" onClick={openCreate} className="h-8 text-xs gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Novo cliente
          </Button>
        </div>
      </div>

      {/* Inline create form */}
      <AnimatePresence>
        {createOpen && (
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
                <span className="text-sm font-medium">Novo cliente</span>
                <button
                  onClick={closeCreate}
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-4 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="create-name" className="text-xs">Nome</Label>
                  <Input
                    id="create-name"
                    ref={createNameRef}
                    value={createName}
                    onChange={e => handleCreateNameChange(e.target.value)}
                    placeholder="Acme Inc."
                    aria-invalid={!!createErrors.name}
                    className="h-8 text-sm"
                    onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
                  />
                  {createErrors.name && (
                    <p role="alert" className="text-xs text-destructive">{createErrors.name}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="create-slug" className="text-xs">Slug</Label>
                  <Input
                    id="create-slug"
                    value={createSlug}
                    onChange={e => {
                      setCreateSlug(e.target.value)
                      setSlugManual(true)
                      if (createErrors.slug) setCreateErrors(p => ({ ...p, slug: undefined }))
                    }}
                    placeholder="acme-inc"
                    aria-invalid={!!createErrors.slug}
                    className="h-8 text-sm font-mono"
                    onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
                  />
                  {createErrors.slug ? (
                    <p role="alert" className="text-xs text-destructive">{createErrors.slug}</p>
                  ) : createSlug ? (
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      run-way.app/clients/<span className="text-foreground">{createSlug}</span>
                    </p>
                  ) : null}
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
                  disabled={!createName.trim() || !createSlug.trim()}
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

      {/* Client list */}
      {filteredClients.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {searchQuery || statusFilter !== 'all'
              ? 'Nenhum cliente corresponde ao filtro.'
              : 'Ainda não há clientes. Crie o primeiro.'}
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          {/* List header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] items-center px-4 py-2 bg-muted/50 border-b border-border">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cliente</span>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-32 text-center hidden sm:block">Usuários</span>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-24 text-center hidden md:block">Status</span>
            <span className="w-16" />
          </div>

          <AnimatePresence mode="popLayout">
            {paginatedClients.map((c, i) => {
              const clientUsers = getClientUsers(c.id)
              const pendingUsers = getPendingUsers(c.id)
              const hasPending = pendingUsers.length > 0
              const isActive = clientUsers.length > 0 && !hasPending

              return (
                <motion.div
                  key={c.id}
                  layout={!reduced}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, x: 8 }}
                  transition={{
                    duration: 0.18,
                    ease: EASE_OUT_QUINT,
                    delay: reduced ? 0 : i * 0.025,
                  }}
                  className="group grid grid-cols-[1fr_auto_auto_auto] items-center px-4 py-3 border-b border-border/60 last:border-b-0 hover:bg-muted/30 transition-colors"
                >
                  {/* Name + slug */}
                  <div className="min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(c)}
                        className="text-sm font-medium truncate hover:underline underline-offset-2 cursor-pointer text-left"
                        title={c.name}
                      >
                        {c.name}
                      </button>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                      /{c.slug}
                    </div>
                  </div>

                  {/* User count */}
                  <div className="w-32 text-center hidden sm:flex justify-center items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm tabular-nums">{clientUsers.length}</span>
                    {hasPending && (
                      <span className="text-xs text-orange-600 dark:text-orange-400 tabular-nums">
                        ({pendingUsers.length} pend.)
                      </span>
                    )}
                  </div>

                  {/* Status dot */}
                  <div className="w-24 hidden md:flex justify-center">
                    {hasPending ? (
                      <span className="flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-60" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
                        </span>
                        Pendente
                      </span>
                    ) : isActive ? (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Ativo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="h-2 w-2 rounded-full bg-border" />
                        Sem usuários
                      </span>
                    )}
                  </div>

                  {/* Actions — appear on hover */}
                  <div className="w-16 flex justify-end items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(c)}
                      className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                      aria-label={`Editar ${c.name}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setPendingDeleteClient(c)}
                      disabled={deletingId === c.id}
                      className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer disabled:opacity-50"
                      aria-label={`Eliminar ${c.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredClients.length)} de {filteredClients.length}
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

      {/* Edit drawer */}
      <Drawer direction="right" open={editDrawerOpen} onOpenChange={open => { if (!open) closeEdit() }}>
        <DrawerContent data-vaul-drawer-direction="right">
          <DrawerHeader>
            <DrawerTitle>{editingClient?.name}</DrawerTitle>
            <DrawerDescription className="font-mono text-xs">/{editingClient?.slug}</DrawerDescription>
          </DrawerHeader>

          <div className="px-6 pb-6 space-y-5 overflow-y-auto max-h-[calc(100vh-200px)]">
            {/* Client stats */}
            {editingClient && (() => {
              const cu = getClientUsers(editingClient.id)
              const active = cu.filter(u => u.auth_user_id && u.is_active !== false)
              const pending = cu.filter(u => !u.auth_user_id && u.is_active !== false)
              const inactive = cu.filter(u => u.is_active === false)
              const createdAt = editingClient.created_at
                ? new Date(editingClient.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                : null
              return (
                <div className="space-y-3">
                  {createdAt && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                      <span>Criado em {createdAt}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-md border border-border bg-muted/40 px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                      <div className="text-lg font-semibold tabular-nums leading-none">{active.length}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Ativos</div>
                    </div>
                    <div className="rounded-md border border-border bg-muted/40 px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Clock className="w-3.5 h-3.5 text-orange-500" />
                      </div>
                      <div className="text-lg font-semibold tabular-nums leading-none">{pending.length}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Pendentes</div>
                    </div>
                    <div className="rounded-md border border-border bg-muted/40 px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <UserMinus className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div className="text-lg font-semibold tabular-nums leading-none">{inactive.length}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Inativos</div>
                    </div>
                  </div>
                  {cu.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Usuários vinculados</p>
                      <div className="divide-y divide-border rounded-md border border-border overflow-hidden">
                        {cu.map(u => {
                          const isActive = !!u.auth_user_id && u.is_active !== false
                          const isInactive = u.is_active === false
                          return (
                            <div key={u.id} className="flex items-center gap-2.5 px-3 py-2 bg-background">
                              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0 overflow-hidden">
                                {u.avatar_url
                                  ? <img src={u.avatar_url} alt={u.name} className="w-full h-full object-cover" />
                                  : <span>{u.avatar}</span>
                                }
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium truncate">{u.name}</div>
                                <div className="text-xs text-muted-foreground truncate">{u.role}</div>
                              </div>
                              <div className="shrink-0">
                                {isInactive ? (
                                  <span className="text-xs text-muted-foreground">Inativo</span>
                                ) : isActive ? (
                                  <span className="h-2 w-2 rounded-full bg-emerald-500 block" />
                                ) : (
                                  <span className="h-2 w-2 rounded-full bg-orange-400 block" />
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  {cu.length === 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <UserX className="w-3.5 h-3.5" />
                      <span>Nenhum usuário vinculado</span>
                    </div>
                  )}
                  <div className="border-t border-border/60 pt-1" />
                </div>
              )
            })()}

            <div className="space-y-1.5">
              <Label htmlFor="edit-name" className="text-xs">Nome</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={e => { setEditName(e.target.value); if (editErrors.name) setEditErrors(p => ({ ...p, name: undefined })) }}
                placeholder="Nome do cliente"
                aria-invalid={!!editErrors.name}
                className="h-8 text-sm"
              />
              {editErrors.name && (
                <p role="alert" className="text-xs text-destructive">{editErrors.name}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-slug" className="text-xs">Slug</Label>
              <Input
                id="edit-slug"
                value={editSlug}
                onChange={e => { setEditSlug(e.target.value); if (editErrors.slug) setEditErrors(p => ({ ...p, slug: undefined })) }}
                placeholder="empresa-x"
                aria-invalid={!!editErrors.slug}
                className="h-8 text-sm font-mono"
              />
              {editErrors.slug ? (
                <p role="alert" className="text-xs text-destructive">{editErrors.slug}</p>
              ) : editSlug ? (
                <p className="text-xs text-muted-foreground font-mono truncate">
                  run-way.app/clients/<span className="text-foreground">{editSlug}</span>
                </p>
              ) : null}
            </div>

            <div className="text-xs text-muted-foreground px-3 py-2.5 bg-muted rounded-md">
              Para gerir utilizadores associados, use o painel de Utilizadores.
            </div>
          </div>

          <DrawerFooter className="flex-row justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => { closeEdit(); setPendingDeleteClient(editingClient) }}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Eliminar
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={closeEdit} disabled={saving}>Cancelar</Button>
              <Button size="sm" onClick={handleUpdate} isLoading={saving} disabled={!editName.trim() || !editSlug.trim()}>
                Guardar
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {pendingDeleteClient && (
        <ConfirmModal
          title="Eliminar cliente"
          message={`Tem a certeza que deseja eliminar "${pendingDeleteClient.name}"?`}
          confirmLabel="Eliminar"
          cancelLabel="Cancelar"
          onConfirm={async () => {
            const client = pendingDeleteClient
            setPendingDeleteClient(null)
            await handleDelete(client)
          }}
          onCancel={() => setPendingDeleteClient(null)}
        />
      )}
    </div>
  )
}
