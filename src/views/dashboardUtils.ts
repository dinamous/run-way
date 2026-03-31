import { formatDate } from '../utils/dateUtils';
import {
  STEP_META,
  migrateLegacyTask,
  getCurrentStep,
  isStepBlocked,
  type Step,
  type StepType,
} from '../lib/steps';

// ─── Constants ───────────────────────────────────────────────────────────────

export const PT_MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
export const PT_DAYS_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

export const MAX_SLOTS = 3;
export const SLOT_HEIGHT = 28;
export const DAY_HEADER_H = 32;
export const ROW_PADDING = 8;
export const DAY_COL_W = 36;

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function toLocalDate(str: string): Date {
  return new Date(str + 'T00:00:00');
}

export function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function todayStr(): string {
  return toDateStr(new Date());
}

export function getMonthWeeks(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay();
  const gridStart = new Date(firstDay);
  gridStart.setDate(gridStart.getDate() - startDow);

  const weeks: Date[][] = [];
  const cur = new Date(gridStart);
  while (true) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
    if (cur > lastDay && weeks.length >= 4) break;
  }
  return weeks;
}

export function normaliseTask(task: any): any {
  if (task.steps) return task;
  const migrated = migrateLegacyTask(task);
  return { ...task, ...migrated };
}

export function getVisibleSteps(task: any): Step[] {
  const norm = normaliseTask(task);
  return (norm.steps as Step[]).filter(s => s.active && s.start && s.end);
}

export function getTaskStatusDisplay(task: any): { label: string; cls: string } {
  const norm = normaliseTask(task);
  const today = todayStr();
  const step = getCurrentStep(norm.steps, today);
  const stepLabel = step ? (STEP_META[step.type]?.label ?? step.type) : 'Sem steps';
  if (norm.status?.blocked) {
    return {
      label: `${stepLabel} · Bloqueado`,
      cls: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
    };
  }
  if (!step) {
    return { label: 'Sem steps', cls: 'bg-muted text-muted-foreground' };
  }
  if (step.end < today) {
    return { label: `${stepLabel} · Concluído`, cls: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' };
  }
  if (step.start > today) {
    return { label: `${stepLabel} · Backlog`, cls: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200' };
  }
  return { label: `${stepLabel} · Em andamento`, cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' };
}

// ─── Bar layout ───────────────────────────────────────────────────────────────

export interface BarItem {
  taskId: string;
  taskTitle: string;
  stepType: StepType;
  stepStart: string;
  startCol: number;
  endCol: number;
  slot: number;
}

export function layoutWeekBars(weekDays: Date[], tasks: any[]): BarItem[] {
  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];

  type Raw = Omit<BarItem, 'slot'>;
  const raw: Raw[] = [];

  for (const task of tasks) {
    const steps = getVisibleSteps(task);
    for (const step of steps) {
      const pStart = toLocalDate(step.start);
      const pEnd = toLocalDate(step.end);
      if (pEnd < weekStart || pStart > weekEnd) continue;
      const startCol = Math.max(0, Math.round((pStart.getTime() - weekStart.getTime()) / 86400000));
      const endCol   = Math.min(6, Math.round((pEnd.getTime() - weekStart.getTime()) / 86400000));
      raw.push({ taskId: task.id, taskTitle: task.title, stepType: step.type, stepStart: step.start, startCol, endCol });
    }
  }

  raw.sort((a, b) => a.startCol - b.startCol || (b.endCol - b.startCol) - (a.endCol - a.startCol));

  const slotEnds: number[] = [];
  const bars: BarItem[] = [];
  for (const r of raw) {
    let slot = slotEnds.findIndex(end => end < r.startCol);
    if (slot === -1) { slot = slotEnds.length; slotEnds.push(r.endCol); }
    else slotEnds[slot] = r.endCol;
    bars.push({ ...r, slot });
  }
  return bars;
}

// ─── Drag types ──────────────────────────────────────────────────────────────

export interface DragState {
  type: 'move' | 'resize-start' | 'resize-end';
  taskId: string;
  stepType: StepType;
  originalStart: Date;
  originalEnd: Date;
  startX: number;
  colWidth: number;
}

export interface DragPreview {
  taskId: string;
  stepType: StepType;
  deltaDays: number;
  type: DragState['type'];
}

// Re-export used downstream
export { formatDate, STEP_META, isStepBlocked, type Step, type StepType };
