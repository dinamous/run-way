import { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
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
import type { DbClientRow } from '@/types/db'
import type { Member } from '@/hooks/useSupabase'
import { Plus, Trash2, Users, Search, ChevronLeft, ChevronRight, Clock, Building } from 'lucide-react'

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

type ValidationErrors = {
  name?: string
  slug?: string
}

type StatusFilter = 'all' | 'with_pending' | 'no_pending'

const PAGE_SIZE = 12

export function ClientsPanel({
  clients, users, userClientsMap, onCreate, onUpdate, onDelete
}: ClientsPanelProps) {
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createSlug, setCreateSlug] = useState('')
  const [createErrors, setCreateErrors] = useState<ValidationErrors>({})
  const [creating, setCreating] = useState(false)

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingDeleteClient, setPendingDeleteClient] = useState<DbClientRow | null>(null)
  const [editDrawerOpen, setEditDrawerOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<DbClientRow | null>(null)
  const [editName, setEditName] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [editErrors, setEditErrors] = useState<ValidationErrors>({})
  const [saving, setSaving] = useState(false)

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
        const users_list = getClientUsers(c.id)
        return users_list.length > 0 && getPendingUsers(c.id).length === 0
      })
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q)
      )
    }

    return filtered
  }, [clients, searchQuery, statusFilter, getClientUsers, getPendingUsers])

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / PAGE_SIZE))
  const paginatedClients = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredClients.slice(start, start + PAGE_SIZE)
  }, [filteredClients, page])

  const validateFields = (n: string, s: string): ValidationErrors => {
    const errs: ValidationErrors = {}
    if (!n.trim()) errs.name = 'Nome é obrigatório'
    else if (n.trim().length < 2) errs.name = 'Nome deve ter pelo menos 2 caracteres'
    else if (n.trim().length > 100) errs.name = 'Nome deve ter no máximo 100 caracteres'

    if (!s.trim()) errs.slug = 'Slug é obrigatório'
    else if (!/^[a-z0-9-]+$/.test(s.trim())) errs.slug = 'Slug deve conter apenas letras minúsculas, números e hífens'
    else if (s.trim().length < 2) errs.slug = 'Slug deve ter pelo menos 2 caracteres'
    else if (s.trim().length > 50) errs.slug = 'Slug deve ter no máximo 50 caracteres'
    return errs
  }

  const openCreateDrawer = () => {
    setCreateName('')
    setCreateSlug('')
    setCreateErrors({})
    setCreateDrawerOpen(true)
  }

  const closeCreateDrawer = () => {
    setCreateDrawerOpen(false)
    setCreating(false)
  }

  const handleCreate = async () => {
    const errs = validateFields(createName, createSlug)
    setCreateErrors(errs)
    if (Object.keys(errs).length > 0) {
      toast.error('Corrija os erros antes de criar')
      return
    }
    setCreating(true)
    const ok = await onCreate(createName.trim(), createSlug.trim())
    setCreating(false)
    if (ok) {
      toast.success(`Cliente "${createName}" criado`)
      closeCreateDrawer()
    } else {
      toast.error('Erro ao criar cliente')
    }
  }

  const openEditDrawer = (client: DbClientRow) => {
    setEditingClient(client)
    setEditName(client.name)
    setEditSlug(client.slug)
    setEditErrors({})
    setEditDrawerOpen(true)
  }

  const closeEditDrawer = () => {
    setEditDrawerOpen(false)
    setEditingClient(null)
    setEditName('')
    setEditSlug('')
    setEditErrors({})
    setSaving(false)
  }

  const handleUpdate = async () => {
    if (!editingClient) return
    const errs = validateFields(editName, editSlug)
    setEditErrors(errs)
    if (Object.keys(errs).length > 0) {
      toast.error('Corrija os erros antes de guardar')
      return
    }
    setSaving(true)
    const ok = await onUpdate(editingClient.id, editName.trim(), editSlug.trim())
    setSaving(false)
    if (ok) { toast.success('Cliente atualizado'); closeEditDrawer() }
    else toast.error('Erro ao atualizar cliente')
  }

  const handleDelete = async (client: DbClientRow) => {
    setDeletingId(client.id)
    const ok = await onDelete(client.id, client.name)
    setDeletingId(null)
    if (ok) {
      toast.success('Cliente eliminado')
      if (editingClient?.id === client.id) closeEditDrawer()
    } else {
      toast.error('Erro ao eliminar cliente')
    }
  }

  const editNameId = 'edit-client-name'
  const editSlugId = 'edit-client-slug'

  const createNameId = 'create-client-name'
  const createSlugId = 'create-client-slug'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-56 md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou slug..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(1) }}
            className="pl-9"
          />
        </div>
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
            onClick={() => { setStatusFilter('with_pending'); setPage(1) }}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
              statusFilter === 'with_pending'
                ? 'bg-background shadow-sm font-medium'
                : 'hover:bg-background/50 text-muted-foreground'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
            Com pendentes
          </button>
          <button
            onClick={() => { setStatusFilter('no_pending'); setPage(1) }}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
              statusFilter === 'no_pending'
                ? 'bg-background shadow-sm font-medium'
                : 'hover:bg-background/50 text-muted-foreground'
            }`}
          >
            <Building className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
            Todos ativos
          </button>
        </div>
        <Button onClick={openCreateDrawer} aria-label="Criar novo cliente" className="ml-auto">
          <Plus className="w-4 h-4 mr-1" aria-hidden="true" />
          Novo cliente
        </Button>
      </div>

      <div className="text-sm text-muted-foreground">
        Mostrando {filteredClients.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0} - {Math.min(page * PAGE_SIZE, filteredClients.length)} de {filteredClients.length} cliente(s)
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {paginatedClients.map(c => {
          const clientUsers = getClientUsers(c.id)
          const pendingUsers = getPendingUsers(c.id)
          return (
            <Card key={c.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEditDrawer(c)}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{c.name}</CardTitle>
                  {pendingUsers.length > 0 && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                      <Clock className="w-3 h-3" />
                      {pendingUsers.length} pendente{pendingUsers.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <CardDescription className="text-xs">/{c.slug}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" aria-hidden="true" />
                    <span>{clientUsers.length} utilizador{clientUsers.length !== 1 ? 'es' : ''}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    isLoading={deletingId === c.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      setPendingDeleteClient(c)
                    }}
                    aria-label={`Eliminar cliente ${c.name}`}
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-500" aria-hidden="true" />
                  </Button>
                </div>
                {clientUsers.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {clientUsers.slice(0, 3).map(u => (
                      <span key={u.id} className={`px-2 py-0.5 text-xs rounded-full ${
                        !u.auth_user_id
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {u.name}
                      </span>
                    ))}
                    {clientUsers.length > 3 && (
                      <span className="px-2 py-0.5 text-muted-foreground text-xs">+{clientUsers.length - 3}</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {totalPages > 1 && (
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
            <DrawerTitle>Criar Cliente</DrawerTitle>
            <DrawerDescription>
              Crie um novo cliente para organizar demandas.
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-6 pb-6 space-y-6 overflow-y-auto max-h-[calc(100vh-200px)]">
            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor={createNameId}>Nome</Label>
                <Input
                  id={createNameId}
                  value={createName}
                  onChange={e => { setCreateName(e.target.value); if (createErrors.name) setCreateErrors(prev => ({ ...prev, name: undefined })) }}
                  placeholder="Nome do cliente"
                  aria-invalid={!!createErrors.name}
                  aria-describedby={createErrors.name ? `${createNameId}-error` : undefined}
                />
                {createErrors.name && (
                  <p id={`${createNameId}-error`} role="alert" className="text-xs text-red-500 mt-1">
                    {createErrors.name}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor={createSlugId}>URL</Label>
                <Input
                  id={createSlugId}
                  value={createSlug}
                  onChange={e => { setCreateSlug(e.target.value); if (createErrors.slug) setCreateErrors(prev => ({ ...prev, slug: undefined })) }}
                  placeholder="empresa-x"
                  aria-invalid={!!createErrors.slug}
                  aria-describedby={createErrors.slug ? `${createSlugId}-error` : undefined}
                />
                {createErrors.slug && (
                  <p id={`${createSlugId}-error`} role="alert" className="text-xs text-red-500 mt-1">
                    {createErrors.slug}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Identificador único usado na URL do sistema. Use letras minúsculas, números e hífens (ex: minha-empresa).
                </p>
              </div>
            </div>
          </div>

          <DrawerFooter className="flex-row justify-end gap-2">
            <Button variant="outline" onClick={closeCreateDrawer} disabled={creating}>Cancelar</Button>
            <Button
              onClick={handleCreate}
              isLoading={creating}
              disabled={!createName.trim() || !createSlug.trim()}
            >
              Criar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Drawer direction="right" open={editDrawerOpen} onOpenChange={setEditDrawerOpen}>
        <DrawerContent data-vaul-drawer-direction="right">
          <DrawerHeader>
            <DrawerTitle>Editar Cliente</DrawerTitle>
            <DrawerDescription>
              Atualize o nome e slug do cliente.
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-6 pb-6 space-y-6 overflow-y-auto max-h-[calc(100vh-200px)]">
            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor={editNameId}>Nome</Label>
                <Input
                  id={editNameId}
                  value={editName}
                  onChange={e => { setEditName(e.target.value); if (editErrors.name) setEditErrors(prev => ({ ...prev, name: undefined })) }}
                  placeholder="Nome do cliente"
                  aria-invalid={!!editErrors.name}
                  aria-describedby={editErrors.name ? `${editNameId}-error` : undefined}
                />
                {editErrors.name && (
                  <p id={`${editNameId}-error`} role="alert" className="text-xs text-red-500 mt-1">
                    {editErrors.name}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor={editSlugId}>URL</Label>
                <Input
                  id={editSlugId}
                  value={editSlug}
                  onChange={e => { setEditSlug(e.target.value); if (editErrors.slug) setEditErrors(prev => ({ ...prev, slug: undefined })) }}
                  placeholder="empresa-x"
                  aria-invalid={!!editErrors.slug}
                  aria-describedby={editErrors.slug ? `${editSlugId}-error` : undefined}
                />
                {editErrors.slug && (
                  <p id={`${editSlugId}-error`} role="alert" className="text-xs text-red-500 mt-1">
                    {editErrors.slug}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Identificador único usado na URL. Use letras minúsculas, números e hífens.
                </p>
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
              Para gerir utilizadores associados a este cliente, utilize o painel de Utilizadores.
            </div>
          </div>

          <DrawerFooter className="flex-row justify-end gap-2">
            <Button variant="outline" onClick={closeEditDrawer} disabled={saving}>Cancelar</Button>
            <Button onClick={handleUpdate} isLoading={saving} disabled={!editName.trim() || !editSlug.trim()}>
              Guardar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {pendingDeleteClient && (
        <ConfirmModal
          title="Eliminar cliente"
          message={`Tem a certeza que deseja eliminar o cliente "${pendingDeleteClient.name}"?`}
          confirmLabel="Eliminar cliente"
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
