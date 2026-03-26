import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Button } from '../components/ui';
import { Plus, Edit2, Trash2, Download, ChevronLeft, ChevronRight, CalendarDays, AlignLeft, WifiOff, X } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';

// ─── Constants ───────────────────────────────────────────────────────────────

const PHASE_IDS = ['design', 'approval', 'dev', 'qa'] as const;
type PhaseId = typeof PHASE_IDS[number];

const PHASE_META: Record<PhaseId, { label: string; tag: string; bar: string; dot: string; handle: string; tagBg: string }> = {
  design:   { label: 'Design',    tag: 'UX',  bar: 'bg-violet-100 text-violet-900 border border-violet-300 dark:bg-violet-950 dark:text-violet-200 dark:border-violet-700',  dot: 'bg-violet-500',   handle: 'bg-violet-400 dark:bg-violet-600',  tagBg: 'bg-violet-500 text-white'  },
  approval: { label: 'Aprovação', tag: 'APR', bar: 'bg-orange-100 text-orange-900 border border-orange-300 dark:bg-orange-950 dark:text-orange-200 dark:border-orange-700',  dot: 'bg-orange-400',   handle: 'bg-orange-400 dark:bg-orange-600',  tagBg: 'bg-orange-500 text-white'  },
  dev:      { label: 'Dev',       tag: 'DEV', bar: 'bg-sky-100 text-sky-900 border border-sky-300 dark:bg-sky-950 dark:text-sky-200 dark:border-sky-700',                    dot: 'bg-sky-500',      handle: 'bg-sky-400 dark:bg-sky-600',        tagBg: 'bg-sky-600 text-white'     },
  qa:       { label: 'QA',        tag: 'QA',  bar: 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-700', dot: 'bg-emerald-500', handle: 'bg-emerald-400 dark:bg-emerald-600', tagBg: 'bg-emerald-600 text-white' },
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  'backlog':       { label: 'Backlog',       cls: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-100' },
  'em andamento':  { label: 'Em andamento',  cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'    },
  'bloqueado':     { label: 'Bloqueado',     cls: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'        },
  'concluído':     { label: 'Concluído',     cls: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' },
};

const PT_MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const PT_DAYS_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

const MAX_SLOTS = 3;
const SLOT_HEIGHT = 28;
const DAY_HEADER_H = 32;
const ROW_PADDING = 8;

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


function getMonthWeeks(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay();
  const offset = -startDow;
  const gridStart = new Date(firstDay);
  gridStart.setDate(gridStart.getDate() + offset);

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

interface BarItem {
  taskId: string;
  taskTitle: string;
  phaseId: PhaseId;
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
    for (const phaseId of PHASE_IDS) {
      const phase = task.phases?.[phaseId];
      if (!phase?.start || !phase?.end) continue;
      const pStart = toLocalDate(phase.start);
      const pEnd = toLocalDate(phase.end);
      if (pEnd < weekStart || pStart > weekEnd) continue;
      const startCol = Math.max(0, Math.round((pStart.getTime() - weekStart.getTime()) / 86400000));
      const endCol   = Math.min(6, Math.round((pEnd.getTime()   - weekStart.getTime()) / 86400000));
      raw.push({ taskId: task.id, taskTitle: task.title, phaseId, startCol, endCol });
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
  phaseId: PhaseId;
  originalStart: Date;
  originalEnd: Date;
  startX: number;
  colWidth: number;
}

interface DragPreview {
  taskId: string;
  phaseId: PhaseId;
  deltaDays: number;
  type: DragState['type'];
}

// ─── Timeline (Gantt) View ───────────────────────────────────────────────────

const TimelineView: React.FC<{ tasks: any[]; members: any[]; onEdit: (t: any) => void; onDelete: (id: string) => void; onUpdateTask: (updatedTask: any) => void }> = ({ tasks, members, onEdit, onDelete, onUpdateTask }) => {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const [daysRange, setDaysRange] = useState(60);
  const DAY_COL_W = 36;
  const days = useMemo(() => Array.from({ length: daysRange }).map((_, i) => { const d = new Date(today); d.setDate(d.getDate() + i); return d; }), [today, daysRange]);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{ type: 'move' | 'resize-start' | 'resize-end'; taskId: string; phaseId: PhaseId; originalStart: Date; originalEnd: Date; startX: number; colWidth: number } | null>(null);
  const didDragRef = useRef(false);
  const [dragPreview, setDragPreview] = useState<{ taskId: string; phaseId: PhaseId; deltaDays: number; type: string } | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const ds = dragStateRef.current;
      if (!ds) return;
      const delta = Math.round((e.clientX - ds.startX) / ds.colWidth);
      if (delta !== 0) didDragRef.current = true;
      setDragPreview({ taskId: ds.taskId, phaseId: ds.phaseId, deltaDays: delta, type: ds.type });
    };
    const onUp = (e: MouseEvent) => {
      const ds = dragStateRef.current;
      if (!ds) return;
      const delta = Math.round((e.clientX - ds.startX) / ds.colWidth);
      if (delta !== 0) {
        const task = tasks.find((t: any) => t.id === ds.taskId);
        if (task) {
          let newStart = new Date(ds.originalStart);
          let newEnd   = new Date(ds.originalEnd);
          if (ds.type === 'move') {
            newStart = addDays(ds.originalStart, delta);
            newEnd   = addDays(ds.originalEnd,   delta);
          } else if (ds.type === 'resize-start') {
            newStart = addDays(ds.originalStart, delta);
            if (newStart >= newEnd) newStart = addDays(newEnd, -1);
          } else {
            newEnd = addDays(ds.originalEnd, delta);
            if (newEnd <= newStart) newEnd = addDays(newStart, 1);
          }
          onUpdateTask({
            ...task,
            phases: { ...task.phases, [ds.phaseId]: { ...task.phases[ds.phaseId], start: toDateStr(newStart), end: toDateStr(newEnd) } },
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

  const startDrag = useCallback((e: React.MouseEvent, taskId: string, phaseId: PhaseId, type: 'move' | 'resize-start' | 'resize-end', task: any) => {
    e.preventDefault();
    e.stopPropagation();
    const colWidth = DAY_COL_W;
    const phase = task.phases[phaseId];
    dragStateRef.current = { type, taskId, phaseId, originalStart: toLocalDate(phase.start), originalEnd: toLocalDate(phase.end), startX: e.clientX, colWidth };
    didDragRef.current = false;
  }, [daysRange]);

  const renderBar = (phaseObj: any, phaseId: PhaseId, task: any) => {
    if (!phaseObj?.start || !phaseObj?.end) return null;
    const pStart = toLocalDate(phaseObj.start);
    const pEnd   = toLocalDate(phaseObj.end);
    const tStart = days[0];
    const tEnd   = days[days.length - 1];
    if (pEnd < tStart || pStart > tEnd) return null;

    let s = Math.round((pStart.getTime() - tStart.getTime()) / 86400000);
    let e = Math.round((pEnd.getTime()   - tStart.getTime()) / 86400000);

    // Apply drag preview
    const dp = dragPreview;
    if (dp && dp.taskId === task.id && dp.phaseId === phaseId) {
      if (dp.type === 'move') { s += dp.deltaDays; e += dp.deltaDays; }
      else if (dp.type === 'resize-start') { s = Math.min(s + dp.deltaDays, e); }
      else { e = Math.max(e + dp.deltaDays, s); }
    }

    const sC = Math.max(0, s); const eC = Math.min(days.length - 1, e);
    if (eC < 0 || sC >= days.length) return null;

    const left  = (sC / days.length) * 100;
    const width = ((eC - sC + 1) / days.length) * 100;
    const meta  = PHASE_META[phaseId];
    const isDragging = dp?.taskId === task.id && dp?.phaseId === phaseId;
    const startsHere = s >= 0;
    const endsHere   = e < days.length;

    return (
      <div
        key={phaseId}
        className={`absolute top-1.5 bottom-1.5 ${meta.bar} text-[11px] font-semibold flex items-center overflow-hidden select-none ${isDragging ? 'shadow-lg z-20' : 'hover:brightness-110 z-10'}`}
        style={{
          left: `${left}%`, width: `${width}%`,
          borderRadius: `${startsHere ? 5 : 0}px ${endsHere ? 5 : 0}px ${endsHere ? 5 : 0}px ${startsHere ? 5 : 0}px`,
          cursor: isDragging ? 'grabbing' : 'grab',
          transition: isDragging ? 'none' : 'filter 0.1s',
        }}
        title={`${meta.label}: ${formatDate(pStart)} → ${formatDate(pEnd)}`}
        onMouseDown={e => startDrag(e, task.id, phaseId, 'move', task)}
        onClick={() => { if (!didDragRef.current) onEdit(task); }}
      >
        {startsHere && (
          <div
            className={`absolute left-0 top-0 bottom-0 w-2 ${meta.handle} cursor-ew-resize z-20`}
            style={{ borderRadius: '5px 0 0 5px' }}
            onMouseDown={e => { e.stopPropagation(); startDrag(e, task.id, phaseId, 'resize-start', task); }}
          />
        )}
        {startsHere && <span className="truncate px-2 pointer-events-none">{meta.label}</span>}
        {endsHere && (
          <div
            className={`absolute right-0 top-0 bottom-0 w-2 ${meta.handle} cursor-ew-resize z-20`}
            style={{ borderRadius: '0 5px 5px 0' }}
            onMouseDown={e => { e.stopPropagation(); startDrag(e, task.id, phaseId, 'resize-end', task); }}
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
          <div className="p-12 text-center text-muted-foreground text-sm">Nenhuma demanda. Clique em "Nova Demanda" para começar.</div>
        ) : tasks.map((task: any) => {
          const assignee = members.find((m: any) => m.id === task.assignee);
          const status = STATUS_META[task.status] ?? STATUS_META['backlog'];
          const PHASE_ROW_H = 28;
          const totalH = PHASE_IDS.length * PHASE_ROW_H;
          return (
            <div key={task.id} className="flex border-b border-border group hover:bg-muted/30 transition-colors">
              {/* Left: task info */}
              <div className="w-56 shrink-0 border-r border-border relative flex flex-col justify-center px-3 py-2 gap-1" style={{ minHeight: totalH }}>
                <div className="font-medium text-sm text-foreground truncate pr-12">{task.title}</div>
                <div className="flex items-center gap-1.5">
                  {assignee && (
                    <div className="w-4 h-4 rounded-full bg-muted text-[8px] font-bold flex items-center justify-center text-muted-foreground shrink-0">{assignee.avatar}</div>
                  )}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${status.cls}`}>{status.label}</span>
                </div>
                {/* Edit/delete — inside relative container, properly anchored */}
                <div className="absolute right-1.5 top-1.5 flex gap-0.5 opacity-0 group-hover:opacity-100 print:hidden transition-opacity">
                  <button onClick={() => onEdit(task)} className="p-1 text-muted-foreground hover:text-blue-600 rounded hover:bg-blue-50 dark:hover:bg-blue-900"><Edit2 className="w-3 h-3" /></button>
                  <button onClick={() => onDelete(task.id)} className="p-1 text-muted-foreground hover:text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>

              {/* Right: staircase phase rows */}
              <div className="flex flex-col" style={{ width: daysRange * DAY_COL_W }}>
                {PHASE_IDS.map((pid) => (
                  <div key={pid} className="relative overflow-hidden" style={{ height: PHASE_ROW_H, width: daysRange * DAY_COL_W }}>
                    {/* Grid background */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {days.map((d, i) => (
                        <div key={i} className={`shrink-0 border-r border-border/50 ${d.getDay() === 0 || d.getDay() === 6 ? 'bg-muted/60' : ''}`} style={{ width: DAY_COL_W }} />
                      ))}
                    </div>
                    {renderBar(task.phases?.[pid], pid, task)}
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
  onUpdateTask: (updatedTask: any) => void;
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
      setDragPreview({ taskId: ds.taskId, phaseId: ds.phaseId, deltaDays: delta, type: ds.type });
    };

    const onUp = (e: MouseEvent) => {
      const ds = dragStateRef.current;
      if (!ds) return;
      const delta = Math.round((e.clientX - ds.startX) / ds.colWidth);
      if (delta !== 0) {
        const task = tasks.find((t: any) => t.id === ds.taskId);
        if (task) {
          let newStart = new Date(ds.originalStart);
          let newEnd   = new Date(ds.originalEnd);
          if (ds.type === 'move') {
            newStart = addDays(ds.originalStart, delta);
            newEnd   = addDays(ds.originalEnd,   delta);
          } else if (ds.type === 'resize-start') {
            newStart = addDays(ds.originalStart, delta);
            if (newStart >= newEnd) newStart = addDays(newEnd, -1);
          } else {
            newEnd = addDays(ds.originalEnd, delta);
            if (newEnd <= newStart) newEnd = addDays(newStart, 1);
          }
          onUpdateTask({
            ...task,
            phases: {
              ...task.phases,
              [ds.phaseId]: { ...task.phases[ds.phaseId], start: toDateStr(newStart), end: toDateStr(newEnd) },
            },
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
    const phase = task.phases[bar.phaseId];
    dragStateRef.current = {
      type,
      taskId: bar.taskId,
      phaseId: bar.phaseId,
      originalStart: toLocalDate(phase.start),
      originalEnd:   toLocalDate(phase.end),
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
                const isToday     = day.getTime() === today.getTime();
                const isThisMonth = day.getMonth() === monthDate.getMonth();
                const isWeekend   = day.getDay() === 0 || day.getDay() === 6;
                const hasOverflow = overflow[di] > 0;
                return (
                  <div
                    key={di}
                    className={`border-r border-border last:border-r-0 flex flex-col select-none ${
                      !isThisMonth ? 'bg-muted' :
                      isWeekend    ? 'bg-muted' :
                      'bg-card'
                    }`}
                    style={{ height: rowHeight }}
                  >
                    <div className="flex items-center justify-center" style={{ height: DAY_HEADER_H }}>
                      <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday      ? 'bg-blue-600 text-white font-bold' :
                        !isThisMonth ? 'text-muted-foreground' :
                        isWeekend    ? 'text-muted-foreground' :
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

              {/* Phase bars */}
              {bars.filter(b => b.slot < MAX_SLOTS).map((bar, bi) => {
                const meta = PHASE_META[bar.phaseId];
                const task = tasks.find((t: any) => t.id === bar.taskId);
                const colW = 100 / 7;

                // Apply drag preview offset
                let adjStart = bar.startCol;
                let adjEnd   = bar.endCol;
                if (dragPreview && dragPreview.taskId === bar.taskId && dragPreview.phaseId === bar.phaseId) {
                  const d = dragPreview.deltaDays;
                  if (dragPreview.type === 'move') {
                    adjStart = bar.startCol + d;
                    adjEnd   = bar.endCol + d;
                  } else if (dragPreview.type === 'resize-start') {
                    adjStart = Math.min(bar.startCol + d, bar.endCol);
                  } else {
                    adjEnd = Math.max(bar.endCol + d, bar.startCol);
                  }
                }

                // Clamp to visible week for preview rendering
                const clampedStart = Math.max(0, Math.min(6, adjStart));
                const clampedEnd   = Math.max(0, Math.min(6, adjEnd));
                const left  = clampedStart * colW;
                const width = (clampedEnd - clampedStart + 1) * colW;
                const top   = DAY_HEADER_H + bar.slot * SLOT_HEIGHT + 3;
                const startsHere = bar.startCol >= 0;
                const endsHere   = bar.endCol <= 6;
                const isDragging = dragPreview?.taskId === bar.taskId && dragPreview?.phaseId === bar.phaseId;

                return (
                  <div
                    key={`${bar.taskId}-${bar.phaseId}-${bi}`}
                    className={`absolute ${meta.bar} text-[11px] font-semibold flex items-center overflow-hidden z-10 group/bar select-none ${isDragging ? 'shadow-lg' : 'hover:brightness-110'}`}
                    style={{
                      top,
                      height: SLOT_HEIGHT - 4,
                      left: `calc(${left}% + ${startsHere ? 3 : 0}px)`,
                      width: `calc(${width}% - ${(startsHere ? 3 : 0) + (endsHere ? 3 : 0)}px)`,
                      borderRadius: `${startsHere ? 5 : 0}px ${endsHere ? 5 : 0}px ${endsHere ? 5 : 0}px ${startsHere ? 5 : 0}px`,
                      cursor: isDragging ? 'grabbing' : 'grab',
                      transition: isDragging ? 'none' : 'filter 0.1s',
                    }}
                    title={`${task?.title} · ${meta.label}`}
                    onMouseDown={e => task && startDrag(e, bar, 'move', task)}
                    onClick={() => { if (!didDragRef.current && task) onEdit(task); }}
                  >
                    {/* Left resize handle */}
                    {startsHere && (
                      <div
                        className={`absolute left-0 top-0 bottom-0 w-2 ${meta.handle} rounded-l-[5px] cursor-ew-resize z-20 flex items-center justify-center`}
                        onMouseDown={e => { e.stopPropagation(); task && startDrag(e, bar, 'resize-start', task); }}
                      />
                    )}

                    {startsHere && (
                      <span className="flex items-center gap-1 px-1.5 truncate leading-none pointer-events-none min-w-0">
                        <span className={`shrink-0 text-[9px] font-bold px-1 py-0.5 rounded ${meta.tagBg}`}>{meta.tag}</span>
                        <span className="truncate text-[11px]">{task?.title}</span>
                      </span>
                    )}

                    {/* Right resize handle */}
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
  const [filterStatus, setFilterStatus]     = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo]     = useState('');

  const hasActiveFilters = filterAssignee || filterStatus || filterDateFrom || filterDateTo;

  const clearFilters = () => { setFilterAssignee(''); setFilterStatus(''); setFilterDateFrom(''); setFilterDateTo(''); };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task: any) => {
      if (filterAssignee) {
        const pa = task.phaseAssignees;
        const inPhase = pa && Object.values(pa).some((id: any) => id === filterAssignee);
        const legacy = !pa && task.assignee === filterAssignee;
        if (!inPhase && !legacy) return false;
      }
      if (filterStatus   && task.status   !== filterStatus)   return false;
      if (filterDateFrom || filterDateTo) {
        const from = filterDateFrom ? toLocalDate(filterDateFrom) : null;
        const to   = filterDateTo   ? toLocalDate(filterDateTo)   : null;
        const taskStart = task.phases?.design?.start ? toLocalDate(task.phases.design.start) : null;
        const taskEnd   = task.phases?.qa?.end       ? toLocalDate(task.phases.qa.end)       : null;
        if (from && taskEnd   && taskEnd   < from) return false;
        if (to   && taskStart && taskStart > to)   return false;
      }
      return true;
    });
  }, [tasks, filterAssignee, filterStatus, filterDateFrom, filterDateTo]);

  const selectCls = 'text-sm rounded-lg border border-border bg-card px-2 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full';

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

      {/* Filtros sempre visíveis */}
      <div className="p-3 rounded-xl border border-border bg-muted print:hidden">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Responsável</label>
            <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} className={selectCls}>
              <option value="">Todos</option>
              {members.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={selectCls}>
              <option value="">Todos</option>
              {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Data de</label>
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className={selectCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Data até</label>
            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className={selectCls} />
          </div>
        </div>
        {hasActiveFilters && (
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">{filteredTasks.length} de {tasks.length} demanda{tasks.length !== 1 ? 's' : ''}</span>
            <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors">
              <X className="w-3 h-3" /> Limpar filtros
            </button>
          </div>
        )}
      </div>

      {/* Métricas do time */}
      {tasks.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
          {[
            { label: 'Total',        value: tasks.length,                                              cls: 'text-foreground',   bg: 'bg-card border border-border' },
            { label: 'Em andamento', value: tasks.filter((t: any) => t.status === 'em andamento').length, cls: 'text-blue-600 dark:text-blue-400',  bg: 'bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800' },
            { label: 'Bloqueadas',   value: tasks.filter((t: any) => t.status === 'bloqueado').length,    cls: 'text-red-600 dark:text-red-400',   bg: 'bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800' },
            { label: 'Concluídas',   value: tasks.filter((t: any) => t.status === 'concluído').length,    cls: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800' },
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
        {PHASE_IDS.map(id => (
          <div key={id} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${PHASE_META[id].dot}`} />
            {PHASE_META[id].label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardView;
