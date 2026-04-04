import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import type { Member } from '@/hooks/useSupabase'
import type { DbClientRow } from '@/types/db'

interface UsersPanelProps {
  users: Member[]
  clients: DbClientRow[]
  onSetRole: (userId: string, role: 'admin' | 'user') => Promise<boolean>
  onLink: (userId: string, clientId: string) => Promise<boolean>
  onUnlink: (userId: string, clientId: string) => Promise<boolean>
  userClientsMap: Record<string, string[]>  // userId → clientIds[]
}

export function UsersPanel({
  users, clients, onSetRole, onLink, onUnlink, userClientsMap
}: UsersPanelProps) {
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [selectedClient, setSelectedClient] = useState<string>('')

  const handleLink = async () => {
    if (!selectedUser || !selectedClient) return
    const ok = await onLink(selectedUser, selectedClient)
    if (ok) toast.success('Usuário vinculado ao cliente')
    else toast.error('Erro ao vincular')
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Usuários</h2>

      {/* Vinculação */}
      <div className="flex gap-2 flex-wrap items-center">
        <select
          className="border rounded px-2 py-1 text-sm bg-background"
          value={selectedUser ?? ''}
          onChange={e => setSelectedUser(e.target.value || null)}
        >
          <option value="">Selecionar usuário</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <select
          className="border rounded px-2 py-1 text-sm bg-background"
          value={selectedClient}
          onChange={e => setSelectedClient(e.target.value)}
        >
          <option value="">Selecionar cliente</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <Button size="sm" onClick={handleLink}>Vincular</Button>
      </div>

      {/* Tabela de usuários */}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-4">Nome</th>
            <th className="py-2 pr-4">Cargo</th>
            <th className="py-2 pr-4">Role</th>
            <th className="py-2">Clientes</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} className="border-b hover:bg-muted/30">
              <td className="py-2 pr-4 font-medium">{u.name}</td>
              <td className="py-2 pr-4 text-muted-foreground">{u.role}</td>
              <td className="py-2 pr-4">
                <select
                  className="border rounded px-1 py-0.5 text-xs bg-background"
                  value={u.access_role ?? 'user'}
                  onChange={async e => {
                    const ok = await onSetRole(u.id, e.target.value as 'admin' | 'user')
                    if (!ok) toast.error('Erro ao alterar role')
                  }}
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </td>
              <td className="py-2 flex flex-wrap gap-1">
                {(userClientsMap[u.id] ?? []).map(cid => {
                  const client = clients.find(c => c.id === cid)
                  return client ? (
                    <Badge
                      key={cid}
                      className="cursor-pointer"
                      onClick={async () => {
                        if (!confirm(`Desvincular ${u.name} de ${client.name}?`)) return
                        const ok = await onUnlink(u.id, cid)
                        if (!ok) toast.error('Erro ao desvincular')
                      }}
                    >
                      {client.name} ✕
                    </Badge>
                  ) : null
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
