import { Users } from 'lucide-react'
import type { ClientMember } from '../hooks/useClientOverviewData'

interface ClientMembersCardProps {
  members: ClientMember[]
  loading: boolean
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
        className="h-7 w-7 shrink-0 rounded-full object-cover"
      />
    )
  }

  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/[0.08] text-[10px] font-bold text-foreground">
      {initials}
    </div>
  )
}

export function ClientMembersCard({ members, loading }: ClientMembersCardProps) {
  if (loading) {
    return (
      <div className="overview-card rounded-xl p-6 flex flex-col gap-4">
        <div className="h-4 w-24 animate-pulse rounded bg-muted/50" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-muted/50" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-28 animate-pulse rounded bg-muted/50" />
                <div className="h-2.5 w-16 animate-pulse rounded bg-muted/40" />
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
        <h3 className="text-sm font-semibold text-foreground">Membros</h3>
        {members.length > 0 && (
          <span className="text-xs tabular-nums text-muted-foreground">{members.length}</span>
        )}
      </div>

      {members.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
          <Users className="h-6 w-6 opacity-40" />
          <p className="text-sm">Nenhum membro alocado</p>
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {members.map((member, i) => (
            <div
              key={member.id}
              className="overview-item-enter flex items-center gap-2.5 rounded-lg px-2 py-1.5"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <MemberAvatar member={member} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground leading-snug">
                  {member.name}
                </p>
                <p className="text-xs text-muted-foreground">{member.role}</p>
              </div>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {member.subtaskCount} {member.subtaskCount === 1 ? 'subtarefa' : 'subtarefas'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
