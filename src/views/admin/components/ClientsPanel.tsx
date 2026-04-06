import { useState } from 'react'
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
import type { DbClientRow } from '@/types/db'
import type { Member } from '@/hooks/useSupabase'
import { Plus, Trash2, Users } from 'lucide-react'

interface ClientsPanelProps {
  clients: DbClientRow[]
  users: Member[]
  userClientsMap: Record<string, string[]>
  onCreate: (name: string, slug: string) => Promise<boolean>
  onUpdate: (id: string, name: string, slug: string) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
  onLinkUser?: (clientId: string, userId: string) => Promise<boolean>
  onUnlinkUser?: (clientId: string, userId: string) => Promise<boolean>
}

type ValidationErrors = {
  name?: string
  slug?: string
}

export function ClientsPanel({
  clients, users, userClientsMap, onCreate, onUpdate, onDelete
}: ClientsPanelProps) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<DbClientRow | null>(null)
  const [editName, setEditName] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [editErrors, setEditErrors] = useState<ValidationErrors>({})
  const [saving, setSaving] = useState(false)

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

  const handleCreate = async () => {
    const errs = validateFields(name, slug)
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      toast.error('Corrija os erros antes de criar')
      return
    }
    setCreating(true)
    const ok = await onCreate(name.trim(), slug.trim())
    setCreating(false)
    if (ok) { toast.success(`Cliente "${name}" criado`); setName(''); setSlug(''); setErrors({}) }
    else toast.error('Erro ao criar cliente')
  }

  const openEditDrawer = (client: DbClientRow) => {
    setEditingClient(client)
    setEditName(client.name)
    setEditSlug(client.slug)
    setEditErrors({})
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
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
    if (ok) { toast.success('Cliente atualizado'); closeDrawer() }
    else toast.error('Erro ao atualizar cliente')
  }

  const handleDelete = async (client: DbClientRow) => {
    if (!confirm(`Eliminar cliente "${client.name}"?`)) return
    setDeletingId(client.id)
    const ok = await onDelete(client.id)
    setDeletingId(null)
    if (ok) {
      toast.success('Cliente eliminado')
      if (editingClient?.id === client.id) closeDrawer()
    } else {
      toast.error('Erro ao eliminar cliente')
    }
  }

  const getClientUsers = (clientId: string) => {
    const userIds = Object.entries(userClientsMap)
      .filter(([, clientIds]) => clientIds.includes(clientId))
      .map(([userId]) => userId)
    return users.filter(u => userIds.includes(u.id))
  }

  const nameId = 'client-name-input'
  const slugId = 'client-slug-input'
  const editNameId = 'edit-client-name'
  const editSlugId = 'edit-client-slug'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Clientes</h2>
        <div className="flex gap-2 items-start">
          <div className="space-y-1">
            <Input
              id={nameId}
              placeholder="Nome do cliente"
              value={name}
              onChange={e => { setName(e.target.value); if (errors.name) setErrors(prev => ({ ...prev, name: undefined })) }}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? `${nameId}-error` : undefined}
              className="w-48"
            />
            {errors.name && (
              <p id={`${nameId}-error`} role="alert" className="text-xs text-red-500 mt-1">
                {errors.name}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Input
              id={slugId}
              placeholder="Slug"
              value={slug}
              onChange={e => { setSlug(e.target.value); if (errors.slug) setErrors(prev => ({ ...prev, slug: undefined })) }}
              aria-invalid={!!errors.slug}
              aria-describedby={errors.slug ? `${slugId}-error` : undefined}
              className="w-32"
            />
            {errors.slug && (
              <p id={`${slugId}-error`} role="alert" className="text-xs text-red-500 mt-1">
                {errors.slug}
              </p>
            )}
          </div>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || !slug.trim()}
            isLoading={creating}
            aria-label="Criar novo cliente"
          >
            <Plus className="w-4 h-4 mr-1" aria-hidden="true" />
            Criar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {clients.map(c => {
          const clientUsers = getClientUsers(c.id)
          return (
            <Card key={c.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEditDrawer(c)}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{c.name}</CardTitle>
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
                      handleDelete(c)
                    }}
                    aria-label={`Eliminar cliente ${c.name}`}
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-500" aria-hidden="true" />
                  </Button>
                </div>
                {clientUsers.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {clientUsers.slice(0, 3).map(u => (
                      <span key={u.id} className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full">
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

      <Drawer direction="right" open={drawerOpen} onOpenChange={setDrawerOpen}>
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
                <Label htmlFor={editSlugId}>Slug</Label>
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
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
              Para gerir utilizadores associados a este cliente, utilize o painel de Utilizadores.
            </div>
          </div>

          <DrawerFooter className="flex-row justify-end gap-2">
            <Button variant="outline" onClick={closeDrawer} disabled={saving}>Cancelar</Button>
            <Button onClick={handleUpdate} isLoading={saving} disabled={!editName.trim() || !editSlug.trim()}>
              Guardar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
