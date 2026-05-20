import { useMemo } from 'react'
import { AlertTriangle, Flame, CalendarClock, Clock, Ban } from 'lucide-react'
import { generateDayPlan, type PlanMessage } from '@/utils/planner'
import type { SubtaskRow } from '../hooks/useOverviewData'
import type { BlockedTask } from '@/utils/planner'

interface DayPlannerCardProps {
  subtasks: SubtaskRow[]
  blockedTasks: BlockedTask[]
  loading: boolean
  onNavigateToPlanning?: () => void
}

const TIER_ICON = {
  late: AlertTriangle,
  today: Flame,
  soon: Clock,
  blocked: Ban,
} as const

const TIER_STYLES: Record<string, string> = {
  late: 'text-red-600 dark:text-red-400',
  today: 'text-amber-600 dark:text-amber-400',
  soon: 'text-blue-600 dark:text-blue-400',
  blocked: 'text-muted-foreground',
}

const TIER_BG: Record<string, string> = {
  late: 'bg-red-500/8 border-red-500/20',
  today: 'bg-amber-500/8 border-amber-500/20',
  soon: 'bg-blue-500/8 border-blue-500/20',
  blocked: 'bg-muted/40 border-border',
}

function Metric({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="flex-1 rounded-lg bg-foreground/[0.04] px-3 py-2.5">
      <p className="text-[10px] text-muted-foreground leading-none mb-1">{label}</p>
      <p className={`text-lg font-semibold tabular-nums leading-none ${accent}`}>{value}</p>
    </div>
  )
}

function MessageItem({ msg, onNavigate }: { msg: PlanMessage; onNavigate?: () => void }) {
  const Icon = TIER_ICON[msg.tier]
  const iconClass = TIER_STYLES[msg.tier]
  const bgClass = TIER_BG[msg.tier]

  return (
    <button
      type="button"
      onClick={onNavigate}
      className={`w-full text-left flex items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-opacity duration-150 hover:opacity-80 ${bgClass}`}
    >
      <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${iconClass}`} aria-hidden="true" />
      <p className="text-[12.5px] text-foreground leading-snug">{msg.text}</p>
    </button>
  )
}

function LoadingSkeleton() {
  return (
    <div className="overview-card rounded-xl p-5 flex flex-col gap-4 h-full">
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 animate-pulse rounded bg-muted/50" />
        <div className="h-4 w-28 animate-pulse rounded bg-muted/50" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex-1 h-12 animate-pulse rounded-lg bg-muted/40" />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-muted/30" />
        ))}
      </div>
    </div>
  )
}

export function DayPlannerCard({ subtasks, blockedTasks, loading, onNavigateToPlanning }: DayPlannerCardProps) {
  if (loading) return <LoadingSkeleton />

  const plan = useMemo(() => generateDayPlan(subtasks, blockedTasks), [subtasks, blockedTasks])

  const urgentMessages = plan.messages.filter((m) => m.tier !== 'blocked')
  const blockedMessages = plan.messages.filter((m) => m.tier === 'blocked')

  return (
    <div className="overview-card rounded-xl p-5 flex flex-col gap-4 h-full">

      {/* Header */}
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">Plano do dia</h3>
      </div>

      {/* Metrics */}
      <div className="flex gap-2">
        <Metric label="Atrasadas" value={plan.lateCount} accent="text-red-500 dark:text-red-400" />
        <Metric label="Hoje" value={plan.todayCount} accent="text-amber-500 dark:text-amber-400" />
        <Metric label="Esta semana" value={plan.weekCount} accent="text-blue-500 dark:text-blue-400" />
      </div>

      {/* Messages */}
      {plan.isEmpty ? (
        <div className="flex-1 flex flex-col gap-1.5 overflow-auto">
          <p className="text-[12.5px] text-muted-foreground px-1">
            Nenhuma entrega crítica hoje. Bom momento para avançar nas demandas em andamento.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-1.5 overflow-auto">
          {urgentMessages.map((msg, i) => (
            <MessageItem key={i} msg={msg} onNavigate={onNavigateToPlanning} />
          ))}

          {blockedMessages.length > 0 && (
            <>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mt-1 px-0.5">
                Bloqueadas
              </p>
              {blockedMessages.map((msg, i) => (
                <MessageItem key={`b${i}`} msg={msg} onNavigate={onNavigateToPlanning} />
              ))}
            </>
          )}
        </div>
      )}

    </div>
  )
}
