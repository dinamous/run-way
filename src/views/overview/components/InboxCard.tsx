import { useMemo } from 'react'
import {
  Bell,
  UserCheck,
  UserMinus,
  UserPlus,
  Shield,
  Building2,
  Megaphone,
  CheckCircle2,
} from 'lucide-react'
import type { Notification, NotificationType } from '@/types/notification'

interface InboxCardProps {
  notifications: Notification[]
  loading: boolean
  onMarkAsRead: (id: string) => void
}

const TYPE_ICONS: Record<NotificationType, React.ElementType> = {
  step_assigned: UserCheck,
  task_assigned: UserCheck,
  step_unassigned: UserMinus,
  role_changed: Shield,
  client_access_granted: Building2,
  client_access_revoked: Building2,
  admin_broadcast: Megaphone,
  new_member: UserPlus,
}

function formatTime(dateStr: string): string {
  const then = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - then.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)

  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `${diffMin}min`
  if (diffHour < 24) return `${diffHour}h`

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (then.toDateString() === yesterday.toDateString()) return 'ontem'

  return then.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function InboxCard({ notifications, loading, onMarkAsRead }: InboxCardProps) {
  const unread = useMemo(
    () =>
      notifications
        .filter((n) => !n.read)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 6),
    [notifications]
  )

  if (loading) {
    return (
      <div className="overview-card p-6 flex flex-col gap-4 h-full">
        <div className="h-4 w-24 animate-pulse rounded bg-muted/50" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="h-6 w-6 shrink-0 animate-pulse rounded-md bg-muted/50" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-3/4 animate-pulse rounded bg-muted/50" />
                <div className="h-3 w-full animate-pulse rounded bg-muted/40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="overview-card p-6 flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Notificações</h3>
        {unread.length > 0 && (
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-foreground px-1.5 text-[11px] font-semibold text-background">
            {unread.length}
          </span>
        )}
      </div>

      {unread.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
          <CheckCircle2 className="h-7 w-7 opacity-40" />
          <p className="text-sm">Tudo em dia</p>
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {unread.map((n, i) => {
            const Icon = TYPE_ICONS[n.type] ?? Bell
            return (
              <button
                key={n.id}
                onClick={() => onMarkAsRead(n.id)}
                className="overview-item-enter group flex items-start gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-foreground/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{ animationDelay: `${i * 35}ms` }}
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-foreground/[0.06] transition-colors duration-150 group-hover:bg-foreground/[0.10]">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground leading-snug truncate">
                    {n.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2 leading-snug">
                    {n.message}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground/50 whitespace-nowrap pt-0.5">
                  {formatTime(n.created_at)}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
