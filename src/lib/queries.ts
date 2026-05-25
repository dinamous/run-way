import { supabase } from '@/lib/supabase'
import type { SubtaskProgressStatus, Task, Subtask, SubtaskStatus } from '@/lib/steps'
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

const WORKLOAD_TASK_SELECT = `
  id, title, priority_order, blocked, blocked_at, created_at, client_id, concluded_at, concluded_by,
  expected_hours, complexity, task_type, due_date, started_at,
  clients ( id, name ),
  task_subtasks (
    id, title, status, progress_status, subtask_order, active, start_date, end_date,
    subtask_assignees ( member_id )
  )
` as const

type WorkloadTaskRow = {
  id: string
  title: string
  priority_order: number
  blocked: boolean
  blocked_at: string | null
  created_at: string
  client_id: string | null
  concluded_at: string | null
  concluded_by: string | null
  expected_hours: number | null
  complexity: string | null
  task_type: string | null
  due_date: string | null
  started_at: string | null
  clients: { id: string; name: string } | null
  task_subtasks: Array<{
    id: string
    title: string
    status: string
    progress_status: string
    subtask_order: number
    active: boolean
    start_date: string | null
    end_date: string | null
    subtask_assignees: Array<{ member_id: string }>
  }>
}

function workloadRowToTask(row: WorkloadTaskRow): Task {
  const subtasks: Subtask[] = row.task_subtasks
    .sort((a, b) => a.subtask_order - b.subtask_order)
    .map(s => ({
      id: s.id,
      title: s.title,
      status: s.status as SubtaskStatus,
      progressStatus: s.progress_status as SubtaskProgressStatus,
      order: s.subtask_order,
      active: s.active,
      start: s.start_date ?? '',
      end: s.end_date ?? '',
      assignees: s.subtask_assignees.map(a => a.member_id),
    }))

  return {
    id: row.id,
    title: row.title,
    clientId: row.client_id ?? undefined,
    clientName: row.clients?.name ?? undefined,
    priorityOrder: row.priority_order,
    status: { blocked: row.blocked, blockedAt: row.blocked_at ?? undefined },
    createdAt: row.created_at,
    concludedAt: row.concluded_at ?? undefined,
    concludedBy: row.concluded_by ?? undefined,
    subtasks,
    expectedHours: row.expected_hours ?? undefined,
    complexity: row.complexity as Task['complexity'] ?? undefined,
    taskType: row.task_type as Task['taskType'] ?? undefined,
    dueDate: row.due_date ?? undefined,
    startedAt: row.started_at ?? undefined,
  }
}

function dbRowToTask(row: DbTaskRow): Task {
  const parsed = DbTaskRowSchema.parse(row)
  const subtasks: Subtask[] = parsed.task_subtasks
    .sort((a, b) => a.subtask_order - b.subtask_order)
    .map(s => ({
      id: s.id,
      title: s.title,
      status: s.status as SubtaskStatus,
      progressStatus: s.progress_status as SubtaskProgressStatus,
      order: s.subtask_order,
      active: s.active,
      start: s.start_date ?? '',
      end: s.end_date ?? '',
      assignees: s.subtask_assignees.map(a => a.member_id),
    }))

  return {
    id: parsed.id,
    title: parsed.title,
    description: parsed.description ?? undefined,
    clickupLink: parsed.clickup_link ?? undefined,
    clientId: parsed.client_id ?? undefined,
    priorityOrder: parsed.priority_order,
    status: {
      blocked: parsed.blocked,
      blockedAt: parsed.blocked_at ?? undefined,
    },
    createdAt: parsed.created_at,
    concludedAt: parsed.concluded_at ?? undefined,
    concludedBy: parsed.concluded_by ?? undefined,
    subtasks,
    expectedHours: parsed.expected_hours ?? undefined,
    complexity: parsed.complexity ?? undefined,
    taskType: parsed.task_type ?? undefined,
    dueDate: parsed.due_date ?? undefined,
    startedAt: parsed.started_at ?? undefined,
  }
}

const TASK_SELECT = `
  id, title, description, clickup_link, priority_order, blocked, blocked_at, created_at, client_id, concluded_at, concluded_by,
  expected_hours, complexity, task_type, due_date, started_at,
  task_subtasks (
    id, title, status, progress_status, subtask_order, active, start_date, end_date,
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
      .order('priority_order', { ascending: true })
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map(dbRowToTask)
  }

  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .eq('client_id', clientId)
    .order('priority_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map(dbRowToTask)
}

// ─── Throughput Queries ────────────────────────────────────────────────────────

const CONCLUDED_TASK_SELECT = `
  id, concluded_at, expected_hours, client_id,
  task_subtasks ( subtask_assignees ( member_id ) )
` as const

export interface ConcludedTaskRow {
  id: string
  concludedAt: string
  expectedHours: number | null
  clientId: string | null
  memberIds: string[]
}

export async function fetchConcludedTasksSince(
  since: string,
  clientIds: string[] | null,
  isAdmin: boolean
): Promise<ConcludedTaskRow[]> {
  if (!isAdmin && (!clientIds || clientIds.length === 0)) return []

  let query = supabase
    .from('tasks')
    .select(CONCLUDED_TASK_SELECT)
    .not('concluded_at', 'is', null)
    .gte('concluded_at', since)

  if (!isAdmin && clientIds && clientIds.length > 0) {
    query = query.in('client_id', clientIds)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  type RawRow = {
    id: string
    concluded_at: string
    expected_hours: number | null
    client_id: string | null
    task_subtasks: Array<{ subtask_assignees: Array<{ member_id: string }> }>
  }

  return (data as RawRow[] ?? []).map(row => ({
    id: row.id,
    concludedAt: row.concluded_at,
    expectedHours: row.expected_hours,
    clientId: row.client_id,
    memberIds: Array.from(
      new Set(row.task_subtasks.flatMap(s => s.subtask_assignees.map(a => a.member_id)))
    ),
  }))
}

export async function fetchActiveTasksWithHours(
  clientIds: string[] | null,
  isAdmin: boolean
): Promise<Task[]> {
  if (!isAdmin && (!clientIds || clientIds.length === 0)) return []

  let query = supabase
    .from('tasks')
    .select(WORKLOAD_TASK_SELECT)
    .is('concluded_at', null)

  if (!isAdmin && clientIds && clientIds.length > 0) {
    query = query.in('client_id', clientIds)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data as unknown as WorkloadTaskRow[] ?? []).map(workloadRowToTask)
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

  const { data, error } = await supabase
    .from('user_clients')
    .select('members (id, name, role, avatar, avatar_url, email, auth_user_id, access_role)')
    .eq('client_id', clientId)

  if (error) throw new Error(error.message)

  const members = (data ?? [])
    .map(uc => uc.members)
    .filter((m): m is NonNullable<typeof m> => m !== null)

  return members
    .map(m => ({ ...m, access_role: m.access_role as Member['access_role'] }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
