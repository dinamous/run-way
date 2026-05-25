import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { ClientOption } from '@/contexts/AuthContext'
import type { BlockedTask } from '@/utils/planner'
import type { SubtaskRow, OverviewKpis } from './useOverviewData'

interface UseKpisDataParams {
  memberId: string
  isAdmin: boolean
  clients: ClientOption[]
}

export interface KpisData {
  subtasks: SubtaskRow[]
  kpis: OverviewKpis
  blockedTasks: BlockedTask[]
  accumulatedDelayDays: number
  loading: boolean
  error: string | null
  retry: () => void
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

  return (data as unknown as RawSubtaskRow[])
    .map(mapSubtaskRow)
    .filter((r): r is SubtaskRow => r !== null)
    .sort((a, b) => (a.end ?? '').localeCompare(b.end ?? ''))
}


const SUBTASK_SELECT_BY_TASKS = `
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
    blocked,
    concluded_at,
    client_id,
    clients (
      id,
      name
    )
  )
`

type RawSubtaskByTasksRow = {
  id: string
  title: string
  status: string
  start_date: string | null
  end_date: string | null
  active: boolean
  task_id: string
  tasks: {
    id: string
    title: string
    blocked: boolean | null
    concluded_at: string | null
    client_id: string | null
    clients: { id: string; name: string } | null
  }
}

async function fetchAllSubtasks(clientIds: string[]): Promise<SubtaskRow[]> {
  // Single query: task_subtasks joined with tasks!inner, filtered by concluded_at IS NULL
  // and optionally client_id. PostgREST v12+ (Supabase cloud) supports embedded resource filters.
  let query = supabase
    .from('task_subtasks')
    .select(SUBTASK_SELECT_BY_TASKS)
    .is('tasks.concluded_at', null)

  if (clientIds.length > 0) {
    query = query.in('tasks.client_id', clientIds)
  }

  const { data, error } = await query
  if (error) throw error
  if (!data) return []

  const rows: (SubtaskRow | null)[] = (data as unknown as RawSubtaskByTasksRow[]).map(raw => {
    const task = raw.tasks
    if (!task) return null
    return {
      id: raw.id,
      title: raw.title,
      status: raw.status,
      start: raw.start_date ?? '',
      end: raw.end_date ?? '',
      active: raw.active ?? true,
      taskId: task.id,
      taskTitle: task.title,
      taskBlocked: task.blocked ?? false,
      clientId: task.clients?.id ?? task.client_id ?? '',
      clientName: task.clients?.name ?? '',
      taskConcludedAt: task.concluded_at,
    }
  })
  return rows
    .filter((r): r is SubtaskRow => r !== null)
    .sort((a, b) => (a.end ?? '').localeCompare(b.end ?? ''))
}

const KPIS_CACHE_TTL_MS = 2 * 60 * 1000

type KpisCache = { rows: SubtaskRow[]; ts: number }
const kpisCache = new Map<string, KpisCache>()

function getCached(key: string): SubtaskRow[] | null {
  const entry = kpisCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > KPIS_CACHE_TTL_MS) {
    kpisCache.delete(key)
    return null
  }
  return entry.rows
}

function setCached(key: string, rows: SubtaskRow[]) {
  kpisCache.set(key, { rows, ts: Date.now() })
}

export function useKpisData({ memberId, isAdmin, clients }: UseKpisDataParams): KpisData {
  const clientKey = useMemo(() => clients.map((c) => c.id).sort().join(','), [clients])
  const cacheKey = `${memberId}:${isAdmin}:${clientKey}`

  const [subtasks, setSubtasks] = useState<SubtaskRow[]>(() => getCached(cacheKey) ?? [])
  const [loading, setLoading] = useState(() => getCached(cacheKey) === null)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    const clientIds = clientKey ? clientKey.split(',') : []
    const cached = getCached(cacheKey)

    if (cached) {
      setSubtasks(cached)
      setLoading(false)
      return
    }

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const rows = isAdmin
          ? await fetchAllSubtasks(clientIds)
          : await fetchSubtasks(memberId)

        if (!cancelled) {
          setCached(cacheKey, rows)
          setSubtasks(rows)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro ao carregar subtarefas')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [memberId, isAdmin, clientKey, cacheKey, tick])

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

    const seen = new Set<string>()
    const blockedTasks: BlockedTask[] = []
    for (const s of subtasks) {
      if (s.taskBlocked && !s.taskConcludedAt && !seen.has(s.taskId)) {
        seen.add(s.taskId)
        blockedTasks.push({ taskId: s.taskId, taskTitle: s.taskTitle, clientId: s.clientId, clientName: s.clientName })
      }
    }

    return { kpis, accumulatedDelayDays, blockedTasks }
  }, [subtasks])

  return {
    subtasks,
    kpis: derived.kpis,
    blockedTasks: derived.blockedTasks,
    accumulatedDelayDays: derived.accumulatedDelayDays,
    loading,
    error,
    retry: () => { kpisCache.delete(cacheKey); setTick((t) => t + 1) },
  }
}
