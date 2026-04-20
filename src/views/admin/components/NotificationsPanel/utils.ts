import { UserCheck, UserX, ShieldCheck, ShieldOff, Megaphone, ClipboardList, MessageSquare } from 'lucide-react'
import React from 'react'
import type { Notification } from '@/types/notification'

export function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return '' }
}

export function getNotificationTypeIcon(type: string): React.ReactNode {
  switch (type) {
    case 'step_assigned': return React.createElement(UserCheck, { className: 'w-4 h-4 text-emerald-500' })
    case 'step_unassigned': return React.createElement(UserX, { className: 'w-4 h-4 text-orange-500' })
    case 'role_changed': return React.createElement(ShieldCheck, { className: 'w-4 h-4 text-violet-500' })
    case 'client_access_granted': return React.createElement(ShieldCheck, { className: 'w-4 h-4 text-blue-500' })
    case 'client_access_revoked': return React.createElement(ShieldOff, { className: 'w-4 h-4 text-destructive' })
    case 'admin_broadcast': return React.createElement(Megaphone, { className: 'w-4 h-4 text-primary' })
    case 'manual': return React.createElement(MessageSquare, { className: 'w-4 h-4 text-muted-foreground' })
    default: return React.createElement(ClipboardList, { className: 'w-4 h-4 text-muted-foreground' })
  }
}

const TYPE_LABELS: Record<string, string> = {
  step_assigned: 'Etapa atribuída',
  step_unassigned: 'Etapa removida',
  role_changed: 'Cargo alterado',
  client_access_granted: 'Acesso concedido',
  client_access_revoked: 'Acesso revogado',
  admin_broadcast: 'Broadcast',
  manual: 'Manual',
}

export function getNotificationTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type
}

function isToday(d: string) { return new Date(d).toDateString() === new Date().toDateString() }
function isYesterday(d: string) {
  const y = new Date(); y.setDate(y.getDate() - 1)
  return new Date(d).toDateString() === y.toDateString()
}
function isLast7Days(d: string) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
  return diff >= 1 && diff <= 7
}

export function groupNotifications(notifications: Notification[]) {
  const g = { today: [] as Notification[], yesterday: [] as Notification[], last7Days: [] as Notification[], older: [] as Notification[] }
  for (const n of notifications) {
    if (isToday(n.created_at)) g.today.push(n)
    else if (isYesterday(n.created_at)) g.yesterday.push(n)
    else if (isLast7Days(n.created_at)) g.last7Days.push(n)
    else g.older.push(n)
  }
  return g
}
