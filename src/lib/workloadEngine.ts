import type { Task } from './steps';

export interface MemberWorkloadInput {
  memberId: string;
  capacity: number; // slots per day (1–50)
  activeTasks: Task[];     // tasks in-progress assigned to this member
  concludedTasks: Task[];  // tasks concluded in the last 14 days (for throughput)
  today: string;           // YYYY-MM-DD
}

export interface MemberWorkloadMetrics {
  memberId: string;
  tasksInProgress: number;
  totalActiveSubtasks: number;
  lateCount: number;
  stuckTasksCount: number;
  avgTaskAgeHours: number;
  oldestTaskAgeHours: number;
  throughput7dHours: number;
  throughput14dHours: number;
  pressureScore: number;
  status: 'overloaded' | 'busy' | 'available';
  estimatedCompletionDate: string | null;
  insights: string[];
}

const EXPECTED_CYCLE_HOURS = 40; // baseline for timeFactor when no expectedHours

function ageHours(startedAt: string, today: string): number {
  const start = new Date(startedAt).getTime();
  const end = new Date(today + 'T00:00:00').getTime();
  return Math.max(0, (end - start) / (1000 * 60 * 60));
}

function isStuck(task: Task, todayStr: string): boolean {
  if (!task.startedAt || !task.expectedHours) return false;
  return ageHours(task.startedAt, todayStr) > task.expectedHours * 1.5;
}

function throughputHours(tasks: Task[], today: string, days: number): number {
  const cutoff = new Date(today + 'T00:00:00');
  cutoff.setDate(cutoff.getDate() - days);
  return tasks
    .filter(t => {
      if (!t.concludedAt) return false;
      return new Date(t.concludedAt) >= cutoff;
    })
    .reduce((sum, t) => sum + (t.expectedHours ?? 1), 0);
}

export function computeMemberWorkload(input: MemberWorkloadInput): MemberWorkloadMetrics {
  const { memberId, capacity, activeTasks, concludedTasks, today } = input;

  const totalActiveSubtasks = activeTasks.reduce((sum, t) => {
    return sum + t.subtasks.filter(s => s.active && s.assignees.includes(memberId)).length;
  }, 0);

  const todayDate = new Date(today + 'T00:00:00');

  const lateCount = activeTasks.filter(t => {
    if (!t.dueDate) return false;
    return new Date(t.dueDate + 'T00:00:00') < todayDate;
  }).length;

  const stuckTasksCount = activeTasks.filter(t => isStuck(t, today)).length;

  const ages = activeTasks
    .filter(t => t.startedAt)
    .map(t => ageHours(t.startedAt!, today));

  const avgTaskAgeHours = ages.length > 0 ? ages.reduce((a, b) => a + b, 0) / ages.length : 0;
  const oldestTaskAgeHours = ages.length > 0 ? Math.max(...ages) : 0;

  const throughput7dHours = throughputHours(concludedTasks, today, 7);
  const throughput14dHours = throughputHours(concludedTasks, today, 14);

  const loadRatio = capacity > 0 ? totalActiveSubtasks / capacity : 0;
  const delayFactor = Math.min(lateCount * 0.15, 1);
  const stuckFactor = Math.min(stuckTasksCount * 0.20, 1);
  const timeFactor = Math.min(avgTaskAgeHours / EXPECTED_CYCLE_HOURS, 1);

  const pressureScore = (loadRatio * 0.5) + (delayFactor * 0.2) + (stuckFactor * 0.2) + (timeFactor * 0.1);

  const status: MemberWorkloadMetrics['status'] =
    pressureScore >= 0.8 ? 'overloaded' :
    pressureScore >= 0.5 ? 'busy' :
    'available';

  let estimatedCompletionDate: string | null = null;
  if (throughput7dHours > 0) {
    const remainingHours = activeTasks.reduce((sum, t) => sum + (t.expectedHours ?? 1), 0);
    const daysNeeded = remainingHours / (throughput7dHours / 7);
    const completion = new Date(today + 'T00:00:00');
    completion.setDate(completion.getDate() + Math.ceil(daysNeeded));
    estimatedCompletionDate = completion.toISOString().split('T')[0];
  }

  const insights: string[] = [];
  if (pressureScore >= 0.8) {
    insights.push('Carga crítica — risco de entrega comprometida.');
  } else if (pressureScore >= 0.6) {
    insights.push('Carga elevada — atenção ao fluxo.');
  }
  if (stuckTasksCount > 0) {
    insights.push(`${stuckTasksCount} demanda${stuckTasksCount > 1 ? 's' : ''} parada${stuckTasksCount > 1 ? 's' : ''} além do tempo esperado.`);
  }
  if (throughput7dHours === 0 && activeTasks.length > 0) {
    insights.push('Nenhuma entrega nos últimos 7 dias.');
  }
  if (estimatedCompletionDate) {
    const [y, m, d] = estimatedCompletionDate.split('-');
    insights.push(`Estimativa de conclusão: ${d}/${m}/${y}.`);
  }

  return {
    memberId,
    tasksInProgress: activeTasks.length,
    totalActiveSubtasks,
    lateCount,
    stuckTasksCount,
    avgTaskAgeHours,
    oldestTaskAgeHours,
    throughput7dHours,
    throughput14dHours,
    pressureScore,
    status,
    estimatedCompletionDate,
    insights,
  };
}
