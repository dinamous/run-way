import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui'
import type { SubtaskRow } from '../hooks/useOverviewData'

interface PriorityListProps {
  subtasks: SubtaskRow[]
  loading: boolean
}

const PAGE_SIZE = 15

const today = new Date().toISOString().slice(0, 10)

function deadlineDays(end: string): number {
  return Math.round(
    (new Date(end + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) /
      (1000 * 60 * 60 * 24)
  )
}

function deadlineLabel(end: string): string {
  const diff = deadlineDays(end)
  if (diff < 0) return `${Math.abs(diff)}d atraso`
  if (diff === 0) return 'Hoje'
  if (diff === 1) return 'Amanhã'
  return `${diff}d`
}

function clientInitials(name: string): string {
  return name.slice(0, 2).toUpperCase()
}

function clientColor(name: string): string {
  const colors = [
    'bg-violet-500/12 text-violet-600 dark:text-violet-400',
    'bg-blue-500/12 text-blue-600 dark:text-blue-400',
    'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
    'bg-amber-500/12 text-amber-600 dark:text-amber-400',
    'bg-rose-500/12 text-rose-600 dark:text-rose-400',
    'bg-cyan-500/12 text-cyan-600 dark:text-cyan-400',
  ]
  return colors[name.charCodeAt(0) % colors.length]
}

type ImpactGroup = 'critico' | 'importante' | 'backlog'

function getImpact(end: string): ImpactGroup {
  const diff = deadlineDays(end)
  if (diff < 0) return 'critico'
  if (diff <= 3) return 'importante'
  return 'backlog'
}

const GROUP_META: Record<
  ImpactGroup,
  {
    label: string
    labelColor: string
    dot: string
    deadlineColor: string
  }
> = {
  critico: {
    label: 'Crítico',
    labelColor: 'text-red-600 dark:text-red-400',
    dot: 'bg-red-500 dark:bg-red-400',
    deadlineColor: 'text-red-600 bg-red-500/10 dark:text-red-400 dark:bg-red-500/15',
  },
  importante: {
    label: 'Importante',
    labelColor: 'text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-400 dark:bg-amber-400',
    deadlineColor: 'text-amber-600 bg-amber-500/10 dark:text-amber-400 dark:bg-amber-500/15',
  },
  backlog: {
    label: 'Backlog',
    labelColor: 'text-muted-foreground',
    dot: 'bg-foreground/20',
    deadlineColor: 'text-muted-foreground bg-foreground/[0.05]',
  },
}

interface GroupedSubtasks {
  critico: SubtaskRow[]
  importante: SubtaskRow[]
  backlog: SubtaskRow[]
}

function groupSubtasks(subtasks: SubtaskRow[]): GroupedSubtasks {
  const result: GroupedSubtasks = { critico: [], importante: [], backlog: [] }
  for (const s of subtasks) {
    result[getImpact(s.end)].push(s)
  }
  return result
}

interface SubtaskRowItemProps {
  sub: SubtaskRow
  impact: ImpactGroup
  index: number
}

function SubtaskRowItem({ sub, impact, index }: SubtaskRowItemProps) {
  const meta = GROUP_META[impact]

  return (
    <div
      className="overview-item-enter flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      {impact === 'critico' && (
        <span className={`flex h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot} ml-0.5`} aria-hidden="true" />
      )}
      <div
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${clientColor(sub.clientName)}`}
      >
        {clientInitials(sub.clientName)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] text-muted-foreground leading-snug">{sub.taskTitle}</p>
        <p className="truncate text-sm font-medium text-foreground leading-snug">{sub.title}</p>
      </div>
      <Badge
        variant="outline"
        className="shrink-0 text-[11px] font-medium px-1.5 border-border/50 hidden sm:flex"
      >
        {sub.status}
      </Badge>
      <span
        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${meta.deadlineColor}`}
      >
        {deadlineLabel(sub.end)}
      </span>
    </div>
  )
}

interface GroupSectionProps {
  group: ImpactGroup
  items: SubtaskRow[]
  globalOffset: number
}

function GroupSection({ group, items, globalOffset }: GroupSectionProps) {
  if (items.length === 0) return null
  const meta = GROUP_META[group]

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 mb-1">
        <span className={`flex h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} aria-hidden="true" />
        <span className={`text-[0.6875rem] font-semibold tracking-[0.05em] uppercase px-0.5 pb-1.5 mt-1 ${meta.labelColor}`}>
          {meta.label}
        </span>
        <span className="ml-auto text-[11px] text-muted-foreground/60 tabular-nums">{items.length}</span>
      </div>
      {items.map((sub, i) => (
        <SubtaskRowItem key={sub.id} sub={sub} impact={group} index={globalOffset + i} />
      ))}
    </div>
  )
}

export function PriorityList({ subtasks, loading }: PriorityListProps) {
  const [visible, setVisible] = useState(PAGE_SIZE)

  const active = subtasks.filter((s) => !s.taskConcludedAt)
  const shown = active.slice(0, visible)
  const grouped = groupSubtasks(shown)

  if (loading) {
    return (
      <div className="overview-card p-6 flex flex-col gap-4">
        <div className="h-4 w-36 animate-pulse rounded bg-muted/50" />
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-1">
              <div className="h-6 w-6 shrink-0 animate-pulse rounded-md bg-muted/50" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 w-20 animate-pulse rounded bg-muted/40" />
                <div className="h-3 w-48 animate-pulse rounded bg-muted/50" />
              </div>
              <div className="h-5 w-12 animate-pulse rounded bg-muted/40" />
              <div className="h-5 w-14 animate-pulse rounded bg-muted/50" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="overview-card p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Minhas Subtarefas</h3>
        {active.length > 0 && (
          <span className="text-xs tabular-nums text-muted-foreground">{active.length} ativas</span>
        )}
      </div>

      {active.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
          <CheckCircle2 className="h-7 w-7 opacity-40" />
          <p className="text-sm">Nenhuma subtarefa atribuída a você</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            <GroupSection group="critico" items={grouped.critico} globalOffset={0} />
            <GroupSection
              group="importante"
              items={grouped.importante}
              globalOffset={grouped.critico.length}
            />
            <GroupSection
              group="backlog"
              items={grouped.backlog}
              globalOffset={grouped.critico.length + grouped.importante.length}
            />
          </div>

          {active.length > visible && (
            <button
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline self-start transition-colors"
            >
              Ver mais ({active.length - visible} restantes)
            </button>
          )}
        </>
      )}
    </div>
  )
}
