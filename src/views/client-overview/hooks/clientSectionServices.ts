import { supabase } from '@/lib/supabase'
import type { RawTask, RawMember } from './clientOverviewRawTypes'
import type { RawTaskWithClient } from './clientOverviewService'
import {
  buildTaskList,
  seedMemberMap,
  applyOtherClientWorkload,
  mergeClientMembers,
} from './clientOverviewWorkload'
import { buildTimeline, buildFocusTasks, calcKpis, buildHealth } from './clientOverviewTransformers'
import type {
  ClientOverviewKpis,
  ClientHealth,
  ClientTask,
  TimelineEntry,
  ClientMember,
} from './useClientOverviewData'

const TASK_SELECT = `
  id,
  title,
  clickup_link,
  concluded_at,
  created_at,
  client_id,
  clients (id, name),
  task_subtasks (
    id,
    title,
    start_date,
    end_date,
    status,
    subtask_assignees (
      member_id,
      members (
        id,
        name,
        role,
        avatar_url,
        capacity
      )
    )
  )
`

// ── Seção 1: Métricas (KPIs) ─────────────────────────────────────────────────

export interface MetricsData {
  kpis: ClientOverviewKpis
  health: ClientHealth
}

export async function fetchMetricsData(clientId: string, _signal: AbortSignal): Promise<MetricsData> {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  const today = new Date().toISOString().slice(0, 10)
  const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  const { taskList } = buildTaskList((data ?? []) as RawTask[], today, in7Days)
  const openTasks = taskList.filter((t) => !t.concludedAt)
  const concludedTasks = taskList.filter((t) => t.concludedAt)

  return {
    kpis: calcKpis(taskList, openTasks, concludedTasks),
    health: buildHealth(openTasks),
  }
}

// ── Seção 2: Focus + Health ────────────────────────────────────────────────────

export interface HealthFocusData {
  health: ClientHealth
  focusTasks: ClientTask[]
}

export async function fetchHealthFocusData(clientId: string, _signal: AbortSignal): Promise<HealthFocusData> {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .eq('client_id', clientId)
    .is('concluded_at', null)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  const today = new Date().toISOString().slice(0, 10)
  const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  const { taskList } = buildTaskList((data ?? []) as RawTask[], today, in7Days)

  return {
    health: buildHealth(taskList),
    focusTasks: buildFocusTasks(taskList),
  }
}

// ── Seção 3: Tarefas por prioridade + Timeline ────────────────────────────────

export interface TasksTimelineData {
  tasks: ClientTask[]
  timeline: TimelineEntry[]
}

export async function fetchTasksTimelineData(clientId: string, _signal: AbortSignal): Promise<TasksTimelineData> {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  const today = new Date().toISOString().slice(0, 10)
  const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  const { taskList } = buildTaskList((data ?? []) as RawTask[], today, in7Days)
  const openTasks = taskList.filter((t) => !t.concludedAt)

  return {
    tasks: taskList,
    timeline: buildTimeline(openTasks, today, in7Days),
  }
}

// ── Seção 4: Equipe / carga de trabalho ──────────────────────────────────────

export interface TeamData {
  members: ClientMember[]
  clientHours: Map<string, number>
}

export async function fetchTeamData(clientId: string, _signal: AbortSignal): Promise<TeamData> {
  const [tasksResult, clientMembersResult] = await Promise.all([
    supabase
      .from('tasks')
      .select(TASK_SELECT)
      .eq('client_id', clientId)
      .is('concluded_at', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('user_clients')
      .select('members (id, name, role, avatar_url, capacity)')
      .eq('client_id', clientId),
  ])

  if (tasksResult.error) throw new Error(tasksResult.error.message)
  if (clientMembersResult.error) throw new Error(clientMembersResult.error.message)

  const members = (clientMembersResult.data ?? [])
    .map((row) => row.members as unknown as RawMember | null)
    .filter((m): m is RawMember => m != null)

  const today = new Date().toISOString().slice(0, 10)
  const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  const { memberMap } = buildTaskList((tasksResult.data ?? []) as RawTask[], today, in7Days)

  seedMemberMap(memberMap, members)

  const clientHours = new Map<string, number>()
  for (const [id, m] of memberMap) {
    clientHours.set(id, m.totalActiveHours ?? 0)
  }

  const memberIds = members.map((m) => m.id)
  let otherClientTasks: RawTaskWithClient[] = []
  if (memberIds.length > 0) {
    const { data: otherData } = await supabase
      .from('tasks')
      .select(TASK_SELECT)
      .neq('client_id', clientId)
      .is('concluded_at', null)
      .not('client_id', 'is', null)
    if (otherData) {
      otherClientTasks = (otherData as RawTaskWithClient[]).filter((t) =>
        (t.task_subtasks ?? []).some((s) =>
          (s.subtask_assignees ?? []).some((a) => memberIds.includes(a.member_id))
        )
      )
    }
  }

  applyOtherClientWorkload(memberMap, otherClientTasks, today)

  return {
    members: mergeClientMembers(memberMap, members),
    clientHours,
  }
}
