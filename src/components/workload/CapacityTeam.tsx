import { useState } from 'react'
import { Users } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { MotionItem } from '@/components/ui'

export interface WorkloadSegment {
  taskId: string
  taskTitle: string
  clientName?: string
  subtaskTitle: string
  hours: number
  isOtherClient?: boolean
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
  /** When set, segments from other clients render grey and a client-hours label is shown */
  clientHours?: Map<string, number>
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

const OTHER_CLIENT_COLOR = 'oklch(0.72 0 0)'

function segmentColor(seg: WorkloadSegment, index: number, isOver: boolean, totalActiveHours: number): string {
  if (seg.isOtherClient) return OTHER_CLIENT_COLOR
  if (isOver && seg.hours / totalActiveHours > 0.3) return STATUS_CONFIG.overloaded.trackFill
  return SEGMENT_COLORS[index % SEGMENT_COLORS.length]
}

function SegmentTooltip({ seg, color, clientHours }: { seg: WorkloadSegment; color: string; clientHours?: number }) {
  return (
    <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border/60 bg-popover px-3 py-2 shadow-lg">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        {seg.clientName ?? '—'}
        {seg.isOtherClient && (
          <span className="ml-1 rounded-sm bg-foreground/[0.07] px-1 text-[9px] font-medium text-muted-foreground">
            outro cliente
          </span>
        )}
      </div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{seg.taskTitle}</div>
      <div className="mt-0.5 text-[10px] text-muted-foreground/80">{seg.subtaskTitle}</div>
      <div className="mt-1 text-[11px] font-semibold tabular-nums" style={{ color }}>
        {seg.hours.toFixed(1)}h alocadas
      </div>
      {clientHours !== undefined && (
        <div className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
          {clientHours.toFixed(1)}h neste cliente
        </div>
      )}
      <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-border/60" />
      <div className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-px border-4 border-transparent border-t-popover" />
    </div>
  )
}

function AnimatedSegmentBar({
  segments,
  totalActiveHours,
  capacity,
  memberIndex,
  period,
  memberId,
  clientHoursMap,
}: {
  segments: WorkloadSegment[]
  totalActiveHours: number
  capacity: number
  memberIndex: number
  period: PeriodFilter
  memberId?: string
  clientHoursMap?: Map<string, number>
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const capacityHours = capacity * 8
  const isOver = totalActiveHours > capacityHours
  const trackTotal = Math.max(totalActiveHours, capacityHours)
  const clientHours = memberId ? clientHoursMap?.get(memberId) : undefined

  return (
    <div className="flex flex-col gap-1">
      <div className="relative flex h-[8px] w-full gap-[2px] overflow-visible rounded-[4px]">
        <div className="absolute inset-0 rounded-[4px] bg-foreground/[0.10]" />
        {segments.map((seg, i) => {
          const color = segmentColor(seg, i, isOver, totalActiveHours)
          const widthPct = (seg.hours / trackTotal) * 100
          const isFirst = i === 0
          const isLast = i === segments.length - 1

          return (
            <motion.div
              key={`${seg.taskId}-${seg.subtaskTitle}-${period}`}
              className="relative h-full cursor-default"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: `${widthPct}%`, opacity: hoveredIdx === null || hoveredIdx === i ? 1 : 0.4 }}
              transition={{
                width: {
                  duration: 0.45,
                  ease: [0.16, 1, 0.3, 1],
                  delay: memberIndex * 0.05 + i * 0.03,
                },
                opacity: { duration: 0.15 },
              }}
              style={{
                backgroundColor: color,
                borderRadius: isFirst && isLast ? '4px' : isFirst ? '4px 0 0 4px' : isLast ? '0 4px 4px 0' : '0',
                zIndex: hoveredIdx === i ? 10 : 1,
              }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {hoveredIdx === i && <SegmentTooltip seg={seg} color={color} clientHours={clientHours} />}
            </motion.div>
          )
        })}
      </div>
      <div className="flex items-baseline justify-between">
        <motion.span
          key={`${period}-hours`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: memberIndex * 0.05 + 0.1 }}
          className="text-[10px] tabular-nums text-muted-foreground"
        >
          {totalActiveHours.toFixed(1)}h
          <span className="opacity-60"> / {capacityHours}h</span>
        </motion.span>
        {clientHours !== undefined && (
          <span className="text-[9px] tabular-nums text-muted-foreground">
            {clientHours.toFixed(1)}h neste cliente
          </span>
        )}
        {isOver && (
          <span className="text-[9px] font-semibold tabular-nums text-[oklch(0.50_0.20_20)]">
            +{(totalActiveHours - capacityHours).toFixed(1)}h excesso
          </span>
        )}
      </div>
    </div>
  )
}

function AnimatedFillBar({
  totalActiveHours,
  capacity,
  status,
  memberIndex,
  period,
}: {
  totalActiveHours: number
  capacity: number
  status: LoadStatus
  memberIndex: number
  period: PeriodFilter
}) {
  const cfg = STATUS_CONFIG[status]
  const capacityHours = capacity * 8
  const fillRatio = capacityHours > 0 ? Math.min(totalActiveHours / capacityHours, 1) : 0
  const isOver = totalActiveHours > capacityHours

  return (
    <div className="flex flex-col gap-1">
      <div className="relative h-[8px] w-full overflow-hidden rounded-[4px] bg-foreground/[0.10]">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-[4px]"
          initial={{ width: 0 }}
          animate={{ width: `${fillRatio * 100}%` }}
          transition={{
            duration: 0.45,
            ease: [0.16, 1, 0.3, 1],
            delay: memberIndex * 0.05,
          }}
          style={{ backgroundColor: isOver ? STATUS_CONFIG.overloaded.trackFill : cfg.trackFill }}
        />
      </div>
      <div className="flex items-baseline justify-between">
        <motion.span
          key={`${period}-hours`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: memberIndex * 0.05 + 0.1 }}
          className="text-[10px] tabular-nums text-muted-foreground"
        >
          {totalActiveHours.toFixed(1)}h
          <span className="opacity-60"> / {capacityHours}h</span>
        </motion.span>
        {isOver && (
          <span className="text-[9px] font-semibold tabular-nums text-[oklch(0.50_0.20_20)]">
            +{(totalActiveHours - capacityHours).toFixed(1)}h excesso
          </span>
        )}
      </div>
    </div>
  )
}

function SlotBar({ subtaskCount, capacity, status }: { subtaskCount: number; capacity: number; status: LoadStatus }) {
  const cfg = STATUS_CONFIG[status]
  const isOver = subtaskCount > capacity
  const filled = Math.min(subtaskCount, capacity)
  const overCount = isOver ? subtaskCount - capacity : 0

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 gap-[3px]">
        {Array.from({ length: capacity }).map((_, i) => (
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

function NoHoursState({ period }: { period: PeriodFilter }) {
  return (
    <div className="flex h-[34px] items-center gap-2 rounded-md bg-foreground/[0.03] px-2">
      <div className="h-[8px] w-full rounded-[4px] bg-foreground/[0.06]" />
      <span className="shrink-0 text-[10px] text-muted-foreground/60">
        sem dados {period === 'week' ? 'semanais' : 'mensais'}
      </span>
    </div>
  )
}

function PeriodToggle({
  period,
  onChange,
}: {
  period: PeriodFilter
  onChange: (p: PeriodFilter) => void
}) {
  return (
    <div className="flex items-center rounded-full border border-border/60 bg-background/60 p-0.5 text-[10px] font-semibold">
      <button
        onClick={() => onChange('week')}
        className={`cursor-pointer rounded-full px-2.5 py-1 transition-colors duration-150 ${
          period === 'week' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        Semana
      </button>
      <button
        onClick={() => onChange('month')}
        className={`cursor-pointer rounded-full px-2.5 py-1 transition-colors duration-150 ${
          period === 'month' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        Mês
      </button>
    </div>
  )
}

function MemberCardTrack({
  member,
  period,
  memberIndex,
  clientHoursMap,
}: {
  member: WorkloadMember
  period: PeriodFilter
  memberIndex: number
  clientHoursMap?: Map<string, number>
}) {
  const status = getLoadStatus(member)
  const hasWeek = member.weekHours !== undefined
  const hasMonth = member.monthHours !== undefined
  const hasPeriodData = period === 'week' ? hasWeek : hasMonth
  const periodHours = period === 'week' ? member.weekHours : member.monthHours
  const periodSegments = period === 'week' ? (member.weekSegments ?? member.segments) : member.segments

  if (!hasPeriodData && member.totalActiveHours === undefined) {
    return <SlotBar subtaskCount={member.subtaskCount} capacity={member.capacity} status={status} />
  }

  if (!hasPeriodData) {
    return <NoHoursState period={period} />
  }

  const hours = periodHours!
  const segs = periodSegments ?? []

  if (segs.length > 0) {
    return (
      <AnimatedSegmentBar
        key={`${member.id}-${period}`}
        segments={segs}
        totalActiveHours={hours}
        capacity={member.capacity}
        memberIndex={memberIndex}
        period={period}
        memberId={member.id}
        clientHoursMap={clientHoursMap}
      />
    )
  }

  return (
    <AnimatedFillBar
      key={`${member.id}-${period}`}
      totalActiveHours={hours}
      capacity={member.capacity}
      status={status}
      memberIndex={memberIndex}
      period={period}
    />
  )
}

export function CapacityTeam({
  members,
  loading,
  title = 'Equipe',
  countLabel,
  emptyLabel = 'Nenhum membro alocado',
  insights = [],
  clientHours,
}: CapacityTeamProps) {
  const [period, setPeriod] = useState<PeriodFilter>('week')

  const hasAnyPeriodData = members.some(
    (m) => m.weekHours !== undefined || m.monthHours !== undefined
  )

  if (loading) {
    return (
      <div className="overview-card flex flex-col gap-5 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="h-4 w-28 animate-pulse rounded bg-muted/50" />
          <div className="h-6 w-32 animate-pulse rounded-full bg-muted/40" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
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

    const hasWeek = member.weekHours !== undefined
    const hasMonth = member.monthHours !== undefined
    const hasPeriodToggle = hasWeek || hasMonth
    const hasPeriodData = period === 'week' ? hasWeek : hasMonth
    const periodHours = period === 'week' ? member.weekHours : member.monthHours
    const periodSegments = period === 'week' ? (member.weekSegments ?? member.segments) : member.segments
    const displayHours = hasPeriodData ? periodHours : member.totalActiveHours

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
              {hasPeriodData && periodSegments && periodSegments.length > 0 ? (
                <AnimatedSegmentBar
                  key={`single-${period}`}
                  segments={periodSegments}
                  totalActiveHours={periodHours!}
                  capacity={member.capacity}
                  memberIndex={0}
                  period={period}
                  memberId={member.id}
                  clientHoursMap={clientHours}
                />
              ) : hasPeriodData ? (
                <AnimatedFillBar
                  key={`single-${period}`}
                  totalActiveHours={periodHours!}
                  capacity={member.capacity}
                  status={status}
                  memberIndex={0}
                  period={period}
                />
              ) : hasPeriodToggle ? (
                <NoHoursState period={period} />
              ) : (
                <MemberCardTrack member={member} period={period} memberIndex={0} clientHoursMap={clientHours} />
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {hasPeriodToggle && (
              <PeriodToggle period={period} onChange={setPeriod} />
            )}
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none ${pillCls}`}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
              {cfg.label}
            </span>
            <AnimatePresence mode="wait">
              <motion.span
                key={`${period}-${displayHours}`}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="text-xl font-bold leading-none tabular-nums"
                style={{ color: cfg.color }}
              >
                {displayHours !== undefined ? (
                  <>
                    {displayHours.toFixed(1)}
                    <span className="text-sm font-medium text-muted-foreground">h</span>
                  </>
                ) : (
                  <>
                    {member.subtaskCount}
                    <span className="text-sm font-medium text-muted-foreground">/{member.capacity}</span>
                  </>
                )}
              </motion.span>
            </AnimatePresence>
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
        <div className="flex items-baseline gap-2">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {members.length > 0 && (
            <span className="text-xs tabular-nums text-muted-foreground">
              {countLabel ?? `${members.length} membros`}
            </span>
          )}
        </div>
        {hasAnyPeriodData && members.length > 0 && (
          <PeriodToggle period={period} onChange={setPeriod} />
        )}
      </div>

      {members.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
          <Users className="h-6 w-6 opacity-40" />
          <p className="text-sm">{emptyLabel}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {members.map((member, i) => {
              const status = getLoadStatus(member)
              const cfg = STATUS_CONFIG[status]
              const pillCls = STATUS_PILL[status]
              const periodHours = period === 'week' ? member.weekHours : member.monthHours
              const hasPeriodData = periodHours !== undefined

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
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={`${period}-${periodHours ?? member.totalActiveHours ?? member.subtaskCount}`}
                          initial={{ opacity: 0, y: -3 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 3 }}
                          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1], delay: i * 0.04 }}
                          className="text-2xl font-bold leading-none tabular-nums"
                          style={{ color: cfg.color }}
                        >
                          {hasPeriodData ? (
                            <>
                              {periodHours!.toFixed(1)}
                              <span className="text-sm font-medium text-muted-foreground">h</span>
                            </>
                          ) : member.totalActiveHours !== undefined ? (
                            <>
                              {member.totalActiveHours.toFixed(1)}
                              <span className="text-sm font-medium text-muted-foreground">h</span>
                            </>
                          ) : (
                            <>
                              {member.subtaskCount}
                              <span className="text-sm font-medium text-muted-foreground">/{member.capacity}</span>
                            </>
                          )}
                        </motion.span>
                      </AnimatePresence>
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

                    <MemberCardTrack member={member} period={period} memberIndex={i} clientHoursMap={clientHours} />

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
