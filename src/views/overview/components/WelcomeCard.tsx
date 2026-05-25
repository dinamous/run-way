import { Layers, AlertTriangle, Clock, CheckCircle2, TrendingUp } from 'lucide-react'
import { CardShell } from '@/components/ui/CardShell'
import type { OverviewKpis } from '../hooks/useOverviewData'

interface WelcomeCardProps {
  userName: string
  kpis: OverviewKpis
  accumulatedDelayDays: number
  loading: boolean
  error?: string | null
  onRetry?: () => void
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Bom dia'
  if (hour >= 12 && hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

function getContextPhrase(kpis: OverviewKpis): string {
  if (kpis.late > 0 && kpis.today > 0) {
    return `${kpis.today} para hoje, ${kpis.late} atrasadas. Vamos focar.`
  }
  if (kpis.late > 0) return `${kpis.late} subtarefas atrasadas. Atenção necessária.`
  if (kpis.today > 0) return `${kpis.today} subtarefas vencem hoje.`
  return 'Tudo em dia por enquanto.'
}

interface KpiTileProps {
  value: number
  label: string
  icon: React.ElementType
  variant: 'default' | 'urgent' | 'warn' | 'positive'
}

function KpiTile({ value, label, icon: Icon, variant }: KpiTileProps) {
  const colors = {
    default: {
      wrap: 'bg-foreground/[0.04]',
      icon: 'text-muted-foreground',
      value: 'text-foreground',
    },
    urgent: {
      wrap: value > 0 ? 'bg-red-500/8 dark:bg-red-500/12' : 'bg-foreground/[0.04]',
      icon: value > 0 ? 'text-red-500 dark:text-red-400' : 'text-muted-foreground',
      value: value > 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground',
    },
    warn: {
      wrap: value > 0 ? 'bg-amber-500/8 dark:bg-amber-500/12' : 'bg-foreground/[0.04]',
      icon: value > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-muted-foreground',
      value: value > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground',
    },
    positive: {
      wrap: 'bg-foreground/[0.04]',
      icon: 'text-muted-foreground',
      value: 'text-muted-foreground',
    },
  }
  const c = colors[variant]

  return (
    <div className={`flex flex-col gap-2 rounded-lg p-3.5 ${c.wrap} transition-colors duration-200`}>
      <div className="flex items-center justify-between">
        <Icon className={`h-4 w-4 ${c.icon}`} />
        <span className={`text-2xl font-semibold tabular-nums leading-none ${c.value}`}>
          {value}
        </span>
      </div>
      <span className="text-xs text-muted-foreground leading-none">{label}</span>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="overview-card rounded-xl p-6 flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="h-7 w-44 animate-pulse rounded bg-muted/50" />
        <div className="h-4 w-52 animate-pulse rounded bg-muted/50" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[72px] animate-pulse rounded-lg bg-muted/40" />
        ))}
      </div>
      <div className="h-10 animate-pulse rounded-lg bg-muted/30" />
    </div>
  )
}

export function WelcomeCard({ userName, kpis, accumulatedDelayDays, loading, error = null, onRetry }: WelcomeCardProps) {
  const firstName = userName.split(' ')[0]
  const greeting = getGreeting()

  return (
    <CardShell loading={loading} error={error} onRetry={onRetry} skeleton={<LoadingSkeleton />}>
      <div className="overview-card rounded-xl p-6 flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {greeting}, {firstName}.
          </h2>
          <p className="text-sm text-muted-foreground">{getContextPhrase(kpis)}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <KpiTile value={kpis.open} label="Em aberto" icon={Layers} variant="default" />
          <KpiTile value={kpis.late} label="Atrasadas" icon={AlertTriangle} variant="urgent" />
          <KpiTile value={kpis.today} label="Vencem hoje" icon={Clock} variant="warn" />
          <KpiTile value={kpis.concluded} label="Concluídas" icon={CheckCircle2} variant="positive" />
        </div>

        <div className="flex items-center gap-1.5 rounded-lg bg-foreground/[0.03] px-4 py-3 border border-border/40">
          <TrendingUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="text-xs text-muted-foreground">Carga acumulada:</span>
          <span
            className={`text-xs font-semibold tabular-nums ${
              accumulatedDelayDays > 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-foreground'
            }`}
          >
            {accumulatedDelayDays > 0
              ? `${accumulatedDelayDays}d de atraso acumulado`
              : 'Sem atraso acumulado'}
          </span>
        </div>
      </div>
    </CardShell>
  )
}
