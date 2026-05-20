import { useOverviewData } from './hooks/useOverviewData'
import { WelcomeCard } from './components/WelcomeCard'
import { PriorityList } from './components/PriorityList'
import { ActiveClients } from './components/ActiveClients'
import { InboxCard } from './components/InboxCard'
import { FocoDoDia } from './components/FocoDoDia'
import { DayPlannerCard } from './components/DayPlannerCard'
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
  onNavigateToPlanning?: () => void
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
  onNavigateToPlanning,
}: OverviewViewProps) {
  const data = useOverviewData({ memberId, userId, isAdmin, clients })

  const hasFocus =
    !data.loading &&
    data.subtasks.some(
      (s) => !s.taskConcludedAt && s.end <= new Date().toISOString().slice(0, 10)
    )

  return (
    <div className="bg-[oklch(0.955_0.004_250)] dark:bg-[oklch(0.13_0.008_250)] relative min-h-full">
      <div className="overview-ambient absolute inset-0 pointer-events-none" aria-hidden="true" />

      <div className="relative z-10 p-4 md:p-6 lg:p-8 max-w-screen-xl mx-auto flex flex-col gap-8">

        {/* Seu dia — welcome + clients */}
        <section className="flex flex-col gap-2">
          <span className="block text-[0.6875rem] font-semibold tracking-[0.07em] uppercase text-[oklch(0.52_0.006_250)] dark:text-[oklch(0.50_0.008_250)] pl-0.5">Seu dia</span>
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

        {/* Foco + Plano do dia — 7/5 cols */}
        {hasFocus && (
          <section className="flex flex-col gap-2">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch">
              <div className="lg:col-span-7 lg:flex lg:flex-col">
                <FocoDoDia subtasks={data.subtasks} loading={data.loading} />
              </div>
              <div className="lg:col-span-5 lg:flex lg:flex-col">
                <DayPlannerCard
                  subtasks={data.subtasks}
                  blockedTasks={data.blockedTasks}
                  loading={data.loading}
                  onNavigateToPlanning={onNavigateToPlanning}
                />
              </div>
            </div>
          </section>
        )}

        {/* Atenção agora — subtasks + inbox */}
        <section className="flex flex-col gap-2">
          <span className="block text-[0.6875rem] font-semibold tracking-[0.07em] uppercase text-[oklch(0.52_0.006_250)] dark:text-[oklch(0.50_0.008_250)] pl-0.5">Atenção agora</span>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
            <PriorityList subtasks={data.subtasks} loading={data.loading} />
            {/* <InboxCard
              notifications={notifications}
              loading={notificationsLoading}
              onMarkAsRead={onMarkNotificationAsRead}
            /> */}
          </div>
        </section>

      </div>
    </div>
  )
}
