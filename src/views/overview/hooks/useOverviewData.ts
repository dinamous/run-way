import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchNotifications } from '@/lib/notifications'
import { buildPersonalWorkload, type PersonalWorkload } from './overviewWorkload'
import type { Notification } from '@/types/notification'
import type { ClientOption } from '@/contexts/AuthContext'
import type { BlockedTask } from '@/utils/planner'

export interface SubtaskRow {
  id: string
  title: string
  status: string
  start: string
  end: string
  active: boolean
  taskId: string
  taskTitle: string
  taskBlocked: boolean
  clientId: string
  clientName: string
  taskConcludedAt: string | null
}

export type ClientRisk = 'healthy' | 'attention' | 'critical'

export interface ClientSummary {
  id: string
  name: string
  activeTaskCount: number
  lateSubtaskCount: number
  risk: ClientRisk
}

export interface OverviewKpis {
  open: number
  late: number
  today: number
  concluded: number
}

export interface OverviewData {
  kpis: OverviewKpis
  subtasks: SubtaskRow[]
  blockedTasks: BlockedTask[]
  notifications: Notification[]
  clients: ClientSummary[]
  personalWorkload: PersonalWorkload
  accumulatedDelayDays: number
  loading: boolean
  error: string | null
}

interface UseOverviewDataParams {
  memberId: string
  userId: string
  isAdmin: boolean
  clients: ClientOption[]
}

export function useOverviewData({ memberId, userId, isAdmin, clients }: UseOverviewDataParams): OverviewData {
  const [subtasks, setSubtasks] = useState<SubtaskRow[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [clientSummaries, setClientSummaries] = useState<ClientSummary[]>([])
  const [personalWorkload, setPersonalWorkload] = useState<PersonalWorkload>({ member: null, insights: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      setPersonalWorkload({ member: null, insights: [] })

      try {
        const clientIds = clients.map((c) => c.id)

        const [subtasksResult, notificationsResult, clientsResult, memberResult, personalSubtasksResult] = await Promise.all([
          isAdmin ? fetchAllSubtasks(clientIds) : fetchSubtasks(memberId),
          fetchNotifications(userId, clientIds),
          fetchClientSummaries(clientIds, isAdmin),
          fetchMemberProfile(memberId),
          isAdmin ? fetchSubtasks(memberId) : Promise.resolve(null),
        ])

        if (cancelled) return

        const today = new Date().toISOString().slice(0, 10)
        const personalRows = personalSubtasksResult ?? subtasksResult

        setSubtasks(subtasksResult)
        setNotifications(notificationsResult)
        setClientSummaries(clientsResult)
        setPersonalWorkload(buildPersonalWorkload(memberResult, personalRows, today))
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [memberId, userId, isAdmin, clients.map(c => c.id).join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  const derived = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const todayMs = new Date(today + 'T00:00:00').getTime()
    const activeTasks = subtasks.filter((s) => !s.taskConcludedAt)
    const lateSubtasks = activeTasks.filter((s) => s.end < today)

    const accumulatedDelayDays = lateSubtasks.reduce((acc, s) => {
      const diff = Math.round((todayMs - new Date(s.end + 'T00:00:00').getTime()) / 86_400_000)
      return acc + diff
    }, 0)

    const kpis: OverviewKpis = {
      open: new Set(activeTasks.map((s) => s.taskId)).size,
      late: lateSubtasks.length,
      today: activeTasks.filter((s) => s.end === today).length,
      concluded: new Set(subtasks.filter((s) => s.taskConcludedAt).map((s) => s.taskId)).size,
    }

    const lateByClient = lateSubtasks.reduce<Record<string, number>>((acc, s) => {
      acc[s.clientId] = (acc[s.clientId] ?? 0) + 1
      return acc
    }, {})

    const enrichedClients: ClientSummary[] = clientSummaries.map((c) => {
      const lateCount = lateByClient[c.id] ?? 0
      const risk: ClientRisk = lateCount >= 2 ? 'critical' : lateCount === 1 ? 'attention' : 'healthy'
      return { ...c, lateSubtaskCount: lateCount, risk }
    })

    // Deduplicate blocked tasks by taskId
    const seen = new Set<string>()
    const blockedTasks: BlockedTask[] = []
    for (const s of subtasks) {
      if (s.taskBlocked && !s.taskConcludedAt && !seen.has(s.taskId)) {
        seen.add(s.taskId)
        blockedTasks.push({ taskId: s.taskId, taskTitle: s.taskTitle, clientId: s.clientId, clientName: s.clientName })
      }
    }

    return { kpis, accumulatedDelayDays, enrichedClients, blockedTasks }
  }, [subtasks, clientSummaries])

  return {
    kpis: derived.kpis,
    subtasks,
    blockedTasks: derived.blockedTasks,
    notifications,
    clients: derived.enrichedClients,
    personalWorkload,
    accumulatedDelayDays: derived.accumulatedDelayDays,
    loading,
    error,
  }
}

const SUBTASK_SELECT = `
  subtask_id,
  task_subtasks!inner (
    id,
    title,
    status,
    start_date,
    end_date,
    active,
    task_id,
    tasks!inner (
      id,
      title,
      concluded_at,
      blocked,
      client_id,
      clients (
        id,
        name
      )
    )
  )
`

type RawSubtaskRow = {
  subtask_id: string
  task_subtasks: {
    id: string
    title: string
    status: string
    start_date: string
    end_date: string
    active: boolean
    task_id: string
    tasks: {
      id: string
      title: string
      concluded_at: string | null
      blocked: boolean | null
      client_id: string | null
      clients: { id: string; name: string } | null
    }
  }
}

function mapSubtaskRow(row: RawSubtaskRow): SubtaskRow | null {
  const sub = row.task_subtasks
  if (!sub) return null
  const task = sub.tasks
  if (!task) return null

  return {
    id: sub.id,
    title: sub.title,
    status: sub.status,
    start: sub.start_date,
    end: sub.end_date,
    active: sub.active ?? true,
    taskId: task.id,
    taskTitle: task.title,
    taskBlocked: task.blocked ?? false,
    clientId: task.clients?.id ?? task.client_id ?? '',
    clientName: task.clients?.name ?? '',
    taskConcludedAt: task.concluded_at,
  }
}

async function fetchSubtasks(memberId: string): Promise<SubtaskRow[]> {
  const { data, error } = await supabase
    .from('subtask_assignees')
    .select(SUBTASK_SELECT)
    .eq('member_id', memberId)

  if (error) throw error
  if (!data) return []

  const rows = (data as unknown as RawSubtaskRow[]).map(mapSubtaskRow).filter((r): r is SubtaskRow => r !== null)
  return rows.sort((a, b) => a.end.localeCompare(b.end))
}

async function fetchAllSubtasks(clientIds: string[]): Promise<SubtaskRow[]> {
  const { data, error } = await supabase
    .from('subtask_assignees')
    .select(SUBTASK_SELECT)

  if (error) throw error
  if (!data) return []

  const rows = (data as unknown as RawSubtaskRow[])
    .map(mapSubtaskRow)
    .filter((r): r is SubtaskRow => r !== null && (clientIds.length === 0 || clientIds.includes(r.clientId)))

  // Deduplicate by subtask id (multiple assignees)
  const seen = new Set<string>()
  const unique: SubtaskRow[] = []
  for (const r of rows) {
    if (!seen.has(r.id)) {
      seen.add(r.id)
      unique.push(r)
    }
  }

  return unique.sort((a, b) => a.end.localeCompare(b.end))
}

async function fetchClientSummaries(clientIds: string[], isAdmin: boolean): Promise<ClientSummary[]> {
  // Fetch clients: admin gets all, otherwise filter by assigned ids
  const clientsQuery = supabase.from('clients').select('id, name').order('name')
  if (!isAdmin) clientsQuery.in('id', clientIds)

  const tasksQuery = supabase
    .from('tasks')
    .select('client_id')
    .is('concluded_at', null)

  const [{ data: clientsData }, { data: tasksData }] = await Promise.all([
    clientsQuery,
    tasksQuery,
  ])

  const clients = clientsData ?? []
  if (clients.length === 0) return []

  // Count active tasks per client in memory — avoids N+1 queries
  const taskCountByClient = (tasksData ?? []).reduce<Record<string, number>>((acc, t) => {
    if (t.client_id) acc[t.client_id] = (acc[t.client_id] ?? 0) + 1
    return acc
  }, {})

  return clients.map((c) => ({
    id: c.id,
    name: c.name,
    activeTaskCount: taskCountByClient[c.id] ?? 0,
    lateSubtaskCount: 0,
    risk: 'healthy' as ClientRisk,
  }))
}

async function fetchMemberProfile(memberId: string): Promise<{
  id: string
  name: string
  role: string
  avatarUrl: string | null
  capacity: number
} | null> {
  const { data, error } = await supabase
    .from('members')
    .select('id, name, role, avatar_url, capacity')
    .eq('id', memberId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    id: data.id,
    name: data.name,
    role: data.role,
    avatarUrl: data.avatar_url,
    capacity: Math.max(1, data.capacity ?? 6),
  }
}
