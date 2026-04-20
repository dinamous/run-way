import { Eye, EyeOff } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import type { Notification } from '@/types/notification'
import { formatDate, getNotificationTypeIcon, getNotificationTypeLabel } from './utils'

interface NotificationListProps {
  notifications: Notification[]
  onMarkAsRead: (id: string) => void
  onToggleRead?: (id: string) => void
}

export function NotificationList({ notifications, onMarkAsRead, onToggleRead }: NotificationListProps) {
  if (notifications.length === 0) return null
  return (
    <div className="border rounded-lg divide-y">
      {notifications.map((notif) => (
        <div key={notif.id} className={`px-4 py-3 flex items-start gap-3 ${notif.read ? 'opacity-50 bg-muted/20' : 'bg-background'}`}>
          <div className="flex-shrink-0 mt-0.5">{getNotificationTypeIcon(notif.type)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {!notif.read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
              <span className={`font-medium ${notif.read ? 'font-normal' : 'font-semibold'}`}>{notif.title}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                {getNotificationTypeLabel(notif.type)}
              </span>
              {notif.read && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <EyeOff className="w-3 h-3" /> lida
                </span>
              )}
            </div>
            <div className="text-sm text-muted-foreground mt-1 prose prose-sm dark:prose-invert max-w-none [&_p]:mb-0 [&_strong]:text-foreground">
              <ReactMarkdown remarkPlugins={[remarkBreaks]}>{notif.message}</ReactMarkdown>
            </div>
            <span className="text-xs text-muted-foreground">{formatDate(notif.created_at)}</span>
          </div>
          <div className="flex items-center gap-1">
            {!notif.read ? (
              <button onClick={() => onMarkAsRead(notif.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground" title="Marcar como lida">
                <Eye className="w-4 h-4" />
              </button>
            ) : onToggleRead ? (
              <button onClick={() => onToggleRead(notif.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground" title="Marcar como não lida">
                <EyeOff className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}
