import { useMemo } from 'react'
import { useKpisData } from './hooks/useKpisData'
import { useClientsData } from './hooks/useClientsData'
import { useWorkloadData } from './hooks/useWorkloadData'
import { WelcomeCard } from './components/WelcomeCard'
import { PriorityList } from './components/PriorityList'
import { ActiveClients } from './components/ActiveClients'
import { DayPlannerCard } from './components/DayPlannerCard'
import { CardShell } from '@/components/ui/CardShell'
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

const CapacityTeamSkeleton = (
  <div className="overview-card rounded-xl p-6 flex flex-col gap-4">
    <div className="h-4 w-48 animate-pulse rounded bg-muted/50" />
    <div className="flex flex-col gap-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-lg bg-muted/40" />
      ))}
    </div>
  </div>
)

export function OverviewView({
  userName,
  userId: _userId,
  memberId,
  isAdmin,
  clients,
  notifications: _notifications,
  notificationsLoading: _notificationsLoading,
  onMarkNotificationAsRead: _onMarkNotificationAsRead,
  onSelectClient,
  onNavigateToPlanning,
}: OverviewViewProps) {
  const kpisData = useKpisData({ memberId, isAdmin, clients })
  const workloadData = useWorkloadData({ memberId, isAdmin })

  const lateByClient = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return kpisData.subtasks
      .filter((s) => !s.taskConcludedAt && s.end < today)
      .reduce<Record<string, number>>((acc, s) => {
        acc[s.clientId] = (acc[s.clientId] ?? 0) + 1
        return acc
      }, {})
  }, [kpisData.subtasks])

  const clientsData = useClientsData({ isAdmin, clients, subtasksLateByClient: lateByClient })

  return (
    <div className="flex flex-col gap-8">

      {/* Seu dia — welcome + clients */}
      <section className="flex flex-col gap-2">
        <span className="block text-[0.6875rem] font-semibold tracking-[0.07em] uppercase text-[oklch(0.52_0.006_250)] dark:text-[oklch(0.50_0.008_250)] pl-0.5">Seu dia</span>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
          <WelcomeCard
            userName={userName}
            kpis={kpisData.kpis}
            accumulatedDelayDays={kpisData.accumulatedDelayDays}
            loading={kpisData.loading}
            error={kpisData.error}
            onRetry={kpisData.retry}
          />
          <ActiveClients
            clients={clientsData.clients}
            loading={clientsData.loading}
            error={clientsData.error}
            onRetry={clientsData.retry}
            onSelectClient={onSelectClient}
          />
        </div>
      </section>

      {/* Carga individual */}
      <section className="flex flex-col gap-2">
        <span className="block pl-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-[oklch(0.52_0.006_250)] dark:text-[oklch(0.50_0.008_250)]">
          Sua carga
        </span>
        <CardShell
          loading={workloadData.loading}
          error={workloadData.error}
          onRetry={workloadData.retry}
          skeleton={CapacityTeamSkeleton}
        >
          <CapacityTeam
            title="Sua carga de trabalho atual"
            countLabel="visão individual"
            emptyLabel="Sem carga ativa atribuída"
            members={workloadData.personalWorkload.member ? [workloadData.personalWorkload.member] : []}
            insights={workloadData.personalWorkload.insights}
            loading={false}
          />
        </CardShell>
      </section>

      {/* Atenção agora — subtasks + plano do dia */}
      <section className="flex flex-col gap-2">
        <span className="block text-[0.6875rem] font-semibold tracking-[0.07em] uppercase text-[oklch(0.52_0.006_250)] dark:text-[oklch(0.50_0.008_250)] pl-0.5">Atenção agora</span>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch">
          <div className="lg:col-span-7 lg:flex lg:flex-col">
            <PriorityList
              subtasks={kpisData.subtasks}
              loading={kpisData.loading}
              error={kpisData.error}
              onRetry={kpisData.retry}
            />
          </div>
          <div className="lg:col-span-5 lg:flex lg:flex-col">
            <DayPlannerCard
              subtasks={kpisData.subtasks}
              blockedTasks={kpisData.blockedTasks}
              loading={kpisData.loading}
              error={kpisData.error}
              onRetry={kpisData.retry}
              onNavigateToPlanning={onNavigateToPlanning}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
