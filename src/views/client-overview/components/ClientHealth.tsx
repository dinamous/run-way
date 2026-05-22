import { ShieldCheck, AlertTriangle, ShieldAlert } from 'lucide-react'
import type { ClientHealth as ClientHealthData } from '../hooks/useClientOverviewData'

interface ClientHealthProps {
  health: ClientHealthData
  loading: boolean
}

const config = {
  healthy: {
    label: 'Saudável',
    icon: ShieldCheck,
    wrap: 'bg-emerald-500/8 dark:bg-emerald-500/12 border border-emerald-500/20',
    icon_cls: 'text-emerald-500 dark:text-emerald-400',
    label_cls: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  warning: {
    label: 'Atenção',
    icon: AlertTriangle,
    wrap: 'bg-amber-500/8 dark:bg-amber-500/12 border border-amber-500/20',
    icon_cls: 'text-amber-500 dark:text-amber-400',
    label_cls: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  critical: {
    label: 'Em risco',
    icon: ShieldAlert,
    wrap: 'bg-red-500/8 dark:bg-red-500/12 border border-red-500/20',
    icon_cls: 'text-red-500 dark:text-red-400',
    label_cls: 'text-red-700 dark:text-red-400',
    dot: 'bg-red-500',
  },
} as const

export function ClientHealth({ health, loading }: ClientHealthProps) {
  if (loading) {
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

  const c = config[health.status]
  const Icon = c.icon

  return (
    <div className={`overview-card rounded-xl p-5 flex flex-col gap-3 ${c.wrap}`}>
      <div className="flex items-center gap-2">
        <div className={`h-1.5 w-1.5 rounded-full ${c.dot} animate-pulse`} />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</span>
      </div>

      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${c.icon_cls}`} />
        <span className={`text-base font-semibold ${c.label_cls}`}>{c.label}</span>
      </div>

      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        {health.lateTasks > 0 && (
          <span>{health.lateTasks} demanda{health.lateTasks > 1 ? 's' : ''} atrasada{health.lateTasks > 1 ? 's' : ''}</span>
        )}
        {health.criticalTasks > 0 && (
          <span>{health.criticalTasks} crítica{health.criticalTasks > 1 ? 's' : ''}</span>
        )}
        {health.dueSoonTasks > 0 && (
          <span>{health.dueSoonTasks} vencem em breve</span>
        )}
        {health.lateTasks === 0 && health.criticalTasks === 0 && health.dueSoonTasks === 0 && (
          <span>Nenhuma pendência urgente</span>
        )}
      </div>
    </div>
  )
}
