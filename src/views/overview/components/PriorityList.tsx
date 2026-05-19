import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui'
import type { SubtaskRow } from '../hooks/useOverviewData'

interface PriorityListProps {
  subtasks: SubtaskRow[]
  loading: boolean
}

const PAGE_SIZE = 15

function getDeadlineLabel(end: string): { label: string; className: string } {
  const today = new Date().toISOString().slice(0, 10)
  if (end < today) {
    const diff = Math.round(
      (new Date(today + 'T00:00:00').getTime() - new Date(end + 'T00:00:00').getTime()) /
        (1000 * 60 * 60 * 24)
    )
    return {
      label: `${diff}d atraso`,
      className: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/40',
    }
  }
  if (end === today) {
    return {
      label: 'Hoje',
      className: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/40',
    }
  }
  const diff = Math.round(
    (new Date(end + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) /
      (1000 * 60 * 60 * 24)
  )
  return { label: `${diff}d`, className: 'text-muted-foreground bg-muted' }
}

function clientInitials(name: string): string {
  return name.slice(0, 2).toUpperCase()
}

export function PriorityList({ subtasks, loading }: PriorityListProps) {
  const [visible, setVisible] = useState(PAGE_SIZE)

  const active = subtasks.filter((s) => !s.taskConcludedAt)
  const shown = active.slice(0, visible)

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 h-4 w-36 animate-pulse rounded bg-muted" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-1">
              <div className="h-8 w-8 shrink-0 animate-pulse rounded-md bg-muted" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                <div className="h-3.5 w-48 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-5 w-12 animate-pulse rounded bg-muted" />
              <div className="h-5 w-14 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Minhas Subtarefas</h3>
        {active.length > 0 && (
          <span className="text-xs text-muted-foreground">{active.length} ativas</span>
        )}
      </div>

      {active.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
          <CheckCircle2 className="h-8 w-8 opacity-50" />
          <p className="text-sm">Nenhuma subtarefa atribuída a você</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col divide-y divide-border">
            {shown.map((sub) => {
              const deadline = getDeadlineLabel(sub.end)
              return (
                <div key={sub.id} className="flex items-center gap-3 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground">
                    {clientInitials(sub.clientName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] text-muted-foreground leading-snug">
                      {sub.taskTitle}
                    </p>
                    <p className="truncate text-sm font-medium text-foreground leading-snug">
                      {sub.title}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[11px] font-medium px-1.5">
                    {sub.status}
                  </Badge>
                  <span
                    className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${deadline.className}`}
                  >
                    {deadline.label}
                  </span>
                </div>
              )
            })}
          </div>

          {active.length > visible && (
            <button
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline self-start"
            >
              Ver mais ({active.length - visible} restantes)
            </button>
          )}
        </>
      )}
    </div>
  )
}
