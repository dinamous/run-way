import { CalendarClock } from 'lucide-react'
import type { TimelineEntry } from '../hooks/useClientOverviewData'

interface ClientTimelineProps {
  timeline: TimelineEntry[]
}

function dayLabel(daysFromNow: number): string {
  if (daysFromNow < 0) return `${Math.abs(daysFromNow)}d de atraso`
  if (daysFromNow === 0) return 'Hoje'
  if (daysFromNow === 1) return 'Amanhã'
  return `Em ${daysFromNow} dias`
}

function groupByDay(entries: TimelineEntry[]): Map<number, TimelineEntry[]> {
  const map = new Map<number, TimelineEntry[]>()
  for (const e of entries) {
    const existing = map.get(e.daysFromNow) ?? []
    existing.push(e)
    map.set(e.daysFromNow, existing)
  }
  return map
}

export function ClientTimeline({ timeline }: ClientTimelineProps) {
  if (timeline.length === 0) {
    return (
      <div className="overview-card rounded-xl p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Próximos 7 dias</h3>
        </div>
        <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
          <CalendarClock className="h-7 w-7 opacity-40" />
          <p className="text-sm">Nenhuma entrega nos próximos 7 dias</p>
        </div>
      </div>
    )
  }

  const grouped = groupByDay(timeline)
  const days = [...grouped.keys()].sort((a, b) => a - b)

  return (
    <div className="overview-card rounded-xl p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Próximos 7 dias</h3>
      </div>

      <div className="flex flex-col gap-4">
        {days.map((day) => {
          const entries = grouped.get(day)!
          const isLateGroup = day < 0
          return (
            <div key={day} className="flex flex-col gap-1.5">
              <span className={`text-[11px] font-semibold uppercase tracking-wider ${isLateGroup ? 'text-red-500 dark:text-red-400' : 'text-muted-foreground/70'}`}>
                {dayLabel(day)}
              </span>
              {entries.map((e) => (
                <div key={e.subtaskId} className="flex items-start gap-2">
                  <div className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${e.isLate ? 'bg-red-500' : day === 0 ? 'bg-amber-500' : 'bg-muted-foreground/40'}`} />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground leading-snug truncate">{e.subtaskTitle || e.taskTitle}</p>
                    {e.subtaskTitle && (
                      <p className="text-xs text-muted-foreground truncate">{e.taskTitle}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
