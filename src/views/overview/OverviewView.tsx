import { useOverviewData } from './hooks/useOverviewData'
import { WelcomeCard } from './components/WelcomeCard'
import { PriorityList } from './components/PriorityList'
import { ActiveClients } from './components/ActiveClients'
import { DayPlannerCard } from './components/DayPlannerCard'
import { CapacityTeam } from '@/components/workload/CapacityTeam'
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
  notifications: _notifications,
  notificationsLoading: _notificationsLoading,
  onMarkNotificationAsRead: _onMarkNotificationAsRead,
  onSelectClient,
  onNavigateToPlanning,
}: OverviewViewProps) {
  const data = useOverviewData({ memberId, userId, isAdmin, clients })

  return (
    <div className="flex flex-col gap-8">

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

        {/* Carga individual */}
        <section className="flex flex-col gap-2">
          <span className="block pl-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-[oklch(0.52_0.006_250)] dark:text-[oklch(0.50_0.008_250)]">
            Sua carga
          </span>
          <CapacityTeam
            title="Sua carga de trabalho atual"
            countLabel="visão individual"
            emptyLabel="Sem carga ativa atribuída"
            members={data.personalWorkload.member ? [data.personalWorkload.member] : []}
            insights={data.personalWorkload.insights}
            loading={data.loading}
          />
        </section>

        {/* Atenção agora — subtasks + plano do dia */}
        <section className="flex flex-col gap-2">
          <span className="block text-[0.6875rem] font-semibold tracking-[0.07em] uppercase text-[oklch(0.52_0.006_250)] dark:text-[oklch(0.50_0.008_250)] pl-0.5">Atenção agora</span>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch">
            <div className="lg:col-span-7 lg:flex lg:flex-col">
              <PriorityList subtasks={data.subtasks} loading={data.loading} />
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
    </div>
  )
}
