import { useClientOverviewData } from './hooks/useClientOverviewData'
import { ClientOverviewHeader } from './components/ClientOverviewHeader'
import { ClientHealth } from './components/ClientHealth'
import { ClientFocus } from './components/ClientFocus'
import { ClientMetrics } from './components/ClientMetrics'
import { ClientTasksByPriority } from './components/ClientTasksByPriority'
import { ClientTimeline } from './components/ClientTimeline'
import { ClientTeam } from './components/ClientTeam'

interface ClientOverviewViewProps {
  clientId: string | null
}

export function ClientOverviewView({ clientId }: ClientOverviewViewProps) {
  const data = useClientOverviewData(clientId)

  return (
    <div className="bg-[oklch(0.955_0.004_250)] dark:bg-[oklch(0.13_0.008_250)] relative min-h-full">
      <div className="overview-ambient" aria-hidden="true" />

      <div className="relative z-10 p-4 md:p-6 lg:p-8 max-w-screen-xl mx-auto flex flex-col gap-6">

        <ClientOverviewHeader client={data.client} loading={data.loading} />

 {/* Métricas */}
        <ClientMetrics kpis={data.kpis} loading={data.loading} />

        {/* Foco + Status */}
        {(() => {
          const hasIssues = data.health.lateTasks > 0 || data.health.criticalTasks > 0 || data.health.dueSoonTasks > 0
          return hasIssues ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_240px]">
              <ClientFocus tasks={data.focusTasks} loading={data.loading} />
              <ClientHealth health={data.health} loading={data.loading} />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <ClientHealth health={data.health} loading={data.loading} />
              <ClientFocus tasks={data.focusTasks} loading={data.loading} />
            </div>
          )
        })()}

       

        {/* Demandas por prioridade + Timeline */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
          <ClientTasksByPriority tasks={data.tasks} loading={data.loading} />
          <ClientTimeline timeline={data.timeline} loading={data.loading} />
        </div>

        {/* Equipe */}
        <ClientTeam members={data.members} loading={data.loading} />

      </div>
    </div>
  )
}
