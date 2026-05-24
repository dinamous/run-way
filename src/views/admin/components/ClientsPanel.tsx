import { useState, useMemo, useCallback } from 'react'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { toast } from 'sonner'
import type { DbClientRow } from '@/types/db'
import type { Member } from '@/hooks/infra/useSupabase'
import { ClientsToolbar } from './clients/ClientsToolbar'
import { ClientCreateForm } from './clients/ClientCreateForm'
import { ClientList } from './clients/ClientList'
import { ClientEditDrawer } from './clients/ClientEditDrawer'
import { PAGE_SIZE } from './clients/clientUtils'
import type { StatusFilter } from './clients/clientUtils'

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

export function ClientsPanel({
  clients, users, userClientsMap, onCreate, onUpdate, onDelete,
}: ClientsPanelProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [editDrawerOpen, setEditDrawerOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<DbClientRow | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingDeleteClient, setPendingDeleteClient] = useState<DbClientRow | null>(null)
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

  const openEdit = (client: DbClientRow) => {
    setEditingClient(client)
    setEditDrawerOpen(true)
  }

  const handleDelete = async (client: DbClientRow) => {
    setDeletingId(client.id)
    const ok = await onDelete(client.id, client.name)
    setDeletingId(null)
    if (ok) {
      toast.success('Cliente eliminado')
      if (editingClient?.id === client.id) setEditDrawerOpen(false)
    } else {
      toast.error('Erro ao eliminar cliente')
    }
  }

  return (
    <div className="space-y-0">
      <ClientsToolbar
        searchQuery={searchQuery}
        onSearchChange={val => { setSearchQuery(val); setPage(1) }}
        statusFilter={statusFilter}
        onStatusChange={f => { setStatusFilter(f); setPage(1) }}
        totalCount={filteredClients.length}
        onNew={() => setCreateOpen(true)}
      />

      <ClientCreateForm
        open={createOpen}
        onCreate={onCreate}
        onClose={() => setCreateOpen(false)}
      />

      <ClientList
        clients={filteredClients}
        page={page}
        totalPages={totalPages}
        deletingId={deletingId}
        getClientUsers={getClientUsers}
        getPendingUsers={getPendingUsers}
        onPageChange={setPage}
        onEdit={openEdit}
        onDeleteRequest={setPendingDeleteClient}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
      />

      <ClientEditDrawer
        open={editDrawerOpen}
        client={editingClient}
        clientUsers={editingClient ? getClientUsers(editingClient.id) : []}
        onClose={() => { setEditDrawerOpen(false); setEditingClient(null) }}
        onUpdate={onUpdate}
        onDeleteRequest={c => { setEditDrawerOpen(false); setPendingDeleteClient(c) }}
      />

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
