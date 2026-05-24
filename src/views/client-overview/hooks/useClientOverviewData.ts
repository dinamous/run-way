import { useState, useEffect } from 'react'
import { fetchClientOverviewRaw } from './clientOverviewService'
import { buildTaskList, buildTimeline, buildFocusTasks, calcKpis, buildHealth, mergeClientMembers, seedMemberMap, applyOtherClientWorkload } from './clientOverviewTransformers'

const CACHE_TTL_MS = 60_000

interface CacheEntry {
  data: Omit<ClientOverviewData, 'loading' | 'error'>
  fetchedAt: number
}

const cache = new Map<string, CacheEntry>()

export function invalidateClientOverviewCache(clientId?: string) {
  if (clientId) cache.delete(clientId)
  else cache.clear()
}

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
  startDate: string
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
  capacity: number
  subtaskCount: number
  totalActiveHours?: number
  lateCount: number
  stuckTasksCount?: number
  pressureScore?: number
  status?: 'available' | 'busy' | 'overloaded'
  estimatedCompletionDate?: string | null
  segments?: import('@/components/workload/CapacityTeam').WorkloadSegment[]
  weekSegments?: import('@/components/workload/CapacityTeam').WorkloadSegment[]
  weekHours?: number
  monthHours?: number
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
  /** Hours each member has allocated specifically to this client (member id → hours) */
  clientHours: Map<string, number>
  timeline: TimelineEntry[]
  loading: boolean
  error: string | null
}

const EMPTY_KPIS: ClientOverviewKpis = { openTasks: 0, lateTasks: 0, concludedTasks: 0, totalSubtasks: 0, lateSubtasks: 0, accumulatedLateDays: 0 }
const EMPTY_HEALTH: ClientHealth = { status: 'healthy', lateTasks: 0, criticalTasks: 0, dueSoonTasks: 0 }

export function useClientOverviewData(clientId: string | null): ClientOverviewData {
  const [client, setClient] = useState<ClientInfo | null>(null)
  const [kpis, setKpis] = useState<ClientOverviewKpis>(EMPTY_KPIS)
  const [health, setHealth] = useState<ClientHealth>(EMPTY_HEALTH)
  const [focusTasks, setFocusTasks] = useState<ClientTask[]>([])
  const [tasks, setTasks] = useState<ClientTask[]>([])
  const [members, setMembers] = useState<ClientMember[]>([])
  const [clientHours, setClientHours] = useState<Map<string, number>>(new Map())
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!clientId) {
      setClient(null)
      setTasks([])
      setMembers([])
      setClientHours(new Map())
      setTimeline([])
      setFocusTasks([])
      setHealth(EMPTY_HEALTH)
      setKpis(EMPTY_KPIS)
      setLoading(false)
      return
    }

    const cached = cache.get(clientId)
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      setError(null)
      applyData(cached.data)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    setClient(null)
    setTasks([])
    setMembers([])
    setClientHours(new Map())
    setTimeline([])
    setFocusTasks([])
    setHealth(EMPTY_HEALTH)
    setKpis(EMPTY_KPIS)

    let cancelled = false

    async function load() {
      try {
        const today = new Date().toISOString().slice(0, 10)
        const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

        const raw = await fetchClientOverviewRaw(clientId!)
        if (cancelled) return

        const { taskList, memberMap } = buildTaskList(raw.tasks, today, in7Days)
        const openTasks = taskList.filter((t) => !t.concludedAt)
        const concludedTasks = taskList.filter((t) => t.concludedAt)

        // Ensure all client members are in the map before cross-client workload is applied,
        // so members with zero local tasks still receive their other-client segments.
        seedMemberMap(memberMap, raw.members)

        // Snapshot client-only hours before merging cross-client workload
        const clientHoursSnapshot = new Map<string, number>()
        for (const [id, m] of memberMap) {
          clientHoursSnapshot.set(id, m.totalActiveHours ?? 0)
        }

        applyOtherClientWorkload(memberMap, raw.otherClientTasks, today)

        const entry: Omit<ClientOverviewData, 'loading' | 'error'> = {
          client: raw.client,
          kpis: calcKpis(taskList, openTasks, concludedTasks),
          health: buildHealth(openTasks),
          focusTasks: buildFocusTasks(openTasks),
          tasks: taskList,
          members: mergeClientMembers(memberMap, raw.members),
          clientHours: clientHoursSnapshot,
          timeline: buildTimeline(openTasks, today, in7Days),
        }

        if (!cancelled) {
          cache.set(clientId!, { data: entry, fetchedAt: Date.now() })
          applyData(entry)
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

  function applyData(entry: Omit<ClientOverviewData, 'loading' | 'error'>) {
    setClient(entry.client)
    setKpis(entry.kpis)
    setHealth(entry.health)
    setFocusTasks(entry.focusTasks)
    setTasks(entry.tasks)
    setMembers(entry.members)
    setClientHours(entry.clientHours)
    setTimeline(entry.timeline)
  }

  return { client, kpis, health, focusTasks, tasks, members, clientHours, timeline, loading, error }
}
