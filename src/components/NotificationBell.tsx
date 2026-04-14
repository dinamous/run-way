import { useState, useRef, useEffect } from 'react'
import { Bell, Check, Loader2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui'
import type { Notification } from '@/types/notification'

interface NotificationBellProps {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  onMarkAsRead: (notificationId: string) => void
  onMarkAllAsRead: () => void
  onNotificationClick: (notification: Notification) => void
  reload?: () => void
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'agora'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`

    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  } catch {
    return ''
  }
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onClick,
}: {
  notification: Notification
  onMarkAsRead: (id: string) => void
  onClick: (n: Notification) => void
}) {
  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id)
    }
    onClick(notification)
  }

  return (
    <DropdownMenuItem
      onSelect={(e) => {
        e.preventDefault()
        handleClick()
      }}
      className="flex items-start justify-between gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 rounded-md mx-1"
    >
      <div className="flex flex-col items-start gap-1 flex-1 min-w-0">
        <div className="flex items-center gap-2 w-full">
          {!notification.read && (
            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-0.5" />
          )}
          <span
            className={`text-sm font-medium truncate ${
              !notification.read ? 'font-semibold' : ''
            }`}
          >
            {notification.title}
          </span>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 pl-4">
          {notification.message}
        </p>
      </div>
      <span className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">
        {formatDate(notification.created_at)}
      </span>
    </DropdownMenuItem>
  )
}

export function NotificationBell({
  notifications,
  unreadCount,
  loading,
  onMarkAsRead,
  onMarkAllAsRead,
  onNotificationClick,
  reload,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const initialUnread = useRef(unreadCount)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (reload) {
      pollingRef.current = setInterval(() => {
        reload()
      }, 30000)

      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current)
        }
      }
    }
  }, [reload])

  useEffect(() => {
    if (unreadCount > initialUnread.current && open) {
      const audio = new Audio('/notification.mp3')
      audio.volume = 0.3
      audio.play().catch(() => {})
    }
  }, [unreadCount, open])

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Notificações"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Bell className="w-4 h-4" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 text-[10px] font-bold bg-primary text-primary-foreground rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-3 py-2">
          <DropdownMenuLabel>Notificações</DropdownMenuLabel>
          {unreadCount > 0 && (
            <button
              onClick={(e) => {
                e.preventDefault()
                onMarkAllAsRead()
              }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              Marcar todas como lida
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="flex-1 overflow-y-auto max-h-72 divide-y divide-border/50">
          {notifications.length === 0 ? (
            <div className="px-3 py-8 text-center text-muted-foreground text-sm">
              Nenhuma notificação
            </div>
          ) : (
            <>
              {notifications.slice(0, 10).map((notification) => (
                <div key={notification.id}>
                  <NotificationItem
                    notification={notification}
                    onMarkAsRead={onMarkAsRead}
                    onClick={onNotificationClick}
                  />
                </div>
              ))}
              {notifications.length > 10 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="justify-center text-sm text-muted-foreground">
                    +{notifications.length - 10} mais notificações
                  </DropdownMenuItem>
                </>
              )}
            </>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}