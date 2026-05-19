import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchNotifications } from '@/lib/notifications'
import type { Notification } from '@/types/notification'
import type { ClientOption } from '@/contexts/AuthContext'

export interface SubtaskRow {
  id: string
  title: string
  status: string
  start: string
  end: string
  taskId: string
  taskTitle: string
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
  notifications: Notification[]
  clients: ClientSummary[]
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const clientIds = clients.map((c) => c.id)

        const [subtasksResult, notificationsResult, clientsResult] = await Promise.all([
          fetchSubtasks(memberId),
          fetchNotifications(userId, clientIds),
          fetchClientSummaries(clientIds, isAdmin),
        ])

        if (cancelled) return

        setSubtasks(subtasksResult)
        setNotifications(notificationsResult)
        setClientSummaries(clientsResult)
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
  }, [memberId, userId, isAdmin, clients])

  const today = new Date().toISOString().slice(0, 10)
  const activeTasks = subtasks.filter((s) => !s.taskConcludedAt)
  const lateSubtasks = activeTasks.filter((s) => s.end < today)

  const accumulatedDelayDays = lateSubtasks.reduce((acc, s) => {
    const diff = Math.round(
      (new Date(today + 'T00:00:00').getTime() - new Date(s.end + 'T00:00:00').getTime()) /
        (1000 * 60 * 60 * 24)
    )
    return acc + diff
  }, 0)

  const kpis: OverviewKpis = {
    open: new Set(activeTasks.map((s) => s.taskId)).size,
    late: lateSubtasks.length,
    today: activeTasks.filter((s) => s.end === today).length,
    concluded: new Set(subtasks.filter((s) => s.taskConcludedAt).map((s) => s.taskId)).size,
  }

  // Enrich client summaries with risk based on subtask data
  const lateByClient = lateSubtasks.reduce<Record<string, number>>((acc, s) => {
    acc[s.clientId] = (acc[s.clientId] ?? 0) + 1
    return acc
  }, {})

  const enrichedClients: ClientSummary[] = clientSummaries.map((c) => {
    const lateCount = lateByClient[c.id] ?? 0
    const risk: ClientRisk = lateCount >= 2 ? 'critical' : lateCount === 1 ? 'attention' : 'healthy'
    return { ...c, lateSubtaskCount: lateCount, risk }
  })

  return { kpis, subtasks, notifications, clients: enrichedClients, accumulatedDelayDays, loading, error }
}

async function fetchSubtasks(memberId: string): Promise<SubtaskRow[]> {
  const { data, error } = await supabase
    .from('subtask_assignees')
    .select(`
      subtask_id,
      task_subtasks!inner (
        id,
        title,
        status,
        start_date,
        end_date,
        task_id,
        tasks!inner (
          id,
          title,
          concluded_at,
          client_id,
          clients (
            id,
            name
          )
        )
      )
    `)
    .eq('member_id', memberId)

  if (error) throw error
  if (!data) return []

  const rows: SubtaskRow[] = []

  for (const row of data) {
    const sub = row.task_subtasks as {
      id: string
      title: string
      status: string
      start_date: string
      end_date: string
      task_id: string
      tasks: {
        id: string
        title: string
        concluded_at: string | null
        client_id: string | null
        clients: { id: string; name: string } | null
      }
    }

    if (!sub) continue
    const task = sub.tasks
    if (!task) continue

    rows.push({
      id: sub.id,
      title: sub.title,
      status: sub.status,
      start: sub.start_date,
      end: sub.end_date,
      taskId: task.id,
      taskTitle: task.title,
      clientId: task.clients?.id ?? task.client_id ?? '',
      clientName: task.clients?.name ?? '',
      taskConcludedAt: task.concluded_at,
    })
  }

  return rows.sort((a, b) => a.end.localeCompare(b.end))
}

async function fetchClientSummaries(clientIds: string[], isAdmin: boolean): Promise<ClientSummary[]> {
  let ids = clientIds

  if (isAdmin) {
    const { data } = await supabase.from('clients').select('id, name').order('name')
    ids = (data ?? []).map((c) => c.id)
  }

  if (ids.length === 0) return []

  const summaries = await Promise.all(
    ids.map(async (clientId) => {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, name')
        .eq('id', clientId)
        .single()

      const { count } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .is('concluded_at', null)

      return {
        id: clientId,
        name: clientData?.name ?? '',
        activeTaskCount: count ?? 0,
        lateSubtaskCount: 0,
        risk: 'healthy' as ClientRisk,
      }
    })
  )

  return summaries
}
