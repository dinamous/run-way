import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { toast } from 'sonner'
import type { Member } from '@/hooks/useSupabase'
import type { DbClientRow } from '@/types/db'
import { MoreHorizontal, Plus, Trash2 } from 'lucide-react'

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
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [selectedClient, setSelectedClient] = useState<string>('')

  const handleLink = async () => {
    if (!selectedUser || !selectedClient) return
    const ok = await onLink(selectedUser, selectedClient)
    if (ok) {
      toast.success('Usuário vinculado ao cliente')
      setSelectedClient('')
    } else {
      toast.error('Erro ao vincular')
    }
  }

  const userClients = (userId: string) => {
    const clientIds = userClientsMap[userId] ?? []
    return clients.filter(c => clientIds.includes(c.id))
  }

  const availableClients = (userId: string) => {
    const clientIds = userClientsMap[userId] ?? []
    return clients.filter(c => !clientIds.includes(c.id))
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Vincular usuário a cliente</h2>

      <div className="flex gap-2 flex-wrap items-end">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Usuário</span>
          <select
            className="border rounded px-2 py-1.5 text-sm bg-background min-w-[180px]"
            value={selectedUser}
            onChange={e => setSelectedUser(e.target.value)}
          >
            <option value="">Selecionar...</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Cliente</span>
          <select
            className="border rounded px-2 py-1.5 text-sm bg-background min-w-[180px]"
            value={selectedClient}
            onChange={e => setSelectedClient(e.target.value)}
            disabled={!selectedUser}
          >
            <option value="">Selecionar...</option>
            {selectedUser && availableClients(selectedUser).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <Button onClick={handleLink} disabled={!selectedUser || !selectedClient}>
          <Plus className="w-4 h-4 mr-1" />
          Vincular
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="py-3 px-4 font-medium">Usuário</th>
              <th className="py-3 px-4 font-medium">Cargo</th>
              <th className="py-3 px-4 font-medium">Role</th>
              <th className="py-3 px-4 font-medium">Clientes</th>
              <th className="py-3 px-4 font-medium w-10"></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const ucs = userClients(u.id)
              return (
                <tr key={u.id} className="border-t hover:bg-muted/30">
                  <td className="py-3 px-4 font-medium">{u.name}</td>
                  <td className="py-3 px-4 text-muted-foreground">{u.role}</td>
                  <td className="py-3 px-4">
                    <select
                      className="border rounded px-2 py-1 text-xs bg-background"
                      value={u.access_role ?? 'user'}
                      onChange={async e => {
                        const ok = await onSetRole(u.id, e.target.value as 'admin' | 'user')
                        if (ok) toast.success('Role atualizada')
                        else toast.error('Erro ao alterar role')
                      }}
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {ucs.length === 0 ? (
                        <span className="text-muted-foreground text-xs">Nenhum</span>
                      ) : (
                        ucs.map(c => (
                          <span
                            key={c.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded-full"
                          >
                            {c.name}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Gerir clientes</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {availableClients(u.id).length > 0 ? (
                          <>
                            <DropdownMenuItem className="text-xs text-muted-foreground pointer-events-none">
                              Adicionar cliente:
                            </DropdownMenuItem>
                            {availableClients(u.id).map(c => (
                              <DropdownMenuItem
                                key={c.id}
                                onClick={async () => {
                                  const ok = await onLink(u.id, c.id)
                                  if (ok) toast.success(`${c.name} adicionado`)
                                  else toast.error('Erro ao adicionar')
                                }}
                              >
                                <Plus className="w-3 h-3 mr-2" />
                                {c.name}
                              </DropdownMenuItem>
                            ))}
                          </>
                        ) : (
                          <DropdownMenuItem className="text-xs text-muted-foreground pointer-events-none">
                            Sem clientes disponíveis
                          </DropdownMenuItem>
                        )}
                        {ucs.length > 0 && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-xs text-muted-foreground pointer-events-none">
                              Remover cliente:
                            </DropdownMenuItem>
                            {ucs.map(c => (
                              <DropdownMenuItem
                                key={c.id}
                                className="text-red-600"
                                onClick={async () => {
                                  if (!confirm(`Remover ${u.name} de ${c.name}?`)) return
                                  const ok = await onUnlink(u.id, c.id)
                                  if (ok) toast.success(`${c.name} removido`)
                                  else toast.error('Erro ao remover')
                                }}
                              >
                                <Trash2 className="w-3 h-3 mr-2" />
                                {c.name}
                              </DropdownMenuItem>
                            ))}
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
