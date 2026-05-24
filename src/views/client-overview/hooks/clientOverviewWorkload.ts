import { businessDaysBetween } from '@/utils/dateUtils'
import type { WorkloadSegment } from '@/components/workload/CapacityTeam'
import type { ClientMember, ClientTask } from './useClientOverviewData'
import type { RawSubtask, RawTask, RawMember } from './clientOverviewRawTypes'
import type { RawTaskWithClient } from './clientOverviewService'
import { parseSubtask, calcAccumulatedLateDays, calcTaskPriority } from './clientOverviewTransformers'

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

export function hoursInWindow(startDate: string, endDate: string, from: string, to: string): number {
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

export function buildTaskList(
  rawTasks: RawTask[],
  today: string,
  in7Days: string,
): { taskList: ClientTask[]; memberMap: Map<string, ClientMember> } {
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
