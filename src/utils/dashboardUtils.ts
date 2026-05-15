import { formatDate, formatDateDisplay } from '../utils/dateUtils';
import {
  STEP_META,
  migrateLegacyTask,
  getCurrentSubtask,
  isStepBlocked,
  type Task,
  type Subtask,
  type SubtaskStatus,
  type LegacyTask,
} from '../lib/steps';

// ─── Constants ───────────────────────────────────────────────────────────────

export const PT_MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
export const PT_DAYS_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

export const MAX_SLOTS = 10;
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

/** Garante que a tarefa tem o formato moderno com `subtasks`. */
export function normaliseTask(task: Task | LegacyTask): Task {
  if ((task as Task).subtasks && typeof (task as Task).status === 'object') {
    return task as Task;
  }
  const migrated = migrateLegacyTask(task as LegacyTask);
  return { ...(task as object), ...migrated } as Task;
}

/** Devolve as subtasks ativas (com datas preenchidas) de uma tarefa. */
export function getVisibleSubtasks(task: Task | LegacyTask): Subtask[] {
  const norm = normaliseTask(task);
  return norm.subtasks.filter(s => s.active && s.start && s.end);
}

/** @deprecated use getVisibleSubtasks */
export function getVisibleSteps(task: Task | LegacyTask): Subtask[] {
  return getVisibleSubtasks(task);
}

export function getTaskStatusDisplay(task: Task | LegacyTask): { label: string; cls: string } {
  const norm = normaliseTask(task);
  const today = todayStr();
  const subtask = getCurrentSubtask(norm.subtasks, today);
  const stepLabel = subtask ? (STEP_META[subtask.status]?.label ?? subtask.status) : 'Sem subtasks';
  if (norm.status?.blocked) {
    return {
      label: `${stepLabel} · Bloqueado`,
      cls: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
    };
  }
  if (!subtask) {
    return { label: 'Sem subtasks', cls: 'bg-muted text-muted-foreground' };
  }
  if (subtask.end < today) {
    return { label: `${stepLabel} · Concluído`, cls: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' };
  }
  if (subtask.start > today) {
    return { label: `${stepLabel} · Backlog`, cls: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200' };
  }
  return { label: `${stepLabel} · Em andamento`, cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' };
}

// ─── Bar layout ───────────────────────────────────────────────────────────────

export type CalendarViewMode = 'step' | 'demand';

export interface BarItem {
  taskId: string;
  taskTitle: string;
  subtaskId: string;
  subtaskTitle: string;
  subtaskStatus: SubtaskStatus;
  stepStart: string;
  stepEnd: string;
  startCol: number;
  endCol: number;
  slot: number;
}

export function layoutWeekBars(weekDays: Date[], tasks: (Task | LegacyTask)[], viewMode: CalendarViewMode = 'step'): BarItem[] {
  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];

  type Raw = Omit<BarItem, 'slot'>;
  const raw: Raw[] = [];

  for (const task of tasks) {
    const subtasks = getVisibleSubtasks(task);

    if (viewMode === 'demand') {
      const sorted = subtasks.filter(s => s.start && s.end).sort((a, b) => toLocalDate(a.start).getTime() - toLocalDate(b.start).getTime());

      let groupSubtask: Subtask | null = null;
      let groupStart = '';
      let groupEnd = '';

      for (const s of sorted) {
        if (!groupSubtask) {
          groupSubtask = s;
          groupStart = s.start;
          groupEnd = s.end;
          continue;
        }

        const prevEnd = toLocalDate(groupEnd);
        const currStart = toLocalDate(s.start);
        const gapDays = Math.round((currStart.getTime() - prevEnd.getTime()) / 86400000);

        if (gapDays > 2) {
          if (groupSubtask && groupStart && groupEnd) {
            const pStart = toLocalDate(groupStart);
            const pEnd = toLocalDate(groupEnd);
            if (pEnd >= weekStart && pStart <= weekEnd) {
              const startCol = Math.max(0, Math.round((pStart.getTime() - weekStart.getTime()) / 86400000));
              const endCol = Math.min(6, Math.round((pEnd.getTime() - weekStart.getTime()) / 86400000));
              raw.push({ taskId: task.id ?? '', taskTitle: task.title ?? '', subtaskId: groupSubtask.id, subtaskTitle: groupSubtask.title, subtaskStatus: groupSubtask.status, stepStart: groupStart, stepEnd: groupEnd, startCol, endCol });
            }
          }
          groupSubtask = s;
          groupStart = s.start;
          groupEnd = s.end;
        } else {
          if (s.end > groupEnd) groupEnd = s.end;
        }
      }

      if (groupSubtask && groupStart && groupEnd) {
        const pStart = toLocalDate(groupStart);
        const pEnd = toLocalDate(groupEnd);
        if (pEnd >= weekStart && pStart <= weekEnd) {
          const startCol = Math.max(0, Math.round((pStart.getTime() - weekStart.getTime()) / 86400000));
          const endCol = Math.min(6, Math.round((pEnd.getTime() - weekStart.getTime()) / 86400000));
          raw.push({ taskId: task.id ?? '', taskTitle: task.title ?? '', subtaskId: groupSubtask.id, subtaskTitle: groupSubtask.title, subtaskStatus: groupSubtask.status, stepStart: groupStart, stepEnd: groupEnd, startCol, endCol });
        }
      }
    } else {
      for (const s of subtasks) {
        const pStart = toLocalDate(s.start);
        const pEnd = toLocalDate(s.end);
        if (pEnd < weekStart || pStart > weekEnd) continue;
        const startCol = Math.max(0, Math.round((pStart.getTime() - weekStart.getTime()) / 86400000));
        const endCol   = Math.min(6, Math.round((pEnd.getTime() - weekStart.getTime()) / 86400000));
        raw.push({ taskId: task.id ?? '', taskTitle: task.title ?? '', subtaskId: s.id, subtaskTitle: s.title, subtaskStatus: s.status, stepStart: s.start, stepEnd: s.end, startCol, endCol });
      }
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
  subtaskId: string;
  originalStart: Date;
  originalEnd: Date;
  startX: number;
  colWidth: number;
}

export interface DragPreview {
  taskId: string;
  subtaskId: string;
  deltaDays: number;
  type: DragState['type'];
}

// Re-export used downstream
export { formatDate, formatDateDisplay, STEP_META, isStepBlocked, type Task, type Subtask, type SubtaskStatus, type LegacyTask };
