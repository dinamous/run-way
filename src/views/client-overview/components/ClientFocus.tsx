import { Flame, ExternalLink } from 'lucide-react'
import type { ClientTask } from '../hooks/useClientOverviewData'

interface ClientFocusProps {
  tasks: ClientTask[]
  loading: boolean
}

function FocusItem({ task, index }: { task: ClientTask; index: number }) {
  const isCritical = task.priority === 'critical'
  const isImportant = task.priority === 'important'

  return (
    <div
      className="overview-item-enter flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <div className={`h-2 w-2 shrink-0 rounded-full ${isCritical ? 'bg-red-500' : isImportant ? 'bg-amber-500' : 'bg-muted-foreground/30'}`} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground leading-snug">{task.title}</p>
        {task.accumulatedLateDays > 0 && (
          <p className="text-xs text-red-500 dark:text-red-400">
            {task.accumulatedLateDays}d de atraso acumulado
          </p>
        )}
      </div>

      {isCritical && (
        <span className="shrink-0 rounded-md bg-red-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-red-600 dark:text-red-400">
          Crítica
        </span>
      )}
      {isImportant && (
        <span className="shrink-0 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
          Urgente
        </span>
      )}

      {task.clickupLink && (
        <a
          href={task.clickupLink}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  )
}

export function ClientFocus({ tasks, loading }: ClientFocusProps) {
  if (loading) {
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

  if (tasks.length === 0) return null

  return (
    <div className="overview-card rounded-xl p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Flame className="h-4 w-4 text-orange-500 dark:text-orange-400" />
        <h3 className="text-sm font-semibold text-foreground">Foco agora</h3>
      </div>

      <div className="flex flex-col">
        {tasks.map((task, i) => (
          <FocusItem key={task.id} task={task} index={i} />
        ))}
      </div>
    </div>
  )
}
