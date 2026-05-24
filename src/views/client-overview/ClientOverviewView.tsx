import { useClientOverviewData } from './hooks/useClientOverviewData'
import { ClientHealth } from './components/ClientHealth'
import { ClientFocus } from './components/ClientFocus'
import { ClientMetrics } from './components/ClientMetrics'
import { ClientTasksByPriority } from './components/ClientTasksByPriority'
import { ClientTimeline } from './components/ClientTimeline'
import { CapacityTeam } from '@/components/workload/CapacityTeam'

interface ClientOverviewViewProps {
  clientId: string | null
}

export function ClientOverviewView({ clientId }: ClientOverviewViewProps) {
  const data = useClientOverviewData(clientId)

  return (
    <div className="flex flex-col gap-6">
      <ClientMetrics kpis={data.kpis} loading={data.loading} />

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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
        <ClientTasksByPriority tasks={data.tasks} loading={data.loading} />
        <ClientTimeline timeline={data.timeline} loading={data.loading} />
      </div>

      <section className="flex flex-col gap-2">
        <span className="block pl-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-[oklch(0.52_0.006_250)] dark:text-[oklch(0.50_0.008_250)]">
          Carga da equipe
        </span>
        <CapacityTeam
          title="Carga de trabalho da equipe"
          countLabel={data.members.length === 1 ? '1 membro' : `${data.members.length} membros`}
          emptyLabel="Nenhum membro alocado neste cliente"
          members={data.members}
          loading={data.loading}
          clientHours={data.clientHours}
        />
      </section>
    </div>
  )
}
