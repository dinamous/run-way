import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface ClientInfo {
  id: string
  name: string
}

export interface ClientTask {
  id: string
  title: string
  clickupLink: string | null
  concludedAt: string | null
  createdAt: string
  subtaskCount: number
  lateSubtaskCount: number
}

export interface ClientMember {
  id: string
  name: string
  role: string
  avatarUrl: string | null
  subtaskCount: number
}

export interface ClientOverviewKpis {
  openTasks: number
  lateTasks: number
  concludedTasks: number
  totalSubtasks: number
  lateSubtasks: number
}

export interface ClientOverviewData {
  client: ClientInfo | null
  kpis: ClientOverviewKpis
  tasks: ClientTask[]
  members: ClientMember[]
  loading: boolean
  error: string | null
}

export function useClientOverviewData(clientId: string | null): ClientOverviewData {
  const [client, setClient] = useState<ClientInfo | null>(null)
  const [kpis, setKpis] = useState<ClientOverviewKpis>({
    openTasks: 0,
    lateTasks: 0,
    concludedTasks: 0,
    totalSubtasks: 0,
    lateSubtasks: 0,
  })
  const [tasks, setTasks] = useState<ClientTask[]>([])
  const [members, setMembers] = useState<ClientMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!clientId) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const today = new Date().toISOString().slice(0, 10)

        const [clientResult, tasksResult] = await Promise.all([
          supabase.from('clients').select('id, name').eq('id', clientId).single(),
          supabase
            .from('tasks')
            .select(`
              id,
              title,
              clickup_link,
              concluded_at,
              created_at,
              task_subtasks (
                id,
                end_date,
                subtask_assignees (
                  member_id,
                  members (
                    id,
                    name,
                    role,
                    avatar_url
                  )
                )
              )
            `)
            .eq('client_id', clientId)
            .order('created_at', { ascending: false }),
        ])

        if (cancelled) return

        if (clientResult.error) throw clientResult.error
        if (tasksResult.error) throw tasksResult.error

        const clientData = clientResult.data
        const rawTasks = tasksResult.data ?? []

        const taskList: ClientTask[] = rawTasks.map((t) => {
          const subtasks = (t.task_subtasks ?? []) as Array<{ id: string; end_date: string }>
          const lateCount = subtasks.filter((s) => !t.concluded_at && s.end_date < today).length
          return {
            id: t.id,
            title: t.title,
            clickupLink: t.clickup_link ?? null,
            concludedAt: t.concluded_at ?? null,
            createdAt: t.created_at,
            subtaskCount: subtasks.length,
            lateSubtaskCount: lateCount,
          }
        })

        const openTasks = taskList.filter((t) => !t.concludedAt)
        const concludedTasks = taskList.filter((t) => t.concludedAt)
        const lateTasks = openTasks.filter((t) => t.lateSubtaskCount > 0)
        const totalSubtasks = taskList.reduce((acc, t) => acc + t.subtaskCount, 0)
        const totalLateSubtasks = taskList.reduce((acc, t) => acc + t.lateSubtaskCount, 0)

        // Aggregate members from subtask assignees
        const memberMap = new Map<string, ClientMember>()
        for (const task of rawTasks) {
          if (task.concluded_at) continue
          for (const sub of (task.task_subtasks ?? []) as Array<{
            subtask_assignees: Array<{
              member_id: string
              members: { id: string; name: string; role: string; avatar_url: string | null } | null
            }>
          }>) {
            for (const assignee of sub.subtask_assignees ?? []) {
              const m = assignee.members
              if (!m) continue
              const existing = memberMap.get(m.id)
              if (existing) {
                existing.subtaskCount++
              } else {
                memberMap.set(m.id, {
                  id: m.id,
                  name: m.name,
                  role: m.role,
                  avatarUrl: m.avatar_url,
                  subtaskCount: 1,
                })
              }
            }
          }
        }

        setClient({ id: clientData.id, name: clientData.name })
        setKpis({
          openTasks: openTasks.length,
          lateTasks: lateTasks.length,
          concludedTasks: concludedTasks.length,
          totalSubtasks,
          lateSubtasks: totalLateSubtasks,
        })
        setTasks(taskList)
        setMembers([...memberMap.values()].sort((a, b) => b.subtaskCount - a.subtaskCount))
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar dados do cliente')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [clientId])

  return { client, kpis, tasks, members, loading, error }
}
