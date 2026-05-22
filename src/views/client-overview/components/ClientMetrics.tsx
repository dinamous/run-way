import { Layers, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import type { ClientOverviewKpis } from '../hooks/useClientOverviewData'

interface ClientMetricsProps {
  kpis: ClientOverviewKpis
  loading: boolean
}

interface MetricTileProps {
  value: number
  label: string
  icon: React.ElementType
  variant: 'default' | 'urgent' | 'positive' | 'neutral'
  loading: boolean
}

function MetricTile({ value, label, icon: Icon, variant, loading }: MetricTileProps) {
  const colors = {
    default: { wrap: 'bg-foreground/[0.04]', icon: 'text-muted-foreground', value: 'text-foreground' },
    urgent: {
      wrap: value > 0 ? 'bg-red-500/8 dark:bg-red-500/12' : 'bg-foreground/[0.04]',
      icon: value > 0 ? 'text-red-500 dark:text-red-400' : 'text-muted-foreground',
      value: value > 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground',
    },
    positive: { wrap: 'bg-foreground/[0.04]', icon: 'text-muted-foreground', value: 'text-muted-foreground' },
    neutral: { wrap: 'bg-foreground/[0.04]', icon: 'text-muted-foreground', value: 'text-muted-foreground' },
  }
  const c = colors[variant]

  if (loading) {
    return (
      <div className="flex flex-col gap-2 rounded-lg p-3.5 bg-foreground/[0.04]">
        <div className="flex items-center justify-between">
          <div className="h-4 w-4 animate-pulse rounded bg-muted/50" />
          <div className="h-6 w-8 animate-pulse rounded bg-muted/50" />
        </div>
        <div className="h-3 w-24 animate-pulse rounded bg-muted/40" />
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-2 rounded-lg p-3.5 ${c.wrap} transition-colors duration-200`}>
      <div className="flex items-center justify-between">
        <Icon className={`h-4 w-4 ${c.icon}`} />
        <span className={`text-2xl font-semibold tabular-nums leading-none ${c.value}`}>{value}</span>
      </div>
      <span className="text-xs text-muted-foreground leading-none">{label}</span>
    </div>
  )
}

export function ClientMetrics({ kpis, loading }: ClientMetricsProps) {
  return (
    <div className="overview-card rounded-xl p-6 flex flex-col gap-4">
      {loading ? (
        <div className="h-4 w-16 animate-pulse rounded bg-muted/50" />
      ) : (
        <h3 className="text-sm font-semibold text-foreground">Métricas</h3>
      )}
      <div className="grid grid-cols-2 gap-2">
        <MetricTile value={kpis.openTasks} label="Demandas abertas" icon={Layers} variant="default" loading={loading} />
        <MetricTile value={kpis.lateTasks} label="Com atraso" icon={AlertTriangle} variant="urgent" loading={loading} />
        <MetricTile value={kpis.concludedTasks} label="Concluídas" icon={CheckCircle2} variant="positive" loading={loading} />
        <MetricTile value={kpis.accumulatedLateDays} label="Dias de atraso acumulado" icon={Clock} variant="neutral" loading={loading} />
      </div>
    </div>
  )
}
