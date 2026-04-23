export type NotificationType =
  | 'step_assigned'
  | 'step_unassigned'
  | 'role_changed'
  | 'task_assigned'
  | 'client_access_granted'
  | 'client_access_revoked'
  | 'admin_broadcast'
  | 'new_member'

export interface Notification {
  id: string
  user_id?: string | null
  client_id?: string | null
  type: NotificationType
  title: string
  message: string
  entity?: string | null
  entity_id?: string | null
  metadata?: Record<string, string>
  read: boolean
  created_at: string
}

export interface DbNotificationRow {
  id: string
  user_id: string | null
  client_id: string | null
  type: NotificationType
  title: string
  message: string
  entity: string | null
  entity_id: string | null
  metadata: Record<string, string> | null
  read: boolean
  created_at: string
}