import { computeMemberWorkload, type MemberWorkloadMetrics } from '@/lib/workloadEngine'
import type { WorkloadMember } from '@/components/workload/CapacityTeam'
import type { Task } from '@/lib/steps'
import type { ConcludedTaskRow } from '@/lib/queries'

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

  const workloadMember: WorkloadMember = {
    ...member,
    subtaskCount: metrics.totalActiveSubtasks,
    lateCount: metrics.lateCount,
  }

  return {
    member: workloadMember,
    metrics,
    insights: metrics.insights,
  }
}
