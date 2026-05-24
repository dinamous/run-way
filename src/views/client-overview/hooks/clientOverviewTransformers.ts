export type { RawMember, RawSubtaskAssignee, RawSubtask, RawTask } from './clientOverviewRawTypes'

import type { ClientSubtask, ClientMember, ClientTask, ClientOverviewKpis, ClientHealth, ClientHealthStatus, TimelineEntry } from './useClientOverviewData'
import type { RawSubtask } from './clientOverviewRawTypes'

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
      const diff = Math.floor(
        (new Date(today + 'T00:00:00').getTime() - new Date(s.endDate + 'T00:00:00').getTime()) / 86400000,
      )
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

export function calcKpis(
  taskList: ClientTask[],
  openTasks: ClientTask[],
  concludedTasks: ClientTask[],
): ClientOverviewKpis {
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
