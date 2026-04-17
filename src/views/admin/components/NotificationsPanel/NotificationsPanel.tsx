import type { Member } from '@/hooks/useSupabase'
import type { Client } from '@/types/db'
import { useNotificationsPanel } from './useNotificationsPanel'
import { NotificationForm } from './NotificationForm'
import { NotificationHistory } from './NotificationHistory'

interface NotificationsPanelProps {
  clients: Client[]
  users: Member[]
}

export function NotificationsPanel({ clients, users }: NotificationsPanelProps) {
  const panel = useNotificationsPanel(clients)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(90vh-13rem)]">
      <NotificationForm {...panel} clients={clients} users={users} />
      <NotificationHistory
        history={panel.history}
        loadingHistory={panel.loadingHistory}
        error={panel.error}
        grouped={panel.grouped}
        loadHistory={panel.loadHistory}
        handleMarkAsRead={panel.handleMarkAsRead}
        handleToggleRead={panel.handleToggleRead}
      />
    </div>
  )
}
