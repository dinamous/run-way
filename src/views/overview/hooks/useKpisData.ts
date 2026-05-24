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
    .sort((a, b) => a.end.localeCompare(b.end))
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

export function useKpisData({ memberId, isAdmin, clients }: UseKpisDataParams): KpisData {
  const [subtasks, setSubtasks] = useState<SubtaskRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const clientIds = clients.map((c) => c.id)
  const clientKey = clientIds.join(',')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const rows = isAdmin
          ? await fetchAllSubtasks(clientIds)
          : await fetchSubtasks(memberId)

        if (!cancelled) setSubtasks(rows)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro ao carregar subtarefas')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [memberId, isAdmin, clientKey, tick]) // eslint-disable-line react-hooks/exhaustive-deps

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
    retry: () => setTick((t) => t + 1),
  }
}
