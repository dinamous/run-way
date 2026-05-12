import { supabase } from '@/lib/supabase'
import type { Task, Subtask, SubtaskStatus } from '@/lib/steps'
import type { Member } from '@/hooks/infra/useSupabase'
import type { DbTaskRow } from '@/types/db'
import { DbTaskRowSchema } from '@/lib/validators'

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const queryKeys = {
  tasks: (clientId: string | null, isAdmin: boolean) =>
    ['tasks', clientId ?? 'all', isAdmin] as const,
  members: (clientId: string | null | undefined) =>
    ['members', clientId ?? 'all'] as const,
}

// ─── Task Queries ──────────────────────────────────────────────────────────────

function dbRowToTask(row: DbTaskRow): Task {
  const parsed = DbTaskRowSchema.parse(row)
  const subtasks: Subtask[] = parsed.task_subtasks
    .sort((a, b) => a.subtask_order - b.subtask_order)
    .map(s => ({
      id: s.id,
      title: s.title,
      status: s.status as SubtaskStatus,
      order: s.subtask_order,
      active: s.active,
      start: s.start_date ?? '',
      end: s.end_date ?? '',
      assignees: s.subtask_assignees.map(a => a.member_id),
    }))

  return {
    id: parsed.id,
    title: parsed.title,
    clickupLink: parsed.clickup_link ?? undefined,
    clientId: parsed.client_id ?? undefined,
    status: {
      blocked: parsed.blocked,
      blockedAt: parsed.blocked_at ?? undefined,
    },
    createdAt: parsed.created_at,
    concludedAt: parsed.concluded_at ?? undefined,
    concludedBy: parsed.concluded_by ?? undefined,
    subtasks,
  }
}

const TASK_SELECT = `
  id, title, clickup_link, blocked, blocked_at, created_at, client_id, concluded_at, concluded_by,
  task_subtasks (
    id, title, status, subtask_order, active, start_date, end_date,
    subtask_assignees ( member_id )
  )
` as const

export async function fetchTasksFromDb(
  clientId: string | null,
  isAdmin: boolean
): Promise<Task[]> {
  if (clientId === null) {
    if (!isAdmin) return []
    const { data, error } = await supabase
      .from('tasks')
      .select(TASK_SELECT)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map(dbRowToTask)
  }

  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map(dbRowToTask)
}

// ─── Member Queries ────────────────────────────────────────────────────────────

export async function fetchMembersFromDb(
  clientId: string | null | undefined
): Promise<Member[]> {
  if (clientId === undefined) return []

  if (clientId === null) {
    const { data, error } = await supabase
      .from('members')
      .select('id, name, role, avatar, avatar_url, email, auth_user_id, access_role')
      .order('name')
    if (error) throw new Error(error.message)
    return (data ?? []).map(m => ({
      ...m,
      access_role: m.access_role as Member['access_role']
    }))
  }

  const ucResult = await supabase
    .from('user_clients')
    .select('user_id')
    .eq('client_id', clientId)

  if (ucResult.error) throw new Error(ucResult.error.message)

  const allIds = (ucResult.data ?? []).map(uc => uc.user_id)
  if (allIds.length === 0) return []

  const { data, error } = await supabase
    .from('members')
    .select('id, name, role, avatar, avatar_url, email, auth_user_id, access_role')
    .in('id', allIds)
    .order('name')

  if (error) throw new Error(error.message)
  return (data ?? []).map(m => ({
    ...m,
    access_role: m.access_role as Member['access_role']
  }))
}
