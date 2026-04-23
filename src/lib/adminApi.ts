import { supabase } from './supabase'
import type { DbClientRow, DbAuditLogRow } from '@/types/db'
import type { Member } from '@/hooks/useSupabase'
import type { Notification } from '@/types/notification'
import type { AuditFilters } from '@/store/useAdminStore'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

type InvokeOptions = { method?: string; body?: unknown; query?: Record<string, string> }

async function invoke<T>(fn: string, options?: InvokeOptions): Promise<T> {
  const { query, body, method = 'GET' } = options ?? {}
  const qs = query && Object.keys(query).length > 0
    ? '?' + new URLSearchParams(query).toString()
    : ''

  const session = await supabase.auth.getSession()
  const token = session.data.session?.access_token

  const res = await fetch(`${supabaseUrl}/functions/v1/${fn}${qs}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message ?? res.statusText)
  }

  return res.json() as Promise<T>
}

function q(params: Record<string, string | undefined>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [k, v] of Object.entries(params)) if (v !== undefined) result[k] = v
  return result
}

// ── clients ──────────────────────────────────────────────────────────────────

export async function adminFetchClients(): Promise<DbClientRow[]> {
  return invoke<DbClientRow[]>('admin-clients')
}

export async function adminCreateClient(name: string, slug: string): Promise<void> {
  await invoke('admin-clients', { method: 'POST', body: { name, slug } })
}

export async function adminUpdateClient(id: string, name: string, slug: string): Promise<void> {
  await invoke('admin-clients', { method: 'PUT', query: q({ id }), body: { name, slug } })
}

export async function adminDeleteClient(id: string, name: string, actorUserId?: string): Promise<void> {
  await invoke('admin-clients', { method: 'DELETE', query: q({ id }), body: { name, actorUserId } })
}

// ── members ───────────────────────────────────────────────────────────────────

export async function adminFetchMembers(): Promise<Member[]> {
  return invoke<Member[]>('admin-members')
}

export interface CreateMemberPayload {
  name: string
  role: string
  authUserId?: string | null
  accessRole?: 'admin' | 'user'
  clientIds?: string[]
  email?: string | null
  avatarUrl?: string | null
}

export async function adminCreateMember(payload: CreateMemberPayload): Promise<Member> {
  return invoke<Member>('admin-members', { method: 'POST', body: payload })
}

export async function adminUpdateMember(id: string, name: string, role: string, email?: string | null): Promise<void> {
  await invoke('admin-members', { method: 'PUT', query: q({ id }), body: { name, role, email } })
}

export async function adminDeactivateMember(id: string): Promise<{ deactivated_at: string }> {
  return invoke('admin-members', { method: 'PUT', query: q({ id, action: 'deactivate' }), body: {} })
}

export async function adminReactivateMember(id: string): Promise<void> {
  await invoke('admin-members', { method: 'PUT', query: q({ id, action: 'reactivate' }), body: {} })
}

export async function adminSetMemberAuthId(id: string, authUserId: string | null, avatarUrl?: string | null): Promise<void> {
  await invoke('admin-members', { method: 'PUT', query: q({ id, action: 'setAuthId' }), body: { authUserId, avatarUrl } })
}

// ── users / auth ──────────────────────────────────────────────────────────────

export interface PendingAuthUser {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  lastSignInAt: string | null
}

export interface GoogleUser {
  id: string
  email: string
  avatarUrl: string | null
  name: string
}

export async function adminListPendingUsers(): Promise<PendingAuthUser[]> {
  return invoke<PendingAuthUser[]>('admin-users', { query: q({ action: 'listPending' }) })
}

export async function adminListAuthUsers(search?: string): Promise<GoogleUser[]> {
  return invoke<GoogleUser[]>('admin-users', { query: q({ action: 'listAuthUsers', search }) })
}

export async function adminFetchUserClientsMap(): Promise<Record<string, string[]>> {
  return invoke<Record<string, string[]>>('admin-users', { query: q({ action: 'userClientsMap' }) })
}

export async function adminFetchAuditLogs(filters: AuditFilters = {}): Promise<DbAuditLogRow[]> {
  return invoke<DbAuditLogRow[]>('admin-users', { query: q({ action: 'auditLogs', ...filters }) })
}

export async function adminLinkUserToClient(userId: string, clientId: string): Promise<void> {
  await invoke('admin-users', { method: 'POST', query: q({ action: 'linkUser' }), body: { userId, clientId } })
}

export async function adminUnlinkUserFromClient(userId: string, clientId: string): Promise<void> {
  await invoke('admin-users', { method: 'POST', query: q({ action: 'unlinkUser' }), body: { userId, clientId } })
}

export async function adminSetUserRole(userId: string, role: 'admin' | 'user'): Promise<void> {
  await invoke('admin-users', { method: 'POST', query: q({ action: 'setRole' }), body: { userId, role } })
}

// ── notifications ─────────────────────────────────────────────────────────────

export async function adminFetchAllNotifications(): Promise<Notification[]> {
  return invoke<Notification[]>('admin-notifications')
}

export async function adminCreateNotification(
  title: string,
  message: string,
  userId?: string,
  clientId?: string,
  type = 'admin_broadcast',
  metadata?: Record<string, string> | null,
): Promise<void> {
  await invoke('admin-notifications', {
    method: 'POST',
    body: { title, message, userId, clientId, type, metadata },
  })
}

export async function adminCreateNotificationForAll(
  clientIds: string[],
  title: string,
  message: string,
  type = 'admin_broadcast',
): Promise<void> {
  const rows = clientIds.map((clientId) => ({ client_id: clientId, user_id: null, title, message, type }))
  await invoke('admin-notifications', { method: 'POST', body: { rows } })
}
