import { useOverviewData } from './hooks/useOverviewData'
import { WelcomeCard } from './components/WelcomeCard'
import { PriorityList } from './components/PriorityList'
import { ActiveClients } from './components/ActiveClients'
import { InboxCard } from './components/InboxCard'
import { FocoDoDia } from './components/FocoDoDia'
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

  const hasFocus =
    !data.loading &&
    data.subtasks.some(
      (s) => !s.taskConcludedAt && s.end <= new Date().toISOString().slice(0, 10)
    )

  return (
    <div className="overview-root relative min-h-full">
      <div className="overview-ambient" aria-hidden="true" />

      <div className="relative z-10 p-4 md:p-6 lg:p-8 max-w-screen-xl mx-auto flex flex-col gap-8">

        

        {/* Seu dia — welcome + clients */}
        <section className="flex flex-col gap-2">
          <span className="overview-section-label">Seu dia</span>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
            <WelcomeCard
              userName={userName}
              kpis={data.kpis}
              accumulatedDelayDays={data.accumulatedDelayDays}
              loading={data.loading}
            />
            <ActiveClients
              clients={data.clients}
              loading={data.loading}
              onSelectClient={onSelectClient}
            />
          </div>
        </section>

        {/* Foco do dia — full width, shown only when there are critical/today items */}
        {hasFocus && (
          <section className="flex flex-col gap-2">
            <FocoDoDia subtasks={data.subtasks} loading={data.loading} />
          </section>
        )}

        {/* Atenção agora — subtasks + inbox */}
        <section className="flex flex-col gap-2">
          <span className="overview-section-label">Atenção agora</span>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
            <PriorityList subtasks={data.subtasks} loading={data.loading} />
            <InboxCard
              notifications={notifications}
              loading={notificationsLoading}
              onMarkAsRead={onMarkNotificationAsRead}
            />
          </div>
        </section>

      </div>
    </div>
  )
}
