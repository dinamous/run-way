import type { ClientTask, ClientSubtask, ClientMember, ClientOverviewKpis, ClientHealth, ClientHealthStatus, TimelineEntry } from './useClientOverviewData'

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
  return { id: s.id, title: s.title ?? '', endDate, status: s.status ?? '', isLate, assignees }
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

export function buildTaskList(rawTasks: RawTask[], today: string, in7Days: string): { taskList: ClientTask[]; memberMap: Map<string, ClientMember> } {
  const memberMap = new Map<string, ClientMember>()

  const taskList: ClientTask[] = rawTasks.map((t) => {
    const rawSubs = (t.task_subtasks ?? []) as RawSubtask[]
    const subtasks = rawSubs.map((s) => parseSubtask(s, today, !!t.concluded_at))
    const lateSubtasks = subtasks.filter((s) => s.isLate)
    const accumulatedLateDays = calcAccumulatedLateDays(subtasks, today)
    const priority = calcTaskPriority(lateSubtasks, subtasks, t.concluded_at, in7Days)

    if (!t.concluded_at) {
      for (const s of subtasks) {
        for (const a of s.assignees) {
          const existing = memberMap.get(a.id)
          if (existing) {
            existing.subtaskCount++
            if (s.isLate) existing.lateCount++
          } else {
            memberMap.set(a.id, { ...a, subtaskCount: 1, lateCount: s.isLate ? 1 : 0 })
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

export function mergeClientMembers(memberMap: Map<string, ClientMember>, allClientMembers: RawMember[]): ClientMember[] {
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
