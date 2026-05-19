import { ExternalLink, CheckCircle2, GitBranch } from 'lucide-react'
import type { ClientTask } from '../hooks/useClientOverviewData'

interface ClientTaskListProps {
  tasks: ClientTask[]
  loading: boolean
}

const today = new Date().toISOString().slice(0, 10)

function TaskRow({ task, index }: { task: ClientTask; index: number }) {
  const isOpen = !task.concludedAt
  const haslate = task.lateSubtaskCount > 0

  return (
    <div
      className="overview-item-enter flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0"
      style={{ animationDelay: `${index * 25}ms` }}
    >
      <CheckCircle2
        className={`h-4 w-4 shrink-0 ${isOpen ? 'text-muted-foreground/40' : 'text-emerald-500 dark:text-emerald-400'}`}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground leading-snug">{task.title}</p>
        {task.subtaskCount > 0 && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <GitBranch className="h-3 w-3" />
            {task.subtaskCount} {task.subtaskCount === 1 ? 'subtarefa' : 'subtarefas'}
            {haslate && (
              <span className="text-red-500 dark:text-red-400 ml-1">
                · {task.lateSubtaskCount} atrasada{task.lateSubtaskCount > 1 ? 's' : ''}
              </span>
            )}
          </p>
        )}
      </div>

      {!isOpen && task.concludedAt && (
        <span className="shrink-0 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
          Concluída
        </span>
      )}

      {isOpen && haslate && (
        <span className="shrink-0 rounded-md bg-red-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-red-600 dark:text-red-400">
          Atrasada
        </span>
      )}

      {task.clickupLink && (
        <a
          href={task.clickupLink}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          aria-label="Abrir no ClickUp"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  )
}

export function ClientTaskList({ tasks, loading }: ClientTaskListProps) {
  const open = tasks.filter((t) => !t.concludedAt)
  const concluded = tasks.filter((t) => t.concludedAt)

  if (loading) {
    return (
      <div className="overview-card p-6 flex flex-col gap-4">
        <div className="h-4 w-28 animate-pulse rounded bg-muted/50" />
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-1">
              <div className="h-4 w-4 shrink-0 animate-pulse rounded-full bg-muted/50" />
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
    <div className="overview-card p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Demandas</h3>
        {tasks.length > 0 && (
          <span className="text-xs tabular-nums text-muted-foreground">
            {open.length} abertas · {concluded.length} concluídas
          </span>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
          <GitBranch className="h-7 w-7 opacity-40" />
          <p className="text-sm">Nenhuma demanda encontrada</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {open.map((task, i) => (
            <TaskRow key={task.id} task={task} index={i} />
          ))}
          {concluded.length > 0 && open.length > 0 && (
            <div className="mt-3 mb-1">
              <span className="overview-group-label text-muted-foreground/60">Concluídas</span>
            </div>
          )}
          {concluded.map((task, i) => (
            <TaskRow key={task.id} task={task} index={open.length + i} />
          ))}
        </div>
      )}
    </div>
  )
}
