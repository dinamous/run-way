import { useCallback } from 'react'
import { CardShell } from '@/components/ui'
import { useClientSection } from './hooks/useClientSection'
import {
  fetchMetricsData,
  fetchHealthFocusData,
  fetchTasksTimelineData,
  fetchTeamData,
} from './hooks/clientSectionServices'
import { ClientHealth } from './components/ClientHealth'
import { ClientFocus } from './components/ClientFocus'
import { ClientMetrics } from './components/ClientMetrics'
import { ClientTasksByPriority } from './components/ClientTasksByPriority'
import { ClientTimeline } from './components/ClientTimeline'
import { CapacityTeam } from '@/components/workload/CapacityTeam'

interface ClientOverviewViewProps {
  clientId: string | null
}

// Skeletons inline para cada seção
function MetricsSkeleton() {
  return (
    <div className="overview-card rounded-xl p-6 flex flex-col gap-4">
      <div className="h-4 w-16 animate-pulse rounded bg-muted/50" />
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-lg p-3.5 bg-foreground/[0.04]">
            <div className="flex items-center justify-between">
              <div className="h-4 w-4 animate-pulse rounded bg-muted/50" />
              <div className="h-6 w-8 animate-pulse rounded bg-muted/50" />
            </div>
            <div className="h-3 w-24 animate-pulse rounded bg-muted/40" />
          </div>
        ))}
      </div>
    </div>
  )
}

function HealthSkeleton() {
  return (
    <div className="overview-card rounded-xl p-5 flex flex-col gap-3 bg-foreground/[0.04]">
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-1.5 rounded-full animate-pulse bg-muted/50" />
        <div className="h-3 w-12 animate-pulse rounded bg-muted/50" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-5 w-24 animate-pulse rounded bg-muted/50" />
        <div className="h-3.5 w-32 animate-pulse rounded bg-muted/40" />
      </div>
    </div>
  )
}

function FocusSkeleton() {
  return (
    <div className="overview-card rounded-xl p-6 flex flex-col gap-4">
      <div className="h-4 w-32 animate-pulse rounded bg-muted/50" />
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-1">
            <div className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-muted/50" />
            <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted/50" />
          </div>
        ))}
      </div>
    </div>
  )
}

function TasksSkeleton() {
  return (
    <div className="overview-card rounded-xl p-6 flex flex-col gap-4">
      <div className="h-4 w-36 animate-pulse rounded bg-muted/50" />
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-1">
            <div className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-muted/50" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted/50" />
              <div className="h-2.5 w-1/3 animate-pulse rounded bg-muted/40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TimelineSkeleton() {
  return (
    <div className="overview-card rounded-xl p-6 flex flex-col gap-4">
      <div className="h-4 w-28 animate-pulse rounded bg-muted/50" />
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="h-3 w-16 animate-pulse rounded bg-muted/40" />
            <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted/50" />
          </div>
        ))}
      </div>
    </div>
  )
}

function TeamSkeleton() {
  return (
    <div className="overview-card rounded-xl p-6 flex flex-col gap-4">
      <div className="h-4 w-40 animate-pulse rounded bg-muted/50" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted/50" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-1/3 animate-pulse rounded bg-muted/50" />
              <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted/40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ClientOverviewView({ clientId }: ClientOverviewViewProps) {
  const metricsFetcher = useCallback(
    (id: string, signal: AbortSignal) => fetchMetricsData(id, signal),
    [],
  )
  const healthFocusFetcher = useCallback(
    (id: string, signal: AbortSignal) => fetchHealthFocusData(id, signal),
    [],
  )
  const tasksTimelineFetcher = useCallback(
    (id: string, signal: AbortSignal) => fetchTasksTimelineData(id, signal),
    [],
  )
  const teamFetcher = useCallback(
    (id: string, signal: AbortSignal) => fetchTeamData(id, signal),
    [],
  )

  const metrics = useClientSection(clientId, metricsFetcher)
  const healthFocus = useClientSection(clientId, healthFocusFetcher)
  const tasksTimeline = useClientSection(clientId, tasksTimelineFetcher)
  const team = useClientSection(clientId, teamFetcher)

  const hasIssues =
    (healthFocus.data?.health.lateTasks ?? 0) > 0 ||
    (healthFocus.data?.health.criticalTasks ?? 0) > 0 ||
    (healthFocus.data?.health.dueSoonTasks ?? 0) > 0

  return (
    <div className="flex flex-col gap-6">
      {/* Métricas */}
      <CardShell
        loading={metrics.loading}
        error={metrics.error}
        onRetry={metrics.retry}
        skeleton={<MetricsSkeleton />}
      >
        <ClientMetrics kpis={metrics.data?.kpis ?? { openTasks: 0, lateTasks: 0, concludedTasks: 0, totalSubtasks: 0, lateSubtasks: 0, accumulatedLateDays: 0 }} />
      </CardShell>

      {/* Health + Focus */}
      <CardShell
        loading={healthFocus.loading}
        error={healthFocus.error}
        onRetry={healthFocus.retry}
        skeleton={
          hasIssues ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_240px]">
              <FocusSkeleton />
              <HealthSkeleton />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <HealthSkeleton />
              <FocusSkeleton />
            </div>
          )
        }
      >
        {hasIssues ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_240px]">
            <ClientFocus tasks={healthFocus.data?.focusTasks ?? []} />
            <ClientHealth health={healthFocus.data?.health ?? { status: 'healthy', lateTasks: 0, criticalTasks: 0, dueSoonTasks: 0 }} />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <ClientHealth health={healthFocus.data?.health ?? { status: 'healthy', lateTasks: 0, criticalTasks: 0, dueSoonTasks: 0 }} />
            <ClientFocus tasks={healthFocus.data?.focusTasks ?? []} />
          </div>
        )}
      </CardShell>

      {/* Tarefas + Timeline */}
      <CardShell
        loading={tasksTimeline.loading}
        error={tasksTimeline.error}
        onRetry={tasksTimeline.retry}
        skeleton={
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
            <TasksSkeleton />
            <TimelineSkeleton />
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
          <ClientTasksByPriority tasks={tasksTimeline.data?.tasks ?? []} />
          <ClientTimeline timeline={tasksTimeline.data?.timeline ?? []} />
        </div>
      </CardShell>

      {/* Equipe */}
      <CardShell
        loading={team.loading}
        error={team.error}
        onRetry={team.retry}
        skeleton={
          <section className="flex flex-col gap-2">
            <div className="h-3 w-24 animate-pulse rounded bg-muted/40" />
            <TeamSkeleton />
          </section>
        }
      >
        <section className="flex flex-col gap-2">
          <span className="block pl-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-[oklch(0.52_0.006_250)] dark:text-[oklch(0.50_0.008_250)]">
            Carga da equipe
          </span>
          <CapacityTeam
            title="Carga de trabalho da equipe"
            countLabel={
              (team.data?.members.length ?? 0) === 1
                ? '1 membro'
                : `${team.data?.members.length ?? 0} membros`
            }
            emptyLabel="Nenhum membro alocado neste cliente"
            members={team.data?.members ?? []}
            loading={false}
            clientHours={team.data?.clientHours ?? new Map()}
          />
        </section>
      </CardShell>
    </div>
  )
}
