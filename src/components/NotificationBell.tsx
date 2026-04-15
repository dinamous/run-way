import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Bell, CheckCheck, User, Users } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui'
import { useNotificationPolling } from '@/hooks/useNotificationPolling'
import type { Notification } from '@/types/notification'

interface NotificationBellProps {
  notifications: Notification[]
  unreadCount: number
  loading?: boolean
  onMarkAsRead: (notificationId: string) => void
  onMarkAllAsRead: () => void
  onNotificationClick: (notification: Notification) => void
  reload?: () => void
  selectedClientId?: string | null
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

function getDateGroup(dateString: string): { label: string; key: string } {
  const date = new Date(dateString)
  date.setHours(0, 0, 0, 0)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)

  if (diffDays === 0) return { label: 'Hoje', key: 'today' }
  if (diffDays === 1) return { label: 'Ontem', key: 'yesterday' }
  if (diffDays < 7) return { label: 'Últimos 7 dias', key: 'week' }
  return { label: 'Mais antigas', key: 'older' }
}

function groupNotificationsByDate(notifications: Notification[]): Map<string, Notification[]> {
  const groups = new Map<string, Notification[]>()

  for (const n of notifications) {
    const { key } = getDateGroup(n.created_at)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(n)
  }

  const order = ['today', 'yesterday', 'week', 'older']
  const sorted = new Map<string, Notification[]>()
  for (const key of order) {
    if (groups.has(key)) sorted.set(key, groups.get(key)!)
  }
  return sorted
}

function playNotificationSound() {
  const audio = new Audio('/notification.mp3')
  audio.volume = 0.3
  audio.play().catch(() => {})
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
  const isPersonal = !!notification.user_id

  const handleClick = () => {
    if (!notification.read) onMarkAsRead(notification.id)
    onClick(notification)
  }

  return (
    <DropdownMenuItem
      onSelect={(e) => {
        e.preventDefault()
        handleClick()
      }}
      className={`group flex items-start gap-3 px-3 py-3 cursor-pointer rounded-md mx-1 transition-colors ${
        notification.read ? 'hover:bg-muted/40' : 'bg-primary/5 hover:bg-primary/10'
      }`}
    >
      {/* Ícone de audiência */}
      <div className={`mt-0.5 flex-shrink-0 p-1.5 rounded-full ${
        isPersonal
          ? 'bg-blue-200/80 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
          : 'bg-muted text-muted-foreground'
      }`}>
        {isPersonal ? <User className="w-3 h-3" /> : <Users className="w-3 h-3" />}
      </div>

      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span className={`text-sm leading-snug ${!notification.read ? 'font-semibold' : 'text-foreground/80'}`}>
            {notification.title}
          </span>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-0.5 flex-shrink-0">
            {formatDate(notification.created_at)}
          </span>
        </div>

        <p className="text-xs text-muted-foreground line-clamp-2">
          {notification.message}
        </p>

        <span className={`text-[10px] mt-0.5 font-medium ${
          isPersonal ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'
        }`}>
          {isPersonal ? 'Para você' : 'Para todos do cliente'}
        </span>
      </div>

      {!notification.read && (
        <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
      )}
    </DropdownMenuItem>
  )
}

const GROUP_LABELS: Record<string, string> = {
  today: 'Hoje',
  yesterday: 'Ontem',
  week: 'Últimos 7 dias',
  older: 'Mais antigas',
}
const GROUP_ORDER = ['today', 'yesterday', 'week', 'older']

export function NotificationBell({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onNotificationClick,
  reload,
  selectedClientId,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'current'>('all')
  const prevIdsRef = useRef<Set<string>>(new Set())
  const initialOpenDone = useRef(false)
  const hasInitiallyLoaded = useRef(false)

  const handleReload = useCallback(() => reload?.(), [reload])

  useNotificationPolling({ enabled: !!reload, interval: 15000, fn: handleReload })

  // Reload na primeira abertura
  useEffect(() => {
    if (open && !initialOpenDone.current && reload) {
      initialOpenDone.current = true
      reload()
    }
  }, [open, reload])

  // Detecta novas notificações — toca som (toast já está no useNotifications via realtime)
  useEffect(() => {
    if (!hasInitiallyLoaded.current) {
      hasInitiallyLoaded.current = true
      prevIdsRef.current = new Set(notifications.map((n) => n.id))
      return
    }

    const newIds = new Set<string>()
    let hasNew = false

    for (const n of notifications) {
      newIds.add(n.id)
      if (!prevIdsRef.current.has(n.id)) {
        hasNew = true
      }
    }

    if (hasNew) playNotificationSound()

    prevIdsRef.current = newIds
  }, [notifications])

  const filteredNotifications = useMemo(() => {
    if (activeTab === 'current' && selectedClientId) {
      return notifications.filter((n) => n.client_id === selectedClientId)
    }
    return notifications
  }, [notifications, activeTab, selectedClientId])

  const groupedNotifications = useMemo(
    () => groupNotificationsByDate(filteredNotifications),
    [filteredNotifications]
  )

  const unreadInTab = filteredNotifications.filter((n) => !n.read).length

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 text-[10px] font-bold bg-primary text-primary-foreground rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Notificações</span>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>

          {unreadInTab > 0 && (
            <button
              onClick={(e) => {
                e.preventDefault()
                onMarkAllAsRead()
              }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Marcar como lidas
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="px-3 pb-2">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'current')}>
            <TabsList variant="pills" className="h-8 w-full p-1">
              <TabsTrigger
                value="all"
                className="flex-1 text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Todas
              </TabsTrigger>
              <TabsTrigger
                value="current"
                className="flex-1 text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Cliente atual
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <DropdownMenuSeparator className="m-0" />

        {/* Lista */}
        <div className="overflow-y-auto max-h-80">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
              <Bell className="w-6 h-6 opacity-30" />
              <span className="text-sm">Nenhuma notificação</span>
            </div>
          ) : (
            <div className="py-1">
              {GROUP_ORDER.map((groupKey) => {
                const items = groupedNotifications.get(groupKey)
                if (!items?.length) return null

                return (
                  <div key={groupKey}>
                    <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted/40 sticky top-0">
                      {GROUP_LABELS[groupKey]}
                    </div>
                    {items.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkAsRead={onMarkAsRead}
                        onClick={onNotificationClick}
                      />
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
