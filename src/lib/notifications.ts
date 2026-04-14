import { supabase, supabaseAdmin } from './supabase'
import type { DbNotificationRow, Notification } from '@/types/notification'

export async function fetchNotifications(userId: string, clientIds?: string[]) {
  // Notificações diretas ao usuário OU broadcasts de qualquer cliente que ele acessa
  let orFilter = `user_id.eq.${userId}`

  if (clientIds && clientIds.length > 0) {
    const clientFilter = clientIds
      .map((id) => `and(user_id.is.null,client_id.eq.${id})`)
      .join(',')
    orFilter = `user_id.eq.${userId},${clientFilter}`
  }

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .or(orFilter)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('fetchNotifications error:', error)
    throw error
  }
  return data ? data.map(mapDbToNotification) : []
}

export async function markAsRead(id: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id)

  if (error) throw error
}

export async function markAllAsRead(userId: string, clientIds?: string[]) {
  let orFilter = `user_id.eq.${userId}`

  if (clientIds && clientIds.length > 0) {
    const clientFilter = clientIds
      .map((id) => `and(user_id.is.null,client_id.eq.${id})`)
      .join(',')
    orFilter = `user_id.eq.${userId},${clientFilter}`
  }

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('read', false)
    .or(orFilter)

  if (error) throw error
}

export async function fetchAllNotifications() {
  if (!supabaseAdmin) {
    throw new Error('Admin não configurado')
  }

  const { data, error } = await supabaseAdmin
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw error
  return data ? data.map(mapDbToNotification) : []
}

export async function createNotification(
  title: string,
  message: string,
  userId?: string,
  clientId?: string,
  type: string = 'admin_broadcast',
  metadata?: Record<string, string> | null
) {
  if (!supabaseAdmin) {
    throw new Error('Admin não configurado')
  }

  const { error } = await supabaseAdmin
    .from('notifications')
    .insert({
      user_id: userId ?? null,
      client_id: clientId ?? null,
      title,
      message,
      type,
      metadata: metadata ?? null,
    })

  if (error) throw error
}

export async function createNotificationForClient(
  clientId: string,
  title: string,
  message: string,
  type: string = 'admin_broadcast'
) {
  if (!supabaseAdmin) {
    throw new Error('Admin não configurado')
  }

  const { error } = await supabaseAdmin
    .from('notifications')
    .insert({
      client_id: clientId,
      user_id: null,
      title,
      message,
      type,
    })

  if (error) throw error
}

export function resolveNotificationRoute(notification: Notification): string | null {
  if (!notification.metadata) return null

  switch (notification.type) {
    case 'step_assigned':
    case 'step_unassigned': {
      const stepId = notification.metadata?.step_id
      const taskTitle = notification.metadata?.task_title
      if (stepId) {
        return `/dashboard?step=${stepId}`
      }
      if (taskTitle) {
        return `/dashboard?task=${encodeURIComponent(taskTitle)}`
      }
      return '/dashboard'
    }

    case 'role_changed':
      return '/profile'

    case 'task_assigned':
      return '/dashboard'

    case 'client_access_granted':
    case 'client_access_revoked':
      return '/clients'

    case 'admin_broadcast':
    default:
      return '/dashboard'
  }
}

function mapDbToNotification(row: DbNotificationRow): Notification {
  return {
    id: row.id,
    user_id: row.user_id,
    client_id: row.client_id,
    type: row.type,
    title: row.title,
    message: row.message,
    entity: row.entity,
    entity_id: row.entity_id,
    metadata: row.metadata ?? undefined,
    read: row.read,
    created_at: row.created_at,
  }
}