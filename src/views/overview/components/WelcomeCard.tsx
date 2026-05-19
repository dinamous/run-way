import { Clock, AlertTriangle, CheckCircle2, Layers } from 'lucide-react'
import type { OverviewKpis } from '../hooks/useOverviewData'

interface WelcomeCardProps {
  userName: string
  kpis: OverviewKpis
  loading: boolean
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Bom dia'
  if (hour >= 12 && hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

function getContextPhrase(kpis: OverviewKpis): string {
  if (kpis.late > 0 && kpis.today > 0) {
    return `Você tem ${kpis.today} para hoje e ${kpis.late} atrasadas. Vamos focar?`
  }
  if (kpis.late > 0) return `Você tem ${kpis.late} subtarefas atrasadas. Atenção!`
  if (kpis.today > 0) return `Você tem ${kpis.today} subtarefas para entregar hoje.`
  return 'Tudo em dia por enquanto. Bom trabalho!'
}

const KPI_CONFIG = [
  { key: 'open' as const, label: 'Em aberto', icon: Layers, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/40' },
  { key: 'late' as const, label: 'Atrasadas', icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/40' },
  { key: 'today' as const, label: 'Vencem hoje', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/40' },
  { key: 'concluded' as const, label: 'Concluídas', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950/40' },
]

export function WelcomeCard({ userName, kpis, loading }: WelcomeCardProps) {
  const firstName = userName.split(' ')[0]
  const greeting = getGreeting()

  return (
    <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          {greeting}, {firstName}!
        </h2>
        {loading ? (
          <div className="mt-1.5 h-4 w-64 animate-pulse rounded bg-muted" />
        ) : (
          <p className="mt-1.5 text-sm text-muted-foreground">{getContextPhrase(kpis)}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {KPI_CONFIG.map(({ key, label, icon: Icon, color, bg }) => (
          <div key={key} className={`rounded-xl border border-border p-4 flex flex-col gap-3 ${bg}`}>
            {loading ? (
              <>
                <div className="h-5 w-5 animate-pulse rounded bg-muted" />
                <div className="h-8 w-12 animate-pulse rounded bg-muted" />
                <div className="h-3 w-16 animate-pulse rounded bg-muted" />
              </>
            ) : (
              <>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-background/70 ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-3xl font-bold tracking-tight text-foreground leading-none">
                  {kpis[key]}
                </span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {label}
                </span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
