import { migrateLegacyTask, getCurrentStep } from '@/lib/steps';
import type { Task, Step, LegacyTask, StepType } from '@/lib/steps';
import type { Member } from '@/hooks/useSupabase';

// ─── Pure helpers ─────────────────────────────────────────────────────────────

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function calDaysBetween(a: string, b: string) {
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);
}

export function businessDaysLeft(endStr: string, fromStr: string): number {
  let count = 0;
  const end = new Date(endStr + 'T00:00:00');
  const d = new Date(fromStr + 'T00:00:00');
  if (d > end) return 0;
  while (d <= end) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

export function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

export function getLeadTime(task: { createdAt?: string; created_at?: string }, lastDeadline: string | null): number | null {
  const createdAt = task.createdAt || task.created_at;
  if (!createdAt || !lastDeadline) return null;
  const created = new Date(createdAt).toISOString().split('T')[0];
  return calDaysBetween(created, lastDeadline);
}

export function isTaskStagnant(lastUpdatedAt: string | null, daysThreshold: number = 4): boolean {
  if (!lastUpdatedAt) return false;
  const days = calDaysBetween(lastUpdatedAt.split('T')[0], todayStr());
  return days > daysThreshold;
}

export function normalizeTask(task: Task | LegacyTask): Task {
  if ((task as Task).steps && typeof (task as Task).status === 'object') return task as Task;
  const migrated = migrateLegacyTask(task as LegacyTask);
  return { ...(task as object), ...migrated } as Task;
}

export function getVisibleSteps(task: Task | LegacyTask): Step[] {
  return normalizeTask(task).steps.filter(s => s.active && s.start && s.end);
}

export function getLastDeadline(task: Task | LegacyTask): string | null {
  const steps = getVisibleSteps(task);
  if (steps.length === 0) return null;
  return steps.reduce((max, s) => s.end > max ? s.end : max, steps[0].end);
}

export function getFirstStart(task: Task | LegacyTask): string | null {
  const steps = getVisibleSteps(task);
  if (steps.length === 0) return null;
  return steps.reduce((min, s) => s.start < min ? s.start : min, steps[0].start);
}

export function getTaskMembers(task: Task | LegacyTask): string[] {
  return [...new Set(getVisibleSteps(task).flatMap(s => s.assignees))];
}

export function getRisk(task: Task | LegacyTask, today: string): 'ok' | 'risco' | 'atrasado' | 'concluido' {
  const norm = normalizeTask(task);
  const lastDeadline = getLastDeadline(task);
  if (!lastDeadline) return 'ok';
  if (today > lastDeadline) return 'atrasado';
  const daysLeft = calDaysBetween(today, lastDeadline);
  if (norm.status?.blocked) return 'risco';
  if (daysLeft <= 2) return 'risco';
  return 'ok';
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type EnrichedTask = Task & {
  visibleSteps: Step[];
  lastDeadline: string | null;
  firstStart: string | null;
  risk: 'ok' | 'risco' | 'atrasado' | 'concluido';
  daysLeft: number;
  bizLeft: number;
  taskMembers: Member[];
  currentStep: Step | null;
  progress: number;
  isBlocked: boolean;
  leadTime: number | null;
  cycleTime: number | null;
  isStagnant: boolean;
  stagnationDays: number;
};

export type MemberLoad = Member & {
  activeCount: number;
  atrasadasCount: number;
  riscoCount: number;
  capacityLabel: string;
  capacityColor: string;
  wipCount: number;
};

export type FlowMetrics = {
  avgLeadTime: number;
  p85LeadTime: number;
  avgCycleTime: number;
  p85CycleTime: number;
  throughput: Record<string, number>;
  cfd: { date: string; backlog: number; inProgress: number; done: number }[];
  scatterData: { date: string; duration: number; stepType: StepType }[];
  p85ByStep: Record<StepType, number>;
};

// ─── Enrichment ───────────────────────────────────────────────────────────────

export function enrichTask(task: Task | LegacyTask, today: string, members: Member[]): EnrichedTask {
  const norm = normalizeTask(task);
  const visibleSteps = getVisibleSteps(task);
  const lastDeadline = getLastDeadline(task);
  const firstStart = getFirstStart(task);
  const risk = getRisk(task, today);
  const daysLeft = lastDeadline ? calDaysBetween(today, lastDeadline) : 0;
  const bizLeft = lastDeadline ? businessDaysLeft(lastDeadline, today) : 0;
  const memberIds = getTaskMembers(task);
  const taskMembers = members.filter(m => memberIds.includes(m.id));
  const currentStep = getCurrentStep(norm.steps ?? [], today);

  let progress = 0;
  if (visibleSteps.length > 0 && lastDeadline && firstStart) {
    const totalDuration = calDaysBetween(firstStart, lastDeadline);
    const elapsed = Math.max(0, calDaysBetween(firstStart, today));
    progress = totalDuration > 0 ? Math.min(100, Math.round((elapsed / totalDuration) * 100)) : 0;
  }

  const leadTime = getLeadTime(norm, lastDeadline);
  const isStagnant = isTaskStagnant((norm as Task & { updatedAt?: string }).updatedAt ?? null);
  const stagnationDays = isStagnant ? calDaysBetween(((norm as Task & { updatedAt?: string }).updatedAt ?? '').split('T')[0], today) : 0;

  return {
    ...norm,
    visibleSteps,
    lastDeadline,
    firstStart,
    risk,
    daysLeft,
    bizLeft,
    taskMembers,
    currentStep,
    progress,
    isBlocked: norm.status?.blocked ?? false,
    leadTime,
    cycleTime: leadTime,
    isStagnant,
    stagnationDays,
  };
}

export function computeMemberLoad(member: Member, enriched: EnrichedTask[], today: string): MemberLoad {
  const atrasadasCount = enriched.filter(t => t.risk === 'atrasado' && getTaskMembers(t).includes(member.id)).length;
  const riscoCount = enriched.filter(t => t.risk === 'risco' && getTaskMembers(t).includes(member.id)).length;

  let activeCount = 0;
  let wipCount = 0;
  for (const t of enriched) {
    for (const step of t.visibleSteps) {
      if (step.assignees.includes(member.id) && step.start <= today && step.end >= today) {
        activeCount++;
        wipCount++;
      }
    }
  }

  let capacityLabel = 'Livre';
  let capacityColor = 'bg-green-500';
  if (activeCount > 3) { capacityLabel = 'Sobrecarregado'; capacityColor = 'bg-red-500'; }
  else if (activeCount >= 3) { capacityLabel = 'Alocado'; capacityColor = 'bg-blue-500'; }
  else if (activeCount > 0) { capacityLabel = 'Alocado'; capacityColor = 'bg-blue-400'; }

  return { ...member, activeCount, atrasadasCount, riscoCount, capacityLabel, capacityColor, wipCount };
}
