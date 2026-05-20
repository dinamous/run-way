import { ExternalLink, GitBranch } from 'lucide-react'
import type { ClientTask } from '../hooks/useClientOverviewData'

interface ClientTasksByPriorityProps {
  tasks: ClientTask[]
  loading: boolean
}

interface Group {
  key: 'critical' | 'important' | 'backlog'
  label: string
  dot: string
  badge: string
  badgeText: string
}

const GROUPS: Group[] = [
  { key: 'critical', label: 'Críticas', dot: 'bg-red-500', badge: 'bg-red-500/10 text-red-600 dark:text-red-400', badgeText: 'Crítica' },
  { key: 'important', label: 'Importantes', dot: 'bg-amber-500', badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', badgeText: 'Urgente' },
  { key: 'backlog', label: 'Backlog', dot: 'bg-muted-foreground/30', badge: '', badgeText: '' },
]

function TaskRow({ task }: { task: ClientTask }) {
  const group = GROUPS.find((g) => g.key === task.priority)!

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0">
      <div className={`h-2 w-2 shrink-0 rounded-full ${group.dot}`} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground leading-snug">{task.title}</p>
        {task.subtaskCount > 0 && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <GitBranch className="h-3 w-3" />
            {task.subtaskCount} subtarefa{task.subtaskCount > 1 ? 's' : ''}
            {task.lateSubtaskCount > 0 && (
              <span className="text-red-500 dark:text-red-400 ml-1">
                · {task.lateSubtaskCount} atrasada{task.lateSubtaskCount > 1 ? 's' : ''}
              </span>
            )}
          </p>
        )}
      </div>

      {group.badgeText && (
        <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${group.badge}`}>
          {group.badgeText}
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

export function ClientTasksByPriority({ tasks, loading }: ClientTasksByPriorityProps) {
  const openTasks = tasks.filter((t) => !t.concludedAt)

  if (loading) {
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

  return (
    <div className="overview-card rounded-xl p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Demandas por prioridade</h3>
        <span className="text-xs tabular-nums text-muted-foreground">{openTasks.length} abertas</span>
      </div>

      {openTasks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
          <GitBranch className="h-7 w-7 opacity-40" />
          <p className="text-sm">Nenhuma demanda aberta</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {GROUPS.map((group) => {
            const groupTasks = openTasks.filter((t) => t.priority === group.key)
            if (groupTasks.length === 0) return null
            return (
              <div key={group.key}>
                <div className="flex items-center gap-2 py-1.5 mt-1 first:mt-0">
                  <div className={`h-1.5 w-1.5 rounded-full ${group.dot}`} />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {group.label} · {groupTasks.length}
                  </span>
                </div>
                {groupTasks.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
