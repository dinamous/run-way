import { Flame } from 'lucide-react'
import type { SubtaskRow } from '../hooks/useOverviewData'

interface FocoDoDiaProps {
  subtasks: SubtaskRow[]
  loading: boolean
}

const today = new Date().toISOString().slice(0, 10)

function deadlineDays(end: string): number {
  return Math.round(
    (new Date(end + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) /
      (1000 * 60 * 60 * 24)
  )
}

type FocoPriority = 'critico' | 'hoje' | 'proximo'

interface FocoItem {
  sub: SubtaskRow
  priority: FocoPriority
  delayDays: number
}

function classifyFocus(subtasks: SubtaskRow[]): FocoItem[] {
  const active = subtasks.filter((s) => !s.taskConcludedAt)
  const items: FocoItem[] = []

  for (const sub of active) {
    const diff = deadlineDays(sub.end)
    if (diff < 0) {
      items.push({ sub, priority: 'critico', delayDays: Math.abs(diff) })
    } else if (diff === 0) {
      items.push({ sub, priority: 'hoje', delayDays: 0 })
    }
  }

  // Sort: most delayed first, then today
  items.sort((a, b) => {
    if (a.priority === b.priority) return b.delayDays - a.delayDays
    if (a.priority === 'critico') return -1
    return 1
  })

  return items.slice(0, 5)
}

function clientInitials(name: string): string {
  return name.slice(0, 2).toUpperCase()
}

function clientColor(name: string): string {
  const colors = [
    'bg-violet-500/15 text-violet-600 dark:text-violet-400',
    'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    'bg-rose-500/15 text-rose-600 dark:text-rose-400',
    'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
  ]
  return colors[name.charCodeAt(0) % colors.length]
}

export function FocoDoDia({ subtasks, loading }: FocoDoDiaProps) {
  if (loading) {
    return (
      <div className="overview-card rounded-xl p-5 flex flex-col gap-4 h-full">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-pulse rounded bg-muted/50" />
          <div className="h-4 w-32 animate-pulse rounded bg-muted/50" />
        </div>
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
              <div className="h-6 w-6 shrink-0 animate-pulse rounded-md bg-muted/40" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 w-20 animate-pulse rounded bg-muted/40" />
                <div className="h-3 w-48 animate-pulse rounded bg-muted/50" />
              </div>
              <div className="h-5 w-16 animate-pulse rounded-md bg-muted/40" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const items = classifyFocus(subtasks)

  if (items.length === 0) return null

  return (
    <div className="overview-card rounded-xl p-5 flex flex-col gap-3 h-full">
      <div className="flex items-center gap-2">
        <Flame className="h-4 w-4 text-red-500 dark:text-red-400" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">Foco de hoje</h3>
        <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
          {items.length} {items.length === 1 ? 'item' : 'itens'}
        </span>
      </div>

      <div className="flex flex-col gap-px">
        {items.map((item, i) => {
          const isCritico = item.priority === 'critico'
          const isHoje = item.priority === 'hoje'

          return (
            <div
              key={item.sub.id}
              className="overview-item-enter flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150 hover:bg-foreground/[0.04]"
              style={{ animationDelay: `${i * 25}ms` }}
            >
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${clientColor(item.sub.clientName)}`}
              >
                {clientInitials(item.sub.clientName)}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] text-muted-foreground leading-snug">
                  {item.sub.clientName} · {item.sub.taskTitle}
                </p>
                <p className="truncate text-sm font-medium text-foreground leading-snug">
                  {item.sub.title}
                </p>
              </div>

              {isCritico && (
                <span className="shrink-0 rounded-md bg-red-500/10 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-red-600 dark:bg-red-500/15 dark:text-red-400">
                  {item.delayDays}d atraso
                </span>
              )}
              {isHoje && (
                <span className="shrink-0 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                  Hoje
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
