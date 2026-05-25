import { computeMemberWorkload, type MemberWorkloadMetrics } from '@/lib/workloadEngine'
import { businessDaysBetween } from '@/utils/dateUtils'
import type { WorkloadMember, WorkloadSegment } from '@/components/workload/CapacityTeam'
import type { Task } from '@/lib/steps'
import type { ConcludedTaskRow } from '@/lib/queries'

const HOURS_PER_DAY = 8

function startOfWeek(today: string): string {
  const d = new Date(today + 'T00:00:00')
  const day = d.getDay() // 0=Sun
  const diff = day === 0 ? -6 : 1 - day // Monday
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

function endOfWeek(today: string): string {
  const d = new Date(startOfWeek(today) + 'T00:00:00')
  d.setDate(d.getDate() + 6) // Sunday
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

function hoursInPeriod(memberId: string, activeTasks: Task[], from: string, to: string): number {
  return activeTasks.flatMap(t =>
    t.subtasks.filter(s => s.active && s.assignees.includes(memberId))
  ).reduce((sum, s) => {
    const start = s.start > from ? s.start : from
    const end = s.end < to ? s.end : to
    if (start > end) return sum
    return sum + businessDaysBetween(start, end) * HOURS_PER_DAY
  }, 0)
}

export interface PersonalWorkload {
  member: WorkloadMember | null
  metrics: MemberWorkloadMetrics | null
  insights: string[]
}

interface MemberProfile {
  id: string
  name: string
  role: string
  avatarUrl: string | null
  capacity: number
}

export function buildPersonalWorkload(
  member: MemberProfile | null,
  activeTasks: Task[],
  concludedTasks: ConcludedTaskRow[],
  today: string,
): PersonalWorkload {
  if (!member) return { member: null, metrics: null, insights: [] }

  // Filter tasks assigned to this member
  const memberActiveTasks = activeTasks.filter(t =>
    t.subtasks.some(s => s.assignees.includes(member.id))
  )

  // Convert ConcludedTaskRow to Task-like objects for the engine
  const concludedForEngine: Task[] = concludedTasks
    .filter(t => t.memberIds.includes(member.id))
    .map(t => ({
      id: t.id,
      title: '',
      status: { blocked: false },
      subtasks: [],
      priorityOrder: 0,
      createdAt: t.concludedAt,
      concludedAt: t.concludedAt,
      expectedHours: t.expectedHours ?? undefined,
    }))

  const metrics = computeMemberWorkload({
    memberId: member.id,
    capacity: member.capacity,
    activeTasks: memberActiveTasks,
    concludedTasks: concludedForEngine,
    today,
  })

  const weekHours = hoursInPeriod(member.id, memberActiveTasks, startOfWeek(today), endOfWeek(today))
  const monthHours = hoursInPeriod(member.id, memberActiveTasks, startOfMonth(today), endOfMonth(today))

  const wStart = startOfWeek(today)
  const wEnd = endOfWeek(today)

  const segments: WorkloadSegment[] = memberActiveTasks.flatMap(t =>
    t.subtasks
      .filter(s => s.active && s.assignees.includes(member.id) && s.start && s.end)
      .map(s => ({
        taskId: t.id,
        taskTitle: t.title,
        clientName: t.clientName,
        subtaskTitle: s.title,
        hours: businessDaysBetween(s.start, s.end) * HOURS_PER_DAY,
      }))
  )

  const weekSegments: WorkloadSegment[] = memberActiveTasks.flatMap(t =>
    t.subtasks
      .filter(s =>
        s.active &&
        s.assignees.includes(member.id) &&
        s.start && s.end &&
        s.start <= wEnd && s.end >= wStart
      )
      .map(s => {
        const clampedStart = s.start > wStart ? s.start : wStart
        const clampedEnd = s.end < wEnd ? s.end : wEnd
        return {
          taskId: t.id,
          taskTitle: t.title,
          clientName: t.clientName,
          subtaskTitle: s.title,
          hours: businessDaysBetween(clampedStart, clampedEnd) * HOURS_PER_DAY,
        }
      })
  )

  const workloadMember: WorkloadMember = {
    ...member,
    subtaskCount: metrics.totalActiveSubtasks,
    totalActiveHours: metrics.totalActiveHours,
    weekHours,
    monthHours,
    lateCount: metrics.lateCount,
    stuckTasksCount: metrics.stuckTasksCount,
    pressureScore: metrics.pressureScore,
    status: metrics.status,
    estimatedCompletionDate: metrics.estimatedCompletionDate,
    segments,
    weekSegments,
  }

  return {
    member: workloadMember,
    metrics,
    insights: metrics.insights,
  }
}
