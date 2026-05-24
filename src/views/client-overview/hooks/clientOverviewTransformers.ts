import { businessDaysBetween } from '@/utils/dateUtils'
import type { WorkloadSegment } from '@/components/workload/CapacityTeam'
import type { ClientTask, ClientSubtask, ClientMember, ClientOverviewKpis, ClientHealth, ClientHealthStatus, TimelineEntry } from './useClientOverviewData'
import type { RawTaskWithClient } from './clientOverviewService'

// Raw types coming directly from Supabase joins
export interface RawMember {
  id: string
  name: string
  role: string
  avatar_url: string | null
  capacity: number | null
}

export interface RawSubtaskAssignee {
  member_id: string
  members: RawMember | null
}

export interface RawSubtask {
  id: string
  title: string | null
  start_date: string | null
  end_date: string | null
  status: string | null
  subtask_assignees: RawSubtaskAssignee[]
}

export interface RawTask {
  id: string
  title: string
  clickup_link: string | null
  concluded_at: string | null
  created_at: string
  task_subtasks: RawSubtask[] | null
}

export function parseSubtask(s: RawSubtask, today: string, taskConcluded: boolean): ClientSubtask {
  const startDate = s.start_date ?? ''
  const endDate = s.end_date ?? ''
  const isLate = !taskConcluded && endDate !== '' && endDate < today
  const assignees: ClientMember[] = (s.subtask_assignees ?? [])
    .filter((a) => a.members != null)
    .map((a) => ({
      id: a.members!.id,
      name: a.members!.name,
      role: a.members!.role,
      avatarUrl: a.members!.avatar_url,
      capacity: Math.max(1, a.members!.capacity ?? 6),
      subtaskCount: 0,
      lateCount: 0,
    }))
  return { id: s.id, title: s.title ?? '', startDate, endDate, status: s.status ?? '', isLate, assignees }
}

export function calcAccumulatedLateDays(subtasks: ClientSubtask[], today: string): number {
  return subtasks
    .filter((s) => s.isLate && s.endDate !== '')
    .reduce((acc, s) => {
      const diff = Math.floor((new Date(today + 'T00:00:00').getTime() - new Date(s.endDate + 'T00:00:00').getTime()) / 86400000)
      return acc + Math.max(0, diff)
    }, 0)
}

export function calcTaskPriority(
  lateSubtasks: ClientSubtask[],
  subtasks: ClientSubtask[],
  concludedAt: string | null,
  in7Days: string,
): ClientTask['priority'] {
  if (lateSubtasks.length > 0) return 'critical'
  if (!concludedAt && subtasks.some((s) => !s.isLate && s.endDate !== '' && s.endDate <= in7Days)) return 'important'
  return 'backlog'
}

const HOURS_PER_DAY = 8

function startOfWeek(today: string): string {
  const d = new Date(today + 'T00:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

function endOfWeek(today: string): string {
  const d = new Date(startOfWeek(today) + 'T00:00:00')
  d.setDate(d.getDate() + 6)
  return d.toISOString().split('T')[0]
}

function startOfMonth(today: string): string {
  return today.slice(0, 8) + '01'
}

function endOfMonth(today: string): string {
  const d = new Date(today.slice(0, 8) + '01T00:00:00')
  d.setMonth(d.getMonth() + 1)
  d.setDate(0)
  return d.toISOString().split('T')[0]
}

function hoursInWindow(startDate: string, endDate: string, from: string, to: string): number {
  const s = startDate > from ? startDate : from
  const e = endDate < to ? endDate : to
  if (s > e) return 0
  return businessDaysBetween(s, e) * HOURS_PER_DAY
}

export function applyOtherClientWorkload(
  memberMap: Map<string, ClientMember>,
  otherClientTasks: RawTaskWithClient[],
  today: string,
): void {
  const wStart = startOfWeek(today)
  const wEnd = endOfWeek(today)
  const mStart = startOfMonth(today)
  const mEnd = endOfMonth(today)

  for (const t of otherClientTasks) {
    if (t.concluded_at) continue
    const clientName = t.clients?.name ?? undefined
    for (const s of t.task_subtasks ?? []) {
      const startDate = s.start_date ?? ''
      const endDate = s.end_date ?? ''
      if (!startDate || !endDate) continue
      const totalHours = businessDaysBetween(startDate, endDate) * HOURS_PER_DAY
      const weekH = hoursInWindow(startDate, endDate, wStart, wEnd)
      const monthH = hoursInWindow(startDate, endDate, mStart, mEnd)

      for (const a of s.subtask_assignees ?? []) {
        const m = memberMap.get(a.member_id)
        if (!m) continue

        m.totalActiveHours = (m.totalActiveHours ?? 0) + totalHours
        m.weekHours = (m.weekHours ?? 0) + weekH
        m.monthHours = (m.monthHours ?? 0) + monthH

        const seg: WorkloadSegment = {
          taskId: t.id,
          taskTitle: t.title,
          clientName,
          subtaskTitle: s.title ?? '',
          hours: totalHours,
          isOtherClient: true,
        }
        m.segments = [...(m.segments ?? []), seg]

        if (weekH > 0) {
          const clampedStart = startDate > wStart ? startDate : wStart
          const clampedEnd = endDate < wEnd ? endDate : wEnd
          const weekSeg: WorkloadSegment = { ...seg, hours: hoursInWindow(clampedStart, clampedEnd, wStart, wEnd) }
          m.weekSegments = [...(m.weekSegments ?? []), weekSeg]
        }
      }
    }
  }
}

export function buildTaskList(rawTasks: RawTask[], today: string, in7Days: string): { taskList: ClientTask[]; memberMap: Map<string, ClientMember> } {
  const memberMap = new Map<string, ClientMember>()
  const wStart = startOfWeek(today)
  const wEnd = endOfWeek(today)
  const mStart = startOfMonth(today)
  const mEnd = endOfMonth(today)

  const taskList: ClientTask[] = rawTasks.map((t) => {
    const rawSubs = (t.task_subtasks ?? []) as RawSubtask[]
    const subtasks = rawSubs.map((s) => parseSubtask(s, today, !!t.concluded_at))
    const lateSubtasks = subtasks.filter((s) => s.isLate)
    const accumulatedLateDays = calcAccumulatedLateDays(subtasks, today)
    const priority = calcTaskPriority(lateSubtasks, subtasks, t.concluded_at, in7Days)

    if (!t.concluded_at) {
      for (const s of subtasks) {
        const hours = s.startDate && s.endDate
          ? businessDaysBetween(s.startDate, s.endDate) * HOURS_PER_DAY
          : 0
        const weekH = s.startDate && s.endDate ? hoursInWindow(s.startDate, s.endDate, wStart, wEnd) : 0
        const monthH = s.startDate && s.endDate ? hoursInWindow(s.startDate, s.endDate, mStart, mEnd) : 0

        for (const a of s.assignees) {
          const existing = memberMap.get(a.id)
          if (existing) {
            existing.subtaskCount++
            existing.totalActiveHours = (existing.totalActiveHours ?? 0) + hours
            existing.weekHours = (existing.weekHours ?? 0) + weekH
            existing.monthHours = (existing.monthHours ?? 0) + monthH
            if (s.isLate) existing.lateCount++
          } else {
            memberMap.set(a.id, {
              ...a,
              subtaskCount: 1,
              totalActiveHours: hours,
              weekHours: weekH,
              monthHours: monthH,
              lateCount: s.isLate ? 1 : 0,
            })
          }
          if (hours > 0) {
            const seg: WorkloadSegment = { taskId: t.id, taskTitle: t.title, subtaskTitle: s.title, hours }
            const m = memberMap.get(a.id)!
            m.segments = [...(m.segments ?? []), seg]
            if (weekH > 0) {
              const clampedStart = s.startDate > wStart ? s.startDate : wStart
              const clampedEnd = s.endDate < wEnd ? s.endDate : wEnd
              const weekSeg: WorkloadSegment = { ...seg, hours: hoursInWindow(clampedStart, clampedEnd, wStart, wEnd) }
              m.weekSegments = [...(m.weekSegments ?? []), weekSeg]
            }
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

  return { taskList, memberMap }
}

export function seedMemberMap(memberMap: Map<string, ClientMember>, allClientMembers: RawMember[]): void {
  for (const m of allClientMembers) {
    if (!memberMap.has(m.id)) {
      memberMap.set(m.id, {
        id: m.id,
        name: m.name,
        role: m.role,
        avatarUrl: m.avatar_url,
        capacity: Math.max(1, m.capacity ?? 6),
        subtaskCount: 0,
        lateCount: 0,
      })
    }
  }
}

export function mergeClientMembers(memberMap: Map<string, ClientMember>, allClientMembers: RawMember[]): ClientMember[] {
  seedMemberMap(memberMap, allClientMembers)
  return [...memberMap.values()].sort((a, b) => b.subtaskCount - a.subtaskCount)
}

export function buildTimeline(openTasks: ClientTask[], today: string, in7Days: string): TimelineEntry[] {
  const entries: TimelineEntry[] = []
  for (const task of openTasks) {
    for (const sub of task.subtasks) {
      if (sub.endDate === '') continue
      if (sub.endDate <= in7Days) {
        const daysFromNow = Math.floor(
          (new Date(sub.endDate + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000,
        )
        entries.push({
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
  return entries.sort((a, b) => a.endDate.localeCompare(b.endDate))
}

export function buildFocusTasks(openTasks: ClientTask[]): ClientTask[] {
  const priorityOrder: Record<ClientTask['priority'], number> = { critical: 0, important: 1, backlog: 2 }
  return [...openTasks]
    .sort((a, b) => {
      const diff = priorityOrder[a.priority] - priorityOrder[b.priority]
      return diff !== 0 ? diff : b.accumulatedLateDays - a.accumulatedLateDays
    })
    .slice(0, 5)
}

export function calcKpis(taskList: ClientTask[], openTasks: ClientTask[], concludedTasks: ClientTask[]): ClientOverviewKpis {
  return {
    openTasks: openTasks.length,
    lateTasks: openTasks.filter((t) => t.lateSubtaskCount > 0).length,
    concludedTasks: concludedTasks.length,
    totalSubtasks: taskList.reduce((acc, t) => acc + t.subtaskCount, 0),
    lateSubtasks: taskList.reduce((acc, t) => acc + t.lateSubtaskCount, 0),
    accumulatedLateDays: taskList.reduce((acc, t) => acc + t.accumulatedLateDays, 0),
  }
}

export function calcHealth(lateTasks: number, criticalTasks: number, dueSoonTasks: number): ClientHealthStatus {
  if (lateTasks >= 4 || criticalTasks >= 2) return 'critical'
  if (lateTasks >= 1 || dueSoonTasks >= 2) return 'warning'
  return 'healthy'
}

export function buildHealth(openTasks: ClientTask[]): ClientHealth {
  const lateTasks = openTasks.filter((t) => t.lateSubtaskCount > 0).length
  const criticalTasks = openTasks.filter((t) => t.priority === 'critical').length
  const dueSoonTasks = openTasks.filter((t) => t.priority === 'important').length
  return {
    status: calcHealth(lateTasks, criticalTasks, dueSoonTasks),
    lateTasks,
    criticalTasks,
    dueSoonTasks,
  }
}
