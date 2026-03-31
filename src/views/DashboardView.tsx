import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Button } from '../components/ui';
import { Plus, Edit2, Trash2, Download, ChevronLeft, ChevronRight, CalendarDays, AlignLeft, WifiOff, X, AlertTriangle } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';
import {
  STEP_TYPES_ORDER,
  STEP_META,
  migrateLegacyTask,
  getCurrentStep,
  isStepBlocked,
  type Step,
  type StepType,
} from '../lib/steps';

// ─── Constants ───────────────────────────────────────────────────────────────

const PT_MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const PT_DAYS_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

const MAX_SLOTS = 3;
const SLOT_HEIGHT = 28;
const DAY_HEADER_H = 32;
const ROW_PADDING = 8;
const DAY_COL_W = 36;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toLocalDate(str: string): Date {
  return new Date(str + 'T00:00:00');
}

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function todayStr(): string {
  return toDateStr(new Date());
}

function getMonthWeeks(year: number, month: number): Date[][] {
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

/** Normalise any task to ensure it has steps + status in the new format */
function normaliseTask(task: any): any {
  if (task.steps) return task;
  const migrated = migrateLegacyTask(task);
  return { ...task, ...migrated };
}

/** Get visible steps (active + has both dates) */
function getVisibleSteps(task: any): Step[] {
  const norm = normaliseTask(task);
  return (norm.steps as Step[]).filter(s => s.active && s.start && s.end);
}

/** Derive a display status string for the task info column */
function getTaskStatusDisplay(task: any): { label: string; cls: string } {
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

interface BarItem {
  taskId: string;
  taskTitle: string;
  stepType: StepType;
  stepStart: string;
  startCol: number;
  endCol: number;
  slot: number;
}

function layoutWeekBars(weekDays: Date[], tasks: any[]): BarItem[] {
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

interface DragState {
  type: 'move' | 'resize-start' | 'resize-end';
  taskId: string;
  stepType: StepType;
  originalStart: Date;
  originalEnd: Date;
  startX: number;
  colWidth: number;
}

interface DragPreview {
  taskId: string;
  stepType: StepType;
  deltaDays: number;
  type: DragState['type'];
}

// ─── Timeline (Gantt) View ───────────────────────────────────────────────────

const TimelineView: React.FC<{
  tasks: any[];
  members: any[];
  onEdit: (t: any) => void;
  onDelete: (id: string) => void;
  onUpdateTask: (t: any) => void;
}> = ({ tasks, members, onEdit, onDelete, onUpdateTask }) => {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const [daysRange, setDaysRange] = useState(60);
  const days = useMemo(() => Array.from({ length: daysRange }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  }), [today, daysRange]);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const didDragRef = useRef(false);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const ds = dragStateRef.current;
      if (!ds) return;
      const delta = Math.round((e.clientX - ds.startX) / ds.colWidth);
      if (delta !== 0) didDragRef.current = true;
      setDragPreview({ taskId: ds.taskId, stepType: ds.stepType, deltaDays: delta, type: ds.type });
    };
    const onUp = (e: MouseEvent) => {
      const ds = dragStateRef.current;
      if (!ds) return;
      const delta = Math.round((e.clientX - ds.startX) / ds.colWidth);
      if (delta !== 0) {
        const task = tasks.find((t: any) => t.id === ds.taskId);
        if (task) {
          let newStart = new Date(ds.originalStart);
          let newEnd = new Date(ds.originalEnd);
          if (ds.type === 'move') {
            newStart = addDays(ds.originalStart, delta);
            newEnd = addDays(ds.originalEnd, delta);
          } else if (ds.type === 'resize-start') {
            newStart = addDays(ds.originalStart, delta);
            if (newStart >= newEnd) newStart = addDays(newEnd, -1);
          } else {
            newEnd = addDays(ds.originalEnd, delta);
            if (newEnd <= newStart) newEnd = addDays(newStart, 1);
          }
          const norm = normaliseTask(task);
          onUpdateTask({
            ...norm,
            steps: norm.steps.map((s: Step) =>
              s.type === ds.stepType
                ? { ...s, start: toDateStr(newStart), end: toDateStr(newEnd) }
                : s
            ),
          });
        }
      }
      dragStateRef.current = null;
      setDragPreview(null);
      setTimeout(() => { didDragRef.current = false; }, 0);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, [tasks, onUpdateTask]);

  const startDrag = useCallback((
    e: React.MouseEvent,
    taskId: string,
    stepType: StepType,
    type: DragState['type'],
    step: Step,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    dragStateRef.current = {
      type, taskId, stepType,
      originalStart: toLocalDate(step.start),
      originalEnd: toLocalDate(step.end),
      startX: e.clientX,
      colWidth: DAY_COL_W,
    };
    didDragRef.current = false;
  }, []);

  const renderBar = (step: Step, task: any) => {
    if (!step?.start || !step?.end) return null;
    const pStart = toLocalDate(step.start);
    const pEnd = toLocalDate(step.end);
    const tStart = days[0];
    const tEnd = days[days.length - 1];
    if (pEnd < tStart || pStart > tEnd) return null;

    let s = Math.round((pStart.getTime() - tStart.getTime()) / 86400000);
    let e = Math.round((pEnd.getTime() - tStart.getTime()) / 86400000);

    const dp = dragPreview;
    if (dp && dp.taskId === task.id && dp.stepType === step.type) {
      if (dp.type === 'move') { s += dp.deltaDays; e += dp.deltaDays; }
      else if (dp.type === 'resize-start') { s = Math.min(s + dp.deltaDays, e); }
      else { e = Math.max(e + dp.deltaDays, s); }
    }

    const sC = Math.max(0, s);
    const eC = Math.min(days.length - 1, e);
    if (eC < 0 || sC >= days.length) return null;

    const left = (sC / days.length) * 100;
    const width = ((eC - sC + 1) / days.length) * 100;
    const meta = STEP_META[step.type];
    const norm = normaliseTask(task);
    const blocked = isStepBlocked(norm, step.start);
    const isDragging = dp?.taskId === task.id && dp?.stepType === step.type;
    const startsHere = s >= 0;
    const endsHere = e < days.length;
    const barCls = blocked ? meta.barBlocked : meta.bar;

    return (
      <div
        key={step.type}
        className={`absolute top-1.5 bottom-1.5 ${barCls} text-[11px] font-semibold flex items-center overflow-hidden select-none ${isDragging ? 'shadow-lg z-20' : 'hover:brightness-110 z-10'}`}
        style={{
          left: `${left}%`, width: `${width}%`,
          borderRadius: `${startsHere ? 5 : 0}px ${endsHere ? 5 : 0}px ${endsHere ? 5 : 0}px ${startsHere ? 5 : 0}px`,
          cursor: isDragging ? 'grabbing' : 'grab',
          transition: isDragging ? 'none' : 'filter 0.1s',
        }}
        title={`${meta.label}: ${formatDate(pStart)} → ${formatDate(pEnd)}`}
        onMouseDown={e => startDrag(e, task.id, step.type, 'move', step)}
        onClick={() => { if (!didDragRef.current) onEdit(task); }}
      >
        {startsHere && (
          <div
            className={`absolute left-0 top-0 bottom-0 w-2 ${meta.handle} cursor-ew-resize z-20`}
            style={{ borderRadius: '5px 0 0 5px' }}
            onMouseDown={e => { e.stopPropagation(); startDrag(e, task.id, step.type, 'resize-start', step); }}
          />
        )}
        {startsHere && (
          <span className="truncate px-2 pointer-events-none flex items-center gap-1">
            {blocked && <AlertTriangle className="w-3 h-3 shrink-0" />}
            {meta.label}
          </span>
        )}
        {endsHere && (
          <div
            className={`absolute right-0 top-0 bottom-0 w-2 ${meta.handle} cursor-ew-resize z-20`}
            style={{ borderRadius: '0 5px 5px 0' }}
            onMouseDown={e => { e.stopPropagation(); startDrag(e, task.id, step.type, 'resize-end', step); }}
          />
        )}
      </div>
    );
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <div style={{ minWidth: 224 + daysRange * DAY_COL_W }}>
        {/* Header with day range selector */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted">
          <span className="text-xs font-semibold text-muted-foreground">Linha do Tempo — próximos {daysRange} dias</span>
          <div className="flex items-center gap-1">
            {[14, 30, 60, 90].map(n => (
              <button
                key={n}
                onClick={() => setDaysRange(n)}
                className={`text-xs px-2 py-0.5 rounded border transition-colors ${daysRange === n ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-card'}`}
              >{n}d</button>
            ))}
          </div>
        </div>

        {/* Column headers */}
        <div className="flex border-b border-border bg-muted sticky top-0 z-10">
          <div className="w-56 shrink-0 p-3 text-xs font-semibold text-muted-foreground border-r border-border">Demanda</div>
          <div ref={containerRef} className="flex">
            {days.map((d, i) => {
              const isToday = d.getTime() === today.getTime();
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <div key={i} className={`shrink-0 border-r border-border py-1.5 text-center ${isWeekend ? 'bg-muted' : ''}`} style={{ width: DAY_COL_W }}>
                  <div className={`text-[10px] font-bold mx-auto w-5 h-5 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-foreground'}`}>{d.getDate()}</div>
                  <div className="text-[9px] text-muted-foreground">{['D','S','T','Q','Q','S','S'][d.getDay()]}</div>
                </div>
              );
            })}
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            Nenhuma demanda. Clique em "Nova Demanda" para começar.
          </div>
        ) : tasks.map((task: any) => {
          const norm = normaliseTask(task);
          const visibleSteps = getVisibleSteps(task);
          const status = getTaskStatusDisplay(task);
          const PHASE_ROW_H = 28;
          const totalH = Math.max(visibleSteps.length, 1) * PHASE_ROW_H;
          const allMemberIds = new Set(visibleSteps.flatMap(s => s.assignees));
          const assignees = members.filter((m: any) => allMemberIds.has(m.id));

          return (
            <div key={task.id} className="flex border-b border-border group hover:bg-muted/30 transition-colors">
              {/* Left: task info */}
              <div className="w-56 shrink-0 border-r border-border relative flex flex-col justify-center px-3 py-2 gap-1" style={{ minHeight: totalH }}>
                {norm.status?.blocked && (
                  <div className="absolute top-1.5 left-1.5">
                    <AlertTriangle className="w-3 h-3 text-red-500" />
                  </div>
                )}
                <div className="font-medium text-sm text-foreground truncate pr-12 pl-4">{task.title}</div>
                <div className="flex items-center gap-1 flex-wrap pl-4">
                  {assignees.slice(0, 3).map((m: any) => (
                    <div key={m.id} className="w-4 h-4 rounded-full bg-muted text-[8px] font-bold flex items-center justify-center text-muted-foreground shrink-0" title={m.name}>{m.avatar}</div>
                  ))}
                  {assignees.length === 0 && (
                    <div className="w-4 h-4 rounded-full bg-muted border border-dashed border-muted-foreground/30 shrink-0" title="Sem responsável" />
                  )}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium truncate max-w-[120px] ${status.cls}`}>{status.label}</span>
                </div>
                <div className="absolute right-1.5 top-1.5 flex gap-0.5 opacity-0 group-hover:opacity-100 print:hidden transition-opacity">
                  <button onClick={() => onEdit(task)} className="p-1 text-muted-foreground hover:text-blue-600 rounded hover:bg-blue-50 dark:hover:bg-blue-900"><Edit2 className="w-3 h-3" /></button>
                  <button onClick={() => onDelete(task.id)} className="p-1 text-muted-foreground hover:text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>

              {/* Right: step rows */}
              <div className="flex flex-col" style={{ width: daysRange * DAY_COL_W }}>
                {visibleSteps.length === 0 ? (
                  <div className="relative overflow-hidden" style={{ height: PHASE_ROW_H, width: daysRange * DAY_COL_W }}>
                    <div className="absolute inset-0 flex pointer-events-none">
                      {days.map((d, i) => (
                        <div key={i} className={`shrink-0 border-r border-border/50 ${d.getDay() === 0 || d.getDay() === 6 ? 'bg-muted/60' : ''}`} style={{ width: DAY_COL_W }} />
                      ))}
                    </div>
                  </div>
                ) : visibleSteps.map(step => (
                  <div key={step.type} className="relative overflow-hidden" style={{ height: PHASE_ROW_H, width: daysRange * DAY_COL_W }}>
                    <div className="absolute inset-0 flex pointer-events-none">
                      {days.map((d, i) => (
                        <div key={i} className={`shrink-0 border-r border-border/50 ${d.getDay() === 0 || d.getDay() === 6 ? 'bg-muted/60' : ''}`} style={{ width: DAY_COL_W }} />
                      ))}
                    </div>
                    {renderBar(step, task)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Calendar (Month) View ───────────────────────────────────────────────────

const CalendarView: React.FC<{
  tasks: any[];
  members: any[];
  onEdit: (t: any) => void;
  onDelete: (id: string) => void;
  onUpdateTask: (t: any) => void;
}> = ({ tasks, onEdit, onUpdateTask }) => {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const [monthDate, setMonthDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const weeks = useMemo(() => getMonthWeeks(monthDate.getFullYear(), monthDate.getMonth()), [monthDate]);
  const rowHeight = DAY_HEADER_H + MAX_SLOTS * SLOT_HEIGHT + ROW_PADDING;

  const dragStateRef = useRef<DragState | null>(null);
  const didDragRef = useRef(false);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);

  const prevMonth = () => setMonthDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setMonthDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const goToday   = () => setMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const ds = dragStateRef.current;
      if (!ds) return;
      const delta = Math.round((e.clientX - ds.startX) / ds.colWidth);
      if (delta !== 0) didDragRef.current = true;
      setDragPreview({ taskId: ds.taskId, stepType: ds.stepType, deltaDays: delta, type: ds.type });
    };

    const onUp = (e: MouseEvent) => {
      const ds = dragStateRef.current;
      if (!ds) return;
      const delta = Math.round((e.clientX - ds.startX) / ds.colWidth);
      if (delta !== 0) {
        const task = tasks.find((t: any) => t.id === ds.taskId);
        if (task) {
          let newStart = new Date(ds.originalStart);
          let newEnd = new Date(ds.originalEnd);
          if (ds.type === 'move') {
            newStart = addDays(ds.originalStart, delta);
            newEnd = addDays(ds.originalEnd, delta);
          } else if (ds.type === 'resize-start') {
            newStart = addDays(ds.originalStart, delta);
            if (newStart >= newEnd) newStart = addDays(newEnd, -1);
          } else {
            newEnd = addDays(ds.originalEnd, delta);
            if (newEnd <= newStart) newEnd = addDays(newStart, 1);
          }
          const norm = normaliseTask(task);
          onUpdateTask({
            ...norm,
            steps: norm.steps.map((s: Step) =>
              s.type === ds.stepType
                ? { ...s, start: toDateStr(newStart), end: toDateStr(newEnd) }
                : s
            ),
          });
        }
      }
      dragStateRef.current = null;
      setDragPreview(null);
      setTimeout(() => { didDragRef.current = false; }, 0);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [tasks, onUpdateTask]);

  const startDrag = useCallback((
    e: React.MouseEvent,
    bar: BarItem,
    type: DragState['type'],
    task: any,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const container = (e.currentTarget as HTMLElement).closest('[data-week-row]') as HTMLElement;
    const colWidth = container ? container.getBoundingClientRect().width / 7 : 80;
    const norm = normaliseTask(task);
    const step = (norm.steps as Step[]).find(s => s.type === bar.stepType);
    if (!step) return;
    dragStateRef.current = {
      type, taskId: bar.taskId, stepType: bar.stepType,
      originalStart: toLocalDate(step.start),
      originalEnd: toLocalDate(step.end),
      startX: e.clientX,
      colWidth,
    };
    didDragRef.current = false;
  }, []);

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Month nav */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-foreground">
            {PT_MONTHS[monthDate.getMonth()]} {monthDate.getFullYear()}
          </h3>
          <button onClick={goToday} className="text-xs px-2 py-0.5 rounded border border-border text-muted-foreground hover:bg-card transition-colors">Hoje</button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border bg-muted">
        {PT_DAYS_SHORT.map((d, i) => (
          <div key={d} className={`py-2 text-center text-[11px] font-semibold uppercase tracking-wide ${i === 0 || i === 6 ? 'text-muted-foreground' : 'text-foreground'}`}>{d}</div>
        ))}
      </div>

      {/* Weeks */}
      <div>
        {weeks.map((week, wi) => {
          const bars = layoutWeekBars(week, tasks);
          const overflow = Array(7).fill(0);
          for (const bar of bars) {
            if (bar.slot >= MAX_SLOTS) {
              for (let c = bar.startCol; c <= bar.endCol; c++) overflow[c]++;
            }
          }

          return (
            <div
              key={wi}
              data-week-row
              className="relative grid grid-cols-7 border-b border-border last:border-b-0"
              style={{ height: rowHeight, overflow: 'hidden' }}
            >
              {/* Day cells */}
              {week.map((day, di) => {
                const isToday = day.getTime() === today.getTime();
                const isThisMonth = day.getMonth() === monthDate.getMonth();
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                const hasOverflow = overflow[di] > 0;
                return (
                  <div
                    key={di}
                    className={`border-r border-border last:border-r-0 flex flex-col select-none ${
                      !isThisMonth ? 'bg-muted' : isWeekend ? 'bg-muted' : 'bg-card'
                    }`}
                    style={{ height: rowHeight }}
                  >
                    <div className="flex items-center justify-center" style={{ height: DAY_HEADER_H }}>
                      <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday ? 'bg-blue-600 text-white font-bold' :
                        !isThisMonth ? 'text-muted-foreground' :
                        isWeekend ? 'text-muted-foreground' :
                        'text-foreground'
                      }`}>{day.getDate()}</span>
                    </div>
                    {hasOverflow && (
                      <div className="mt-auto mb-1 text-center">
                        <span className="text-[9px] text-muted-foreground font-medium">+{overflow[di]}</span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Step bars */}
              {bars.filter(b => b.slot < MAX_SLOTS).map((bar, bi) => {
                const meta = STEP_META[bar.stepType];
                const task = tasks.find((t: any) => t.id === bar.taskId);
                const colW = 100 / 7;

                let adjStart = bar.startCol;
                let adjEnd = bar.endCol;
                if (dragPreview && dragPreview.taskId === bar.taskId && dragPreview.stepType === bar.stepType) {
                  const d = dragPreview.deltaDays;
                  if (dragPreview.type === 'move') { adjStart = bar.startCol + d; adjEnd = bar.endCol + d; }
                  else if (dragPreview.type === 'resize-start') { adjStart = Math.min(bar.startCol + d, bar.endCol); }
                  else { adjEnd = Math.max(bar.endCol + d, bar.startCol); }
                }

                const clampedStart = Math.max(0, Math.min(6, adjStart));
                const clampedEnd   = Math.max(0, Math.min(6, adjEnd));
                const left   = clampedStart * colW;
                const width  = (clampedEnd - clampedStart + 1) * colW;
                const top    = DAY_HEADER_H + bar.slot * SLOT_HEIGHT + 3;
                const startsHere = bar.startCol >= 0;
                const endsHere   = bar.endCol <= 6;
                const isDragging = dragPreview?.taskId === bar.taskId && dragPreview?.stepType === bar.stepType;
                const norm = task ? normaliseTask(task) : null;
                const blocked = norm ? isStepBlocked(norm, bar.stepStart) : false;
                const barCls = blocked ? meta.barBlocked : meta.bar;

                return (
                  <div
                    key={`${bar.taskId}-${bar.stepType}-${bi}`}
                    className={`absolute ${barCls} text-[11px] font-semibold flex items-center overflow-hidden z-10 group/bar select-none ${isDragging ? 'shadow-lg' : 'hover:brightness-110'}`}
                    style={{
                      top,
                      height: SLOT_HEIGHT - 4,
                      left: `calc(${left}% + ${startsHere ? 3 : 0}px)`,
                      width: `calc(${width}% - ${(startsHere ? 3 : 0) + (endsHere ? 3 : 0)}px)`,
                      borderRadius: `${startsHere ? 5 : 0}px ${endsHere ? 5 : 0}px ${endsHere ? 5 : 0}px ${startsHere ? 5 : 0}px`,
                      cursor: isDragging ? 'grabbing' : 'grab',
                      transition: isDragging ? 'none' : 'filter 0.1s',
                    }}
                    title={`${task?.title} · ${meta.label}${blocked ? ' · BLOQUEADO' : ''}`}
                    onMouseDown={e => task && startDrag(e, bar, 'move', task)}
                    onClick={() => { if (!didDragRef.current && task) onEdit(task); }}
                  >
                    {startsHere && (
                      <div
                        className={`absolute left-0 top-0 bottom-0 w-2 ${meta.handle} rounded-l-[5px] cursor-ew-resize z-20`}
                        onMouseDown={e => { e.stopPropagation(); task && startDrag(e, bar, 'resize-start', task); }}
                      />
                    )}
                    {startsHere && (
                      <span className="flex items-center gap-1 px-1.5 truncate leading-none pointer-events-none min-w-0">
                        {blocked
                          ? <AlertTriangle className="w-3 h-3 shrink-0" />
                          : <span className={`shrink-0 text-[9px] font-bold px-1 py-0.5 rounded ${meta.tagBg}`}>{meta.tag}</span>
                        }
                        <span className="truncate text-[11px]">{task?.title}</span>
                      </span>
                    )}
                    {endsHere && (
                      <div
                        className={`absolute right-0 top-0 bottom-0 w-2 ${meta.handle} rounded-r-[5px] cursor-ew-resize z-20`}
                        onMouseDown={e => { e.stopPropagation(); task && startDrag(e, bar, 'resize-end', task); }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Dashboard ───────────────────────────────────────────────────────────────

const DashboardView: React.FC<any> = ({ tasks, members, onEdit, onDelete, onUpdateTask, onOpenNew, onExport, isConnected }) => {
  const [calView, setCalView] = useState<'calendar' | 'timeline'>('calendar');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSteps, setFilterSteps] = useState<StepType[]>([]);
  const hasActiveFilters = filterAssignee || filterStatus || filterSteps.length > 0;

  const clearFilters = () => { setFilterAssignee(''); setFilterStatus(''); setFilterSteps([]); };

  const toggleStepFilter = (type: StepType) => {
    setFilterSteps(prev => prev.includes(type) ? prev.filter(s => s !== type) : [...prev, type]);
  };

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task: any) => {
        if (filterStatus) {
          const norm = normaliseTask(task);
          if (filterStatus === 'bloqueado' && !norm.status?.blocked) return false;
          if (filterStatus === 'nao-bloqueado' && norm.status?.blocked) return false;
        }
        if (filterAssignee) {
          const norm = normaliseTask(task);
          const anyStepHas = (norm.steps as Step[]).some((s: Step) => s.assignees.includes(filterAssignee));
          const legacyMatch = task.assignee === filterAssignee;
          if (!anyStepHas && !legacyMatch) return false;
        }
        if (filterSteps.length > 0) {
          const norm = normaliseTask(task);
          const activeTypes = (norm.steps as Step[]).filter(s => s.active).map(s => s.type);
          if (!filterSteps.some(ft => activeTypes.includes(ft))) return false;
        }
        return true;
      })
      .map((task: any) => {
        const norm = normaliseTask(task);
        let steps: Step[] = norm.steps as Step[];
        if (filterSteps.length > 0) {
          steps = steps.filter(s => filterSteps.includes(s.type));
        }
        if (filterAssignee) {
          steps = steps.filter(s => s.assignees.includes(filterAssignee));
        }
        return { ...norm, steps };
      });
  }, [tasks, filterAssignee, filterStatus, filterSteps]);

  const blockedCount = useMemo(() => tasks.filter((t: any) => normaliseTask(t).status?.blocked).length, [tasks]);
  const activeCount  = useMemo(() => tasks.filter((t: any) => {
    const norm = normaliseTask(t);
    const today = todayStr();
    const step = getCurrentStep(norm.steps ?? [], today);
    return step && step.start <= today && step.end >= today;
  }).length, [tasks]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Visão Geral</h2>
          <p className="text-muted-foreground text-sm">Gestão das entregas criativas e de desenvolvimento.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-muted rounded-lg p-1 gap-1">
            <button
              onClick={() => setCalView('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${calView === 'calendar' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <CalendarDays className="w-3.5 h-3.5" /> Calendário
            </button>
            <button
              onClick={() => setCalView('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${calView === 'timeline' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <AlignLeft className="w-3.5 h-3.5" /> Linha do Tempo
            </button>
          </div>
          <Button variant="outline" onClick={onExport}><Download className="w-4 h-4 mr-1.5" /> PDF</Button>
          <Button onClick={onOpenNew}><Plus className="w-4 h-4 mr-1.5" /> Nova Demanda</Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="px-3 py-2 rounded-xl border border-border bg-muted print:hidden">
        <div className="flex items-center gap-2 flex-wrap">
          <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} className="text-xs rounded-lg border border-border bg-card px-2 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">Responsável</option>
            {members.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-xs rounded-lg border border-border bg-card px-2 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">Status</option>
            <option value="bloqueado">Bloqueado</option>
            <option value="nao-bloqueado">Não bloqueado</option>
          </select>
          <div className="w-px h-4 bg-border mx-0.5" />
          {STEP_TYPES_ORDER.map(type => {
            const meta = STEP_META[type];
            const active = filterSteps.includes(type);
            return (
              <button
                key={type}
                onClick={() => toggleStepFilter(type)}
                className={`px-2 py-1 rounded-full text-xs font-medium border transition-colors ${active ? meta.tagBg + ' border-transparent' : 'bg-card border-border text-muted-foreground hover:text-foreground'}`}
              >
                {meta.tag}
              </button>
            );
          })}
          {hasActiveFilters && (
            <>
              <span className="text-xs text-muted-foreground ml-auto">{filteredTasks.length}/{tasks.length}</span>
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors">
                <X className="w-3 h-3" /> Limpar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Métricas */}
      {tasks.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 print:hidden">
          {[
            { label: 'Total',        value: tasks.length,  cls: 'text-foreground',                    bg: 'bg-card border border-border' },
            { label: 'Em andamento', value: activeCount,   cls: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800' },
            { label: 'Bloqueadas',   value: blockedCount,  cls: 'text-red-600 dark:text-red-400',     bg: 'bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800' },
          ].map(({ label, value, cls, bg }) => (
            <div key={label} className={`rounded-xl px-4 py-3 flex flex-col gap-0.5 ${bg}`}>
              <span className="text-xs text-muted-foreground font-medium">{label}</span>
              <span className={`text-2xl font-bold tabular-nums ${cls}`}>{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Aviso Drive desconectado */}
      {!isConnected && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-300 text-sm print:hidden">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>Não conectado ao Google Drive. As alterações são guardadas localmente e sincronizadas ao conectar.</span>
        </div>
      )}

      {/* View */}
      {calView === 'calendar' ? (
        <CalendarView tasks={filteredTasks} members={members} onEdit={onEdit} onDelete={onDelete} onUpdateTask={onUpdateTask} />
      ) : (
        <TimelineView tasks={filteredTasks} members={members} onEdit={onEdit} onDelete={onDelete} onUpdateTask={onUpdateTask} />
      )}

      {/* Legend */}
      <div className="flex gap-4 flex-wrap text-xs text-muted-foreground print:hidden">
        {STEP_TYPES_ORDER.map(type => (
          <div key={type} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${STEP_META[type].dot}`} />
            {STEP_META[type].label}
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          Bloqueado
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
