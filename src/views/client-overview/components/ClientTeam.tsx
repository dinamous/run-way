import { Users } from 'lucide-react'
import { MotionItem } from '@/components/ui'
import type { ClientMember } from '../hooks/useClientOverviewData'

interface ClientTeamProps {
  members: ClientMember[]
  loading: boolean
}

type LoadStatus = 'available' | 'busy' | 'overloaded'

function getLoadStatus(subtaskCount: number, capacity: number): LoadStatus {
  const ratio = subtaskCount / capacity
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

function MemberAvatar({ member }: { member: ClientMember }) {
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

function CapacityTrack({
  subtaskCount,
  capacity,
  status,
}: {
  subtaskCount: number
  capacity: number
  status: LoadStatus
}) {
  const cfg = STATUS_CONFIG[status]
  const isOver = subtaskCount > capacity
  const segments = capacity
  const filled = Math.min(subtaskCount, capacity)
  const overCount = isOver ? subtaskCount - capacity : 0

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-[3px] flex-1">
        {Array.from({ length: segments }).map((_, i) => {
          const active = i < filled
          return (
            <div
              key={i}
              className="h-[8px] flex-1 rounded-[2px] transition-all duration-300"
              style={{
                backgroundColor: active ? cfg.trackFill : 'oklch(0.145 0 0 / 0.10)',
                transitionDelay: `${i * 20}ms`,
              }}
            />
          )
        })}
        {overCount > 0 &&
          Array.from({ length: Math.min(overCount, 6) }).map((_, i) => (
            <div
              key={`over-${i}`}
              className="h-[8px] w-[8px] shrink-0 rounded-[2px] transition-all duration-300"
              style={{
                backgroundColor: 'oklch(0.60 0.22 20)',
                transitionDelay: `${(segments + i) * 20}ms`,
              }}
            />
          ))}
        {overCount > 6 && (
          <span className="text-[9px] font-bold tabular-nums self-center text-[oklch(0.50_0.20_20)] ml-0.5">
            +{overCount - 6}
          </span>
        )}
      </div>
    </div>
  )
}

export function ClientTeam({ members, loading }: ClientTeamProps) {
  if (loading) {
    return (
      <div className="overview-card rounded-xl p-6 flex flex-col gap-5">
        <div className="h-4 w-20 animate-pulse rounded bg-muted/50" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

  return (
    <div className="overview-card rounded-xl p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Equipe</h3>
        {members.length > 0 && (
          <span className="text-xs tabular-nums text-muted-foreground">{members.length} membros</span>
        )}
      </div>

      {members.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
          <Users className="h-6 w-6 opacity-40" />
          <p className="text-sm">Nenhum membro alocado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {members.map((member, i) => {
            const status = getLoadStatus(member.subtaskCount, member.capacity)
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
                    <p className="truncate text-sm font-semibold text-foreground leading-tight">
                      {member.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                      {member.role}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none ${pillCls}`}
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
                      className="text-2xl font-bold tabular-nums leading-none"
                      style={{ color: cfg.color }}
                    >
                      {member.subtaskCount}
                      <span className="text-sm font-medium text-muted-foreground">
                        /{member.capacity}
                      </span>
                    </span>
                    {member.lateCount > 0 && (
                      <span className="text-xs font-semibold tabular-nums text-[oklch(0.50_0.20_20)]">
                        {member.lateCount} atrasad{member.lateCount === 1 ? 'a' : 'as'}
                      </span>
                    )}
                  </div>

                  <CapacityTrack
                    subtaskCount={member.subtaskCount}
                    capacity={member.capacity}
                    status={status}
                  />
                </div>
              </MotionItem>
            )
          })}
        </div>
      )}
    </div>
  )
}
