import { useState } from 'react'
import { Button } from '@/components/ui/Button'
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
import type { Member } from '@/hooks/useSupabase'
import type { DbClientRow } from '@/types/db'
import { Plus, Building, X, Check } from 'lucide-react'

interface UsersPanelProps {
  users: Member[]
  clients: DbClientRow[]
  onSetRole: (userId: string, role: 'admin' | 'user') => Promise<boolean>
  onLink: (userId: string, clientId: string) => Promise<boolean>
  onUnlink: (userId: string, clientId: string) => Promise<boolean>
  userClientsMap: Record<string, string[]>
}

export function UsersPanel({
  users, clients, onSetRole, onLink, onUnlink, userClientsMap
}: UsersPanelProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<Member | null>(null)
  const [editRole, setEditRole] = useState<'admin' | 'user'>('user')
  const [savingRole, setSavingRole] = useState(false)
  const [linkingId, setLinkingId] = useState<string | null>(null)
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null)

  const openEditDrawer = (user: Member) => {
    setEditingUser(user)
    setEditRole(user.access_role ?? 'user')
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    setEditingUser(null)
    setEditRole('user')
    setSavingRole(false)
    setLinkingId(null)
    setUnlinkingId(null)
  }

  const handleUpdateRole = async () => {
    if (!editingUser) return
    setSavingRole(true)
    const ok = await onSetRole(editingUser.id, editRole)
    setSavingRole(false)
    if (ok) { toast.success('Role atualizada'); closeDrawer() }
    else toast.error('Erro ao alterar role')
  }

  const handleLink = async (userId: string, clientId: string, clientName: string) => {
    setLinkingId(clientId)
    const ok = await onLink(userId, clientId)
    setLinkingId(null)
    if (ok) toast.success(`${clientName} adicionado`)
    else toast.error('Erro ao adicionar')
  }

  const handleUnlink = async (userId: string, clientId: string, clientName: string) => {
    setUnlinkingId(clientId)
    const ok = await onUnlink(userId, clientId)
    setUnlinkingId(null)
    if (ok) toast.success(`${clientName} removido`)
    else toast.error('Erro ao remover')
  }

  const getUserClients = (userId: string) => {
    const clientIds = userClientsMap[userId] ?? []
    return clients.filter(c => clientIds.includes(c.id))
  }

  const getAvailableClients = (userId: string) => {
    const clientIds = userClientsMap[userId] ?? []
    return clients.filter(c => !clientIds.includes(c.id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Utilizadores</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {users.map(u => {
          const ucs = getUserClients(u.id)
          return (
            <Card key={u.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEditDrawer(u)}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <CardTitle className="text-base">{u.name}</CardTitle>
                    <CardDescription className="text-xs">{u.role}</CardDescription>
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
                <div className="mt-3 pt-3 border-t">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      u.access_role === 'admin'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                        : 'bg-muted'
                    }`}
                  >
                    {u.access_role === 'admin' ? 'Administrador' : 'Utilizador'}
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Drawer direction="right" open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent data-vaul-drawer-direction="right">
          <DrawerHeader>
            <DrawerTitle>Editar Utilizador</DrawerTitle>
            <DrawerDescription>
              Altere a role e associe clientes a este utilizador.
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-6 pb-6 space-y-6 overflow-y-auto max-h-[calc(100vh-200px)]">
            <div className="space-y-3" role="group" aria-labelledby="role-group-label">
              <Label id="role-group-label" className="text-base font-medium">Role</Label>
              <div className="flex gap-2">
                <Button
                  variant={editRole === 'user' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEditRole('user')}
                  className="flex-1"
                  aria-pressed={editRole === 'user'}
                  aria-label="Definir como Utilizador"
                >
                  <Check
                    className={`w-4 h-4 mr-1 ${editRole === 'user' ? 'opacity-100' : 'opacity-0'}`}
                    aria-hidden="true"
                  />
                  Utilizador
                </Button>
                <Button
                  variant={editRole === 'admin' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEditRole('admin')}
                  className="flex-1"
                  aria-pressed={editRole === 'admin'}
                  aria-label="Definir como Administrador"
                >
                  <Check
                    className={`w-4 h-4 mr-1 ${editRole === 'admin' ? 'opacity-100' : 'opacity-0'}`}
                    aria-hidden="true"
                  />
                  Administrador
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">Clientes associados</Label>
              {editingUser && (
                <>
                  {getUserClients(editingUser.id).length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                      Nenhum cliente associado
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {getUserClients(editingUser.id).map(c => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Building className="w-4 h-4" aria-hidden="true" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{c.name}</p>
                              <p className="text-xs text-muted-foreground">/{c.slug}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            isLoading={unlinkingId === c.id}
                            disabled={unlinkingId !== null}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleUnlink(editingUser.id, c.id, c.name)
                            }}
                            aria-label={`Remover ${c.name} deste utilizador`}
                          >
                            <X className="w-4 h-4 text-muted-foreground hover:text-red-500" aria-hidden="true" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {getAvailableClients(editingUser.id).length > 0 && (
                    <div className="pt-4 border-t">
                      <Label className="text-sm text-muted-foreground mb-2 block">Adicionar clientes</Label>
                      <div className="space-y-2">
                        {getAvailableClients(editingUser.id).map(c => (
                          <div
                            key={c.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <Building className="w-4 h-4" aria-hidden="true" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{c.name}</p>
                                <p className="text-xs text-muted-foreground">/{c.slug}</p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              isLoading={linkingId === c.id}
                              disabled={linkingId !== null}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleLink(editingUser.id, c.id, c.name)
                              }}
                              aria-label={`Adicionar ${c.name} a este utilizador`}
                            >
                              <Plus className="w-4 h-4 mr-1" aria-hidden="true" />
                              Adicionar
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <DrawerFooter>
            <Button variant="outline" onClick={closeDrawer} disabled={savingRole}>Cancelar</Button>
            <Button onClick={handleUpdateRole} isLoading={savingRole}>Guardar</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
