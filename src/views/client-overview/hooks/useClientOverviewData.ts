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
  subtasks: ClientSubtask[]
  subtaskCount: number
  lateSubtaskCount: number
  accumulatedLateDays: number
  priority: 'critical' | 'important' | 'backlog'
}

export interface ClientSubtask {
  id: string
  title: string
  endDate: string
  status: string
  isLate: boolean
  assignees: ClientMember[]
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
  accumulatedLateDays: number
}

export type ClientHealthStatus = 'healthy' | 'warning' | 'critical'

export interface ClientHealth {
  status: ClientHealthStatus
  lateTasks: number
  criticalTasks: number
  dueSoonTasks: number
}

export interface TimelineEntry {
  taskId: string
  taskTitle: string
  subtaskId: string
  subtaskTitle: string
  endDate: string
  daysFromNow: number
  isLate: boolean
  status: string
}

export interface ClientOverviewData {
  client: ClientInfo | null
  kpis: ClientOverviewKpis
  health: ClientHealth
  focusTasks: ClientTask[]
  tasks: ClientTask[]
  members: ClientMember[]
  timeline: TimelineEntry[]
  loading: boolean
  error: string | null
}

function calcHealth(lateTasks: number, criticalTasks: number, dueSoonTasks: number): ClientHealthStatus {
  if (lateTasks >= 4 || criticalTasks >= 2) return 'critical'
  if (lateTasks >= 1 || dueSoonTasks >= 2) return 'warning'
  return 'healthy'
}

export function useClientOverviewData(clientId: string | null): ClientOverviewData {
  const [client, setClient] = useState<ClientInfo | null>(null)
  const [kpis, setKpis] = useState<ClientOverviewKpis>({
    openTasks: 0,
    lateTasks: 0,
    concludedTasks: 0,
    totalSubtasks: 0,
    lateSubtasks: 0,
    accumulatedLateDays: 0,
  })
  const [health, setHealth] = useState<ClientHealth>({ status: 'healthy', lateTasks: 0, criticalTasks: 0, dueSoonTasks: 0 })
  const [focusTasks, setFocusTasks] = useState<ClientTask[]>([])
  const [tasks, setTasks] = useState<ClientTask[]>([])
  const [members, setMembers] = useState<ClientMember[]>([])
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
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
        const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

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
                title,
                end_date,
                status,
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

        const rawTasks = tasksResult.data ?? []

        const memberMap = new Map<string, ClientMember>()

        const taskList: ClientTask[] = rawTasks.map((t) => {
          const rawSubs = (t.task_subtasks ?? []) as Array<{
            id: string
            title: string
            end_date: string
            status: string
            subtask_assignees: Array<{
              member_id: string
              members: { id: string; name: string; role: string; avatar_url: string | null } | null
            }>
          }>

          const subtasks: ClientSubtask[] = rawSubs.map((s) => {
            const isLate = !t.concluded_at && s.end_date < today
            const assignees: ClientMember[] = (s.subtask_assignees ?? [])
              .filter((a) => a.members)
              .map((a) => ({
                id: a.members!.id,
                name: a.members!.name,
                role: a.members!.role,
                avatarUrl: a.members!.avatar_url,
                subtaskCount: 0,
              }))
            return { id: s.id, title: s.title ?? '', endDate: s.end_date, status: s.status, isLate, assignees }
          })

          const lateSubtasks = subtasks.filter((s) => s.isLate)
          const accumulatedLateDays = lateSubtasks.reduce((acc, s) => {
            const diff = Math.floor((new Date(today).getTime() - new Date(s.endDate).getTime()) / 86400000)
            return acc + Math.max(0, diff)
          }, 0)

          // priority: critical if any late subtask; important if due in 7 days; else backlog
          const hasDueSoon = !t.concluded_at && subtasks.some((s) => !s.isLate && s.endDate <= in7Days)
          let priority: ClientTask['priority'] = 'backlog'
          if (lateSubtasks.length > 0) priority = 'critical'
          else if (hasDueSoon) priority = 'important'

          if (!t.concluded_at) {
            for (const s of subtasks) {
              for (const a of s.assignees) {
                const existing = memberMap.get(a.id)
                if (existing) {
                  existing.subtaskCount++
                } else {
                  memberMap.set(a.id, { ...a, subtaskCount: 1 })
                }
              }
            }
          }

          return {
            id: t.id,
            title: t.title,
            clickupLink: t.clickup_link ?? null,
            concludedAt: t.concluded_at ?? null,
            createdAt: t.created_at,
            subtasks,
            subtaskCount: subtasks.length,
            lateSubtaskCount: lateSubtasks.length,
            accumulatedLateDays,
            priority,
          }
        })

        const openTasks = taskList.filter((t) => !t.concludedAt)
        const concludedTasks = taskList.filter((t) => t.concludedAt)
        const lateTasks = openTasks.filter((t) => t.lateSubtaskCount > 0)
        const criticalTasks = openTasks.filter((t) => t.priority === 'critical')
        const dueSoonTasks = openTasks.filter((t) => t.priority === 'important')
        const totalSubtasks = taskList.reduce((acc, t) => acc + t.subtaskCount, 0)
        const totalLateSubtasks = taskList.reduce((acc, t) => acc + t.lateSubtaskCount, 0)
        const totalAccumulatedDays = taskList.reduce((acc, t) => acc + t.accumulatedLateDays, 0)

        // Focus: up to 5 most critical open tasks (late first, then due soon)
        const focus = [...openTasks]
          .sort((a, b) => {
            if (a.priority !== b.priority) {
              const order = { critical: 0, important: 1, backlog: 2 }
              return order[a.priority] - order[b.priority]
            }
            return b.accumulatedLateDays - a.accumulatedLateDays
          })
          .slice(0, 5)

        // Timeline: open subtasks in next 7 days + overdue, sorted by date
        const timelineEntries: TimelineEntry[] = []
        for (const task of openTasks) {
          for (const sub of task.subtasks) {
            if (sub.endDate <= in7Days) {
              const daysFromNow = Math.floor(
                (new Date(sub.endDate + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000,
              )
              timelineEntries.push({
                taskId: task.id,
                taskTitle: task.title,
                subtaskId: sub.id,
                subtaskTitle: sub.title,
                endDate: sub.endDate,
                daysFromNow,
                isLate: sub.isLate,
                status: sub.status,
              })
            }
          }
        }
        timelineEntries.sort((a, b) => a.endDate.localeCompare(b.endDate))

        const healthStatus = calcHealth(lateTasks.length, criticalTasks.length, dueSoonTasks.length)

        if (!cancelled) {
          setClient({ id: clientResult.data.id, name: clientResult.data.name })
          setKpis({
            openTasks: openTasks.length,
            lateTasks: lateTasks.length,
            concludedTasks: concludedTasks.length,
            totalSubtasks,
            lateSubtasks: totalLateSubtasks,
            accumulatedLateDays: totalAccumulatedDays,
          })
          setHealth({ status: healthStatus, lateTasks: lateTasks.length, criticalTasks: criticalTasks.length, dueSoonTasks: dueSoonTasks.length })
          setFocusTasks(focus)
          setTasks(taskList)
          setMembers([...memberMap.values()].sort((a, b) => b.subtaskCount - a.subtaskCount))
          setTimeline(timelineEntries)
        }
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

  return { client, kpis, health, focusTasks, tasks, members, timeline, loading, error }
}
