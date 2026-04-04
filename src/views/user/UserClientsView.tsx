import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { toast } from 'sonner'
import type { ClientOption } from '@/contexts/AuthContext'

interface UserClientsViewProps {
  userClients: ClientOption[]
  availableClients: ClientOption[]
  onLink: (clientId: string) => Promise<boolean>
  onUnlink: (clientId: string) => Promise<boolean>
}

export function UserClientsView({
  userClients,
  availableClients,
  onLink,
  onUnlink,
}: UserClientsViewProps) {
  const [selectedClient, setSelectedClient] = useState('')

  const unlinkedClients = availableClients.filter(
    c => !userClients.some(uc => uc.id === c.id)
  )

  const handleLink = async () => {
    if (!selectedClient) return
    const ok = await onLink(selectedClient)
    if (ok) {
      toast.success('Cliente adicionado')
      setSelectedClient('')
    } else {
      toast.error('Erro ao adicionar cliente')
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Os Meus Clientes</h1>

      <div className="flex gap-2 flex-wrap items-end">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Adicionar cliente</span>
          <select
            className="border rounded px-2 py-1.5 text-sm bg-background min-w-[200px]"
            value={selectedClient}
            onChange={e => setSelectedClient(e.target.value)}
          >
            <option value="">Selecionar cliente...</option>
            {unlinkedClients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <Button onClick={handleLink} disabled={!selectedClient}>
          Adicionar
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {userClients.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum cliente associado.</p>
        ) : (
          userClients.map(c => (
            <Badge
              key={c.id}
              className="cursor-pointer px-3 py-1.5 text-sm"
              onClick={async () => {
                if (!confirm(`Remover acesso a "${c.name}"?`)) return
                const ok = await onUnlink(c.id)
                if (!ok) toast.error('Erro ao remover cliente')
              }}
            >
              {c.name} ✕
            </Badge>
          ))
        )}
      </div>
    </div>
  )
}
