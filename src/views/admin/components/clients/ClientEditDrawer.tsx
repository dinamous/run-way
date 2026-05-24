import { useState, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import {
  Drawer, DrawerContent, DrawerHeader, DrawerFooter, DrawerTitle, DrawerDescription,
} from '@/components/ui/Drawer'
import { toast } from 'sonner'
import { Trash2, CalendarDays, UserCheck, UserX, UserMinus, Clock } from 'lucide-react'
import type { DbClientRow } from '@/types/db'
import type { Member } from '@/hooks/infra/useSupabase'
import { validateFields } from './clientUtils'
import type { ValidationErrors } from './clientUtils'

interface ClientEditDrawerProps {
  open: boolean
  client: DbClientRow | null
  clientUsers: Member[]
  onClose: () => void
  onUpdate: (id: string, name: string, slug: string) => Promise<boolean>
  onDeleteRequest: (client: DbClientRow) => void
}

function UserRow({ user }: { user: Member }) {
  const isInactive = user.is_active === false
  const isActive = !!user.auth_user_id && !isInactive
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 bg-background">
      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0 overflow-hidden">
        {user.avatar_url
          ? <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
          : <span>{user.avatar}</span>
        }
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium truncate">{user.name}</div>
        <div className="text-xs text-muted-foreground truncate">{user.role}</div>
      </div>
      <div className="shrink-0">
        {isInactive
          ? <span className="text-xs text-muted-foreground">Inativo</span>
          : isActive
            ? <span className="h-2 w-2 rounded-full bg-emerald-500 block" />
            : <span className="h-2 w-2 rounded-full bg-orange-400 block" />
        }
      </div>
    </div>
  )
}

export function ClientEditDrawer({
  open, client, clientUsers, onClose, onUpdate, onDeleteRequest,
}: ClientEditDrawerProps) {
  const clientRef = useRef<DbClientRow | null>(null)
  clientRef.current = client

  const [editName, setEditName] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [saving, setSaving] = useState(false)

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) onClose()
    else {
      setEditName(client?.name ?? '')
      setEditSlug(client?.slug ?? '')
      setErrors({})
    }
  }

  const handleUpdate = async () => {
    const c = clientRef.current
    if (!c) return
    const errs = validateFields(editName, editSlug)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setSaving(true)
    const ok = await onUpdate(c.id, editName.trim(), editSlug.trim())
    setSaving(false)
    if (ok) { toast.success('Cliente atualizado'); onClose() }
    else toast.error('Erro ao atualizar')
  }

  const active = clientUsers.filter(u => u.auth_user_id && u.is_active !== false)
  const pending = clientUsers.filter(u => !u.auth_user_id && u.is_active !== false)
  const inactive = clientUsers.filter(u => u.is_active === false)
  const createdAt = client?.created_at
    ? new Date(client.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    : null

  return (
    <Drawer direction="right" open={open} onOpenChange={handleOpenChange}>
      <DrawerContent data-vaul-drawer-direction="right">
        <DrawerHeader>
          <DrawerTitle>{client?.name}</DrawerTitle>
          <DrawerDescription className="font-mono text-xs">/{client?.slug}</DrawerDescription>
        </DrawerHeader>

        <div className="px-6 pb-6 space-y-5 overflow-y-auto max-h-[calc(100vh-200px)]">
          {client && (
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

              {clientUsers.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Usuários vinculados</p>
                  <div className="divide-y divide-border rounded-md border border-border overflow-hidden">
                    {clientUsers.map(u => <UserRow key={u.id} user={u} />)}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <UserX className="w-3.5 h-3.5" />
                  <span>Nenhum usuário vinculado</span>
                </div>
              )}
              <div className="border-t border-border/60 pt-1" />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="edit-name" className="text-xs">Nome</Label>
            <Input
              id="edit-name"
              value={editName}
              onChange={e => { setEditName(e.target.value); if (errors.name) setErrors(p => ({ ...p, name: undefined })) }}
              placeholder="Nome do cliente"
              aria-invalid={!!errors.name}
              className="h-8 text-sm"
            />
            {errors.name && <p role="alert" className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-slug" className="text-xs">Slug</Label>
            <Input
              id="edit-slug"
              value={editSlug}
              onChange={e => { setEditSlug(e.target.value); if (errors.slug) setErrors(p => ({ ...p, slug: undefined })) }}
              placeholder="empresa-x"
              aria-invalid={!!errors.slug}
              className="h-8 text-sm font-mono"
            />
            {errors.slug ? (
              <p role="alert" className="text-xs text-destructive">{errors.slug}</p>
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
            onClick={() => { onClose(); if (client) onDeleteRequest(client) }}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Eliminar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button size="sm" onClick={handleUpdate} isLoading={saving} disabled={!editName.trim() || !editSlug.trim()}>
              Guardar
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
