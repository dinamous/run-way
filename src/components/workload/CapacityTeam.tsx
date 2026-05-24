import { useState } from 'react'
import { Users } from 'lucide-react'
import { MotionItem } from '@/components/ui'

export interface WorkloadSegment {
  taskId: string
  taskTitle: string
  clientName?: string
  subtaskTitle: string
  hours: number
}

export interface WorkloadMember {
  id: string
  name: string
  role: string
  avatarUrl: string | null
  capacity: number
  subtaskCount: number
  totalActiveHours?: number
  weekHours?: number
  monthHours?: number
  lateCount: number
  stuckTasksCount?: number
  pressureScore?: number
  status?: 'available' | 'busy' | 'overloaded'
  estimatedCompletionDate?: string | null
  segments?: WorkloadSegment[]
  weekSegments?: WorkloadSegment[]
}

type PeriodFilter = 'week' | 'month'

interface CapacityTeamProps {
  members: WorkloadMember[]
  loading: boolean
  title?: string
  countLabel?: string
  emptyLabel?: string
  insights?: string[]
}

type LoadStatus = 'available' | 'busy' | 'overloaded'

function getLoadStatus(member: WorkloadMember): LoadStatus {
  if (member.status) return member.status
  const ratio = member.subtaskCount / member.capacity
  if (ratio >= 1) return 'overloaded'
  if (ratio >= 0.6) return 'busy'
  return 'available'
}

const STATUS_CONFIG: Record<LoadStatus, { label: string; color: string; trackFill: string; overFill: string }> = {
  available: {
    label: 'Disponível',
    color: 'oklch(0.42 0.13 145)',
    trackFill: 'oklch(0.55 0.15 145)',
    overFill: 'oklch(0.55 0.15 145)',
  },
  busy: {
    label: 'Em carga',
    color: 'oklch(0.50 0.14 75)',
    trackFill: 'oklch(0.65 0.18 75)',
    overFill: 'oklch(0.65 0.18 75)',
  },
  overloaded: {
    label: 'Sobrecarregado',
    color: 'oklch(0.50 0.20 20)',
    trackFill: 'oklch(0.60 0.22 20)',
    overFill: 'oklch(0.60 0.22 20)',
  },
}

const STATUS_PILL: Record<LoadStatus, string> = {
  available: 'bg-[oklch(0.94_0.06_145)] text-[oklch(0.35_0.1_145)] dark:bg-[oklch(0.22_0.06_145)] dark:text-[oklch(0.75_0.1_145)]',
  busy: 'bg-[oklch(0.94_0.07_75)] text-[oklch(0.42_0.12_75)] dark:bg-[oklch(0.25_0.07_75)] dark:text-[oklch(0.78_0.1_75)]',
  overloaded: 'bg-[oklch(0.93_0.07_20)] text-[oklch(0.42_0.15_20)] dark:bg-[oklch(0.25_0.07_20)] dark:text-[oklch(0.78_0.12_20)]',
}

function MemberAvatar({ member }: { member: WorkloadMember }) {
  const initials = member.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  if (member.avatarUrl) {
    return (
      <img
        src={member.avatarUrl}
        alt={member.name}
        className="h-9 w-9 shrink-0 rounded-full object-cover"
      />
    )
  }

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground/[0.08] text-[11px] font-bold text-foreground">
      {initials}
    </div>
  )
}

const SEGMENT_COLORS = [
  'oklch(0.55 0.15 250)',
  'oklch(0.55 0.15 145)',
  'oklch(0.55 0.15 310)',
  'oklch(0.65 0.18 75)',
  'oklch(0.55 0.15 185)',
  'oklch(0.60 0.18 30)',
  'oklch(0.55 0.12 270)',
  'oklch(0.58 0.14 340)',
]

function SegmentTooltip({ seg, color }: { seg: WorkloadSegment; color: string }) {
  return (
    <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border/60 bg-popover px-3 py-2 shadow-lg">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        {seg.clientName ?? '—'}
      </div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{seg.taskTitle}</div>
      <div className="mt-0.5 text-[10px] text-muted-foreground/80">{seg.subtaskTitle}</div>
      <div className="mt-1 text-[11px] font-semibold tabular-nums" style={{ color }}>
        {seg.hours.toFixed(1)}h alocadas
      </div>
      {/* arrow */}
      <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-border/60" />
      <div className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-px border-4 border-transparent border-t-popover" />
    </div>
  )
}

function CapacityTrack({
  subtaskCount,
  capacity,
  status,
  totalActiveHours,
  segments = [],
}: {
  subtaskCount: number
  capacity: number
  status: LoadStatus
  totalActiveHours?: number
  segments?: WorkloadSegment[]
}) {
  const cfg = STATUS_CONFIG[status]
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  // Segmented bar when we have per-subtask data
  if (segments.length > 0 && totalActiveHours !== undefined) {
    const capacityHours = capacity * 8
    const totalHours = segments.reduce((s, seg) => s + seg.hours, 0)
    const isOver = totalHours > capacityHours
    const trackTotal = Math.max(totalHours, capacityHours)

    return (
      <div className="flex flex-col gap-1">
        <div className="relative flex h-[8px] w-full gap-[2px] overflow-visible rounded-[4px]">
          {/* track background */}
          <div className="absolute inset-0 rounded-[4px] bg-foreground/[0.10]" />
          {/* segments */}
          {segments.map((seg, i) => {
            const color = isOver && seg.hours / totalHours > 0.3
              ? STATUS_CONFIG.overloaded.trackFill
              : SEGMENT_COLORS[i % SEGMENT_COLORS.length]
            const widthPct = (seg.hours / trackTotal) * 100
            const isFirst = i === 0
            const isLast = i === segments.length - 1

            return (
              <div
                key={`${seg.taskId}-${seg.subtaskTitle}`}
                className="relative h-full cursor-default transition-opacity duration-150"
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: color,
                  borderRadius: isFirst && isLast ? '4px' : isFirst ? '4px 0 0 4px' : isLast ? '0 4px 4px 0' : '0',
                  opacity: hoveredIdx === null || hoveredIdx === i ? 1 : 0.4,
                  zIndex: hoveredIdx === i ? 10 : 1,
                }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {hoveredIdx === i && <SegmentTooltip seg={seg} color={color} />}
              </div>
            )
          })}
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {totalHours.toFixed(1)}h
            <span className="opacity-60"> / {capacityHours}h</span>
          </span>
          {isOver && (
            <span className="text-[9px] font-semibold tabular-nums text-[oklch(0.50_0.20_20)]">
              +{(totalHours - capacityHours).toFixed(1)}h excesso
            </span>
          )}
        </div>
      </div>
    )
  }

  // Fallback: single fill bar
  if (totalActiveHours !== undefined) {
    const capacityHours = capacity * 8
    const fillRatio = capacityHours > 0 ? Math.min(totalActiveHours / capacityHours, 1) : 0
    const isOver = totalActiveHours > capacityHours

    return (
      <div className="flex flex-col gap-1">
        <div className="relative h-[8px] w-full overflow-hidden rounded-[4px] bg-foreground/[0.10]">
          <div
            className="absolute inset-y-0 left-0 rounded-[4px] transition-all duration-500"
            style={{
              width: `${fillRatio * 100}%`,
              backgroundColor: isOver ? STATUS_CONFIG.overloaded.trackFill : cfg.trackFill,
            }}
          />
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {totalActiveHours.toFixed(1)}h
            <span className="opacity-60"> / {capacityHours}h</span>
          </span>
          {isOver && (
            <span className="text-[9px] font-semibold tabular-nums text-[oklch(0.50_0.20_20)]">
              +{(totalActiveHours - capacityHours).toFixed(1)}h excesso
            </span>
          )}
        </div>
      </div>
    )
  }

  // Fallback: slot-based track
  const isOver = subtaskCount > capacity
  const slotCount = capacity
  const filled = Math.min(subtaskCount, capacity)
  const overCount = isOver ? subtaskCount - capacity : 0

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 gap-[3px]">
        {Array.from({ length: slotCount }).map((_, i) => (
          <div
            key={i}
            className="h-[8px] flex-1 rounded-[2px] transition-all duration-300"
            style={{
              backgroundColor: i < filled ? cfg.trackFill : 'oklch(0.145 0 0 / 0.10)',
              transitionDelay: `${i * 20}ms`,
            }}
          />
        ))}
        {overCount > 0 &&
          Array.from({ length: Math.min(overCount, 6) }).map((_, i) => (
            <div
              key={`over-${i}`}
              className="h-[8px] w-[8px] shrink-0 rounded-[2px]"
              style={{ backgroundColor: STATUS_CONFIG.overloaded.overFill }}
            />
          ))}
        {overCount > 6 && (
          <span className="ml-0.5 self-center text-[9px] font-bold tabular-nums text-[oklch(0.50_0.20_20)]">
            +{overCount - 6}
          </span>
        )}
      </div>
    </div>
  )
}

export function CapacityTeam({
  members,
  loading,
  title = 'Equipe',
  countLabel,
  emptyLabel = 'Nenhum membro alocado',
  insights = [],
}: CapacityTeamProps) {
  const [period, setPeriod] = useState<PeriodFilter>('week')

  if (loading) {
    return (
      <div className="overview-card flex flex-col gap-5 rounded-xl p-6">
        <div className="h-4 w-28 animate-pulse rounded bg-muted/50" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border border-border/50 p-4">
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted/50" />
              <div className="flex-1 space-y-3 pt-0.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="h-3.5 w-28 animate-pulse rounded bg-muted/50" />
                  <div className="h-5 w-20 animate-pulse rounded-full bg-muted/40" />
                </div>
                <div className="h-6 w-16 animate-pulse rounded bg-muted/40" />
                <div className="flex gap-[3px]">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <div key={j} className="h-[8px] flex-1 animate-pulse rounded-[2px] bg-muted/40" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const isSingle = members.length === 1

  if (isSingle) {
    const member = members[0]
    const status = getLoadStatus(member)
    const cfg = STATUS_CONFIG[status]
    const pillCls = STATUS_PILL[status]

    const hasHours = member.weekHours !== undefined || member.monthHours !== undefined
    const displayHours = hasHours
      ? (period === 'week' ? (member.weekHours ?? 0) : (member.monthHours ?? 0))
      : member.totalActiveHours

    return (
      <MotionItem className="overview-card rounded-xl p-4" delay={0}>
        <div className="flex items-center gap-4">
          <MemberAvatar member={member} />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold leading-tight text-foreground">
                {member.name}
              </p>
              <p className="shrink-0 text-[11px] leading-tight text-muted-foreground">
                · {member.role}
              </p>
            </div>
            <div className="mt-2">
              <CapacityTrack subtaskCount={member.subtaskCount} capacity={member.capacity} status={status} totalActiveHours={displayHours} segments={period === 'week' ? (member.weekSegments ?? member.segments) : member.segments} />
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {hasHours && (
              <div className="flex items-center rounded-full border border-border/60 bg-background/60 p-0.5 text-[10px] font-semibold">
                <button
                  onClick={() => setPeriod('week')}
                  className={`cursor-pointer rounded-full px-2 py-0.5 transition-colors ${period === 'week' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Semana
                </button>
                <button
                  onClick={() => setPeriod('month')}
                  className={`cursor-pointer rounded-full px-2 py-0.5 transition-colors ${period === 'month' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Mês
                </button>
              </div>
            )}
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none ${pillCls}`}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
              {cfg.label}
            </span>
            {displayHours !== undefined ? (
              <span className="text-xl font-bold leading-none tabular-nums" style={{ color: cfg.color }}>
                {displayHours.toFixed(1)}
                <span className="text-sm font-medium text-muted-foreground">h</span>
              </span>
            ) : (
              <span className="text-xl font-bold leading-none tabular-nums" style={{ color: cfg.color }}>
                {member.subtaskCount}
                <span className="text-sm font-medium text-muted-foreground">/{member.capacity}</span>
              </span>
            )}
            {member.lateCount > 0 && (
              <span className="text-[10px] font-semibold tabular-nums text-[oklch(0.50_0.20_20)]">
                {member.lateCount} atrasad{member.lateCount === 1 ? 'a' : 'as'}
              </span>
            )}
            {(member.stuckTasksCount ?? 0) > 0 && (
              <span className="text-[10px] font-semibold tabular-nums text-[oklch(0.50_0.14_75)]">
                {member.stuckTasksCount} travad{member.stuckTasksCount === 1 ? 'a' : 'as'}
              </span>
            )}
          </div>
        </div>

        {member.estimatedCompletionDate && (
          <div className="mt-2 border-t border-border/40 pt-2">
            <span className="text-[10px] text-muted-foreground">
              Previsão de conclusão:{' '}
              <span className="font-semibold tabular-nums text-foreground">
                {member.estimatedCompletionDate.split('-').reverse().join('/')}
              </span>
            </span>
          </div>
        )}

        {insights.length > 0 && (
          <div className="mt-3 grid gap-2 border-t border-border/50 pt-3 sm:grid-cols-2">
            {insights.map((insight, i) => (
              <MotionItem
                key={insight}
                delay={60 + i * 35}
                className="rounded-lg bg-foreground/[0.035] px-3 py-2 text-xs leading-relaxed text-muted-foreground"
              >
                {insight}
              </MotionItem>
            ))}
          </div>
        )}
      </MotionItem>
    )
  }

  return (
    <div className="overview-card flex flex-col gap-5 rounded-xl p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {members.length > 0 && (
          <span className="text-xs tabular-nums text-muted-foreground">
            {countLabel ?? `${members.length} membros`}
          </span>
        )}
      </div>

      {members.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
          <Users className="h-6 w-6 opacity-40" />
          <p className="text-sm">{emptyLabel}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((member, i) => {
              const status = getLoadStatus(member)
              const cfg = STATUS_CONFIG[status]
              const pillCls = STATUS_PILL[status]

              return (
                <MotionItem
                  key={member.id}
                  className="flex flex-col gap-3 rounded-lg border border-border/60 bg-background/40 p-4"
                  delay={i * 40}
                >
                  <div className="flex items-center gap-3">
                    <MemberAvatar member={member} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold leading-tight text-foreground">
                        {member.name}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                        {member.role}
                      </p>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none ${pillCls}`}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: cfg.color }}
                      />
                      {cfg.label}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between">
                      <span
                        className="text-2xl font-bold leading-none tabular-nums"
                        style={{ color: cfg.color }}
                      >
                        {member.subtaskCount}
                        <span className="text-sm font-medium text-muted-foreground">
                          /{member.capacity}
                        </span>
                      </span>
                      <div className="flex flex-col items-end gap-0.5">
                        {member.lateCount > 0 && (
                          <span className="text-xs font-semibold tabular-nums text-[oklch(0.50_0.20_20)]">
                            {member.lateCount} atrasad{member.lateCount === 1 ? 'a' : 'as'}
                          </span>
                        )}
                        {(member.stuckTasksCount ?? 0) > 0 && (
                          <span className="text-xs font-semibold tabular-nums text-[oklch(0.50_0.14_75)]">
                            {member.stuckTasksCount} travad{member.stuckTasksCount === 1 ? 'a' : 'as'}
                          </span>
                        )}
                      </div>
                    </div>

                    <CapacityTrack
                      subtaskCount={member.subtaskCount}
                      capacity={member.capacity}
                      status={status}
                      totalActiveHours={member.totalActiveHours}
                      segments={member.segments}
                    />

                    {member.estimatedCompletionDate && (
                      <span className="text-[10px] text-muted-foreground">
                        Previsão:{' '}
                        <span className="font-semibold tabular-nums text-foreground">
                          {member.estimatedCompletionDate.split('-').reverse().join('/')}
                        </span>
                      </span>
                    )}
                  </div>
                </MotionItem>
              )
            })}
          </div>

          {insights.length > 0 && (
            <div className="grid gap-2 border-t border-border/50 pt-4 sm:grid-cols-2">
              {insights.map((insight, i) => (
                <MotionItem
                  key={insight}
                  delay={members.length * 40 + i * 35}
                  className="rounded-lg bg-foreground/[0.035] px-3 py-2.5 text-xs leading-relaxed text-muted-foreground"
                >
                  {insight}
                </MotionItem>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
