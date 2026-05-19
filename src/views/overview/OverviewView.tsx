 import { useOverviewData } from './hooks/useOverviewData'
import { WelcomeCard } from './components/WelcomeCard'
import { PriorityList } from './components/PriorityList'
import { ActiveClients } from './components/ActiveClients'
import { InboxCard } from './components/InboxCard'
import type { Notification } from '@/types/notification'
import type { ClientOption } from '@/contexts/AuthContext'

export interface OverviewViewProps {
  userName: string
  userId: string
  memberId: string
  isAdmin: boolean
  clients: ClientOption[]
  notifications: Notification[]
  notificationsLoading: boolean
  onMarkNotificationAsRead: (id: string) => void
  onSelectClient: (clientId: string) => void
}

export function OverviewView({
  userName,
  userId,
  memberId,
  isAdmin,
  clients,
  notifications,
  notificationsLoading,
  onMarkNotificationAsRead,
  onSelectClient,
}: OverviewViewProps) {
  const data = useOverviewData({ memberId, userId, isAdmin, clients })

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-screen-xl mx-auto">
      {/* Row 1: Welcome (wide) + Inbox (sidebar, spans 2 rows) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px] lg:gap-5">
        <WelcomeCard userName={userName} kpis={data.kpis} loading={data.loading} />

        {/* Inbox spans rows 1 and 2 on desktop */}
        <div className="lg:row-span-2">
          <InboxCard
            notifications={notifications}
            loading={notificationsLoading}
            onMarkAsRead={onMarkNotificationAsRead}
          />
        </div>

        {/* Row 2: PriorityList + ActiveClients side by side */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_220px] lg:gap-5">
          <PriorityList subtasks={data.subtasks} loading={data.loading} />
          <ActiveClients
            clients={data.clients}
            loading={data.loading}
            onSelectClient={onSelectClient}
          />
        </div>
      </div>
    </div>
  )
}
