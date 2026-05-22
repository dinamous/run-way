import type { WorkloadMember } from '@/components/workload/CapacityTeam'
import type { SubtaskRow } from './useOverviewData'

export interface PersonalWorkload {
  member: WorkloadMember | null
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
  subtasks: SubtaskRow[],
  today: string,
): PersonalWorkload {
  if (!member) return { member: null, insights: [] }

  const activeSubtasks = subtasks.filter((s) => s.active && !s.taskConcludedAt)
  const lateSubtasks = activeSubtasks.filter((s) => s.end < today)
  const topTasks = getTopTasks(activeSubtasks)

  const workloadMember: WorkloadMember = {
    ...member,
    subtaskCount: activeSubtasks.length,
    lateCount: lateSubtasks.length,
  }

  return {
    member: workloadMember,
    insights: buildInsights(workloadMember, topTasks),
  }
}

function getTopTasks(subtasks: SubtaskRow[]): Array<{ title: string; count: number }> {
  const byTask = new Map<string, { title: string; count: number }>()

  for (const subtask of subtasks) {
    const current = byTask.get(subtask.taskId)
    if (current) {
      current.count += 1
    } else {
      byTask.set(subtask.taskId, { title: subtask.taskTitle, count: 1 })
    }
  }

  return [...byTask.values()]
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))
    .slice(0, 2)
}

function buildInsights(
  member: WorkloadMember,
  topTasks: Array<{ title: string; count: number }>,
): string[] {
  const ratio = member.subtaskCount / member.capacity
  const insights: string[] = []

  if (member.subtaskCount === 0) {
    insights.push('Você está sem subtarefas ativas atribuídas agora.')
    return insights
  }

  if (ratio >= 1) {
    insights.push(`Você está acima da capacidade: ${member.subtaskCount}/${member.capacity} subtarefas ativas.`)
  } else if (ratio >= 0.6) {
    insights.push(`Sua carga está em atenção: ${member.subtaskCount}/${member.capacity} subtarefas ativas.`)
  } else {
    insights.push(`Você ainda tem margem: ${member.subtaskCount}/${member.capacity} subtarefas ativas.`)
  }

  if (topTasks.length > 0) {
    const taskNames = topTasks.map((task) => task.title).join(' e ')
    const totalTopSubtasks = topTasks.reduce((acc, task) => acc + task.count, 0)
    insights.push(`${taskNames} ${topTasks.length === 1 ? 'ocupa' : 'ocupam'} ${totalTopSubtasks} subtarefas da sua capacidade.`)
  }

  if (member.lateCount > 0) {
    insights.push(`${member.lateCount} subtarefa${member.lateCount === 1 ? '' : 's'} da sua carga ${member.lateCount === 1 ? 'está atrasada' : 'estão atrasadas'}.`)
  }

  return insights.slice(0, 3)
}
