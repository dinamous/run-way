import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Button } from '../components/ui';
import { Plus, Edit2, Trash2, Download, ChevronLeft, ChevronRight, CalendarDays, AlignLeft } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';

// ─── Constants ───────────────────────────────────────────────────────────────

const PHASE_IDS = ['design', 'approval', 'dev', 'qa'] as const;
type PhaseId = typeof PHASE_IDS[number];

const PHASE_META: Record<PhaseId, { label: string; bar: string; dot: string; handle: string }> = {
  design:   { label: 'Design',    bar: 'bg-violet-500 text-white',   dot: 'bg-violet-500',   handle: 'bg-violet-700'   },
  approval: { label: 'Aprovação', bar: 'bg-orange-400 text-white',   dot: 'bg-orange-400',   handle: 'bg-orange-600'   },
  dev:      { label: 'Dev',       bar: 'bg-sky-500 text-white',      dot: 'bg-sky-500',      handle: 'bg-sky-700'      },
  qa:       { label: 'QA',        bar: 'bg-emerald-500 text-white',  dot: 'bg-emerald-500',  handle: 'bg-emerald-700'  },
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  'backlog':       { label: 'Backlog',       cls: 'bg-slate-100 text-slate-600' },
  'em andamento':  { label: 'Em andamento',  cls: 'bg-blue-100 text-blue-700'   },
  'bloqueado':     { label: 'Bloqueado',     cls: 'bg-red-100 text-red-700'     },
  'concluído':     { label: 'Concluído',     cls: 'bg-green-100 text-green-700' },
};

const PT_MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const PT_DAYS_SHORT = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];

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
  const offset = startDow === 0 ? -6 : 1 - startDow;
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

const TimelineView: React.FC<{ tasks: any[]; members: any[]; onEdit: (t: any) => void; onDelete: (id: string) => void }> = ({ tasks, members, onEdit, onDelete }) => {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const days = useMemo(() => Array.from({ length: 60 }).map((_, i) => { const d = new Date(today); d.setDate(d.getDate() + i); return d; }), [today]);

  const renderBar = (phaseObj: any, phaseId: PhaseId, task: any) => {
    if (!phaseObj?.start || !phaseObj?.end) return null;
    const pStart = toLocalDate(phaseObj.start);
    const pEnd   = toLocalDate(phaseObj.end);
    const tStart = days[0]; const tEnd = days[days.length - 1];
    if (pEnd < tStart || pStart > tEnd) return null;
    let s = Math.round((pStart.getTime() - tStart.getTime()) / 86400000);
    let e = Math.round((pEnd.getTime()   - tStart.getTime()) / 86400000);
    if (s < 0) s = 0; if (e >= days.length) e = days.length - 1;
    const left  = (s / days.length) * 100;
    const width = ((e - s + 1) / days.length) * 100;
    const meta = PHASE_META[phaseId];
    return (
      <div
        key={phaseId}
        onClick={() => onEdit(task)}
        className={`absolute top-2 bottom-2 rounded-md ${meta.bar} text-[11px] font-semibold px-2 flex items-center overflow-hidden cursor-pointer hover:brightness-110 transition-all`}
        style={{ left: `${left}%`, width: `${width}%` }}
        title={`${meta.label}: ${formatDate(pStart)} → ${formatDate(pEnd)}`}
      >
        <span className="truncate">{meta.label}</span>
      </div>
    );
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <div style={{ minWidth: 900 }}>
        <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
          <div className="w-56 shrink-0 p-3 text-xs font-semibold text-slate-500 border-r border-slate-200">Demanda</div>
          <div className="flex-1 flex">
            {days.map((d, i) => {
              const isToday = d.getTime() === today.getTime();
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <div key={i} className={`flex-1 min-w-[20px] border-r border-slate-100 py-1.5 text-center ${isWeekend ? 'bg-slate-100/60' : ''}`}>
                  <div className={`text-[10px] font-bold mx-auto w-5 h-5 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-slate-700'}`}>{d.getDate()}</div>
                  <div className="text-[9px] text-slate-400">{['D','S','T','Q','Q','S','S'][d.getDay()]}</div>
                </div>
              );
            })}
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">Nenhuma demanda. Clique em "Nova Demanda" para começar.</div>
        ) : tasks.map((task: any) => {
          const assignee = members.find((m: any) => m.id === task.assignee);
          const status = STATUS_META[task.status] ?? STATUS_META['backlog'];
          return (
            <div key={task.id} className="flex border-b border-slate-100 hover:bg-slate-50/60 transition-colors group">
              <div className="w-56 shrink-0 px-3 py-2.5 border-r border-slate-200 flex flex-col justify-center gap-1">
                <div className="font-medium text-sm text-slate-900 truncate">{task.title}</div>
                <div className="flex items-center gap-1.5">
                  {assignee && (
                    <div className="w-4 h-4 rounded-full bg-slate-200 text-[8px] font-bold flex items-center justify-center text-slate-600 shrink-0">{assignee.avatar}</div>
                  )}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${status.cls}`}>{status.label}</span>
                </div>
                <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex gap-0.5 print:hidden">
                  <button onClick={() => onEdit(task)} className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50"><Edit2 className="w-3 h-3" /></button>
                  <button onClick={() => onDelete(task.id)} className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
              <div className="flex-1 relative" style={{ height: 52 }}>
                <div className="absolute inset-0 flex pointer-events-none">
                  {days.map((d, i) => (
                    <div key={i} className={`flex-1 border-r border-slate-100/50 ${d.getDay() === 0 || d.getDay() === 6 ? 'bg-slate-100/30' : ''}`} />
                  ))}
                </div>
                {PHASE_IDS.map(pid => renderBar(task.phases?.[pid], pid, task))}
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
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Month nav */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-slate-900">
            {PT_MONTHS[monthDate.getMonth()]} {monthDate.getFullYear()}
          </h3>
          <button onClick={goToday} className="text-xs px-2 py-0.5 rounded border border-slate-200 text-slate-500 hover:bg-white transition-colors">Hoje</button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-500 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-500 transition-colors"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
        {PT_DAYS_SHORT.map((d, i) => (
          <div key={d} className={`py-2 text-center text-[11px] font-semibold uppercase tracking-wide ${i >= 5 ? 'text-slate-400' : 'text-slate-500'}`}>{d}</div>
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
              className="relative grid grid-cols-7 border-b border-slate-100 last:border-b-0"
              style={{ height: rowHeight }}
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
                    className={`border-r border-slate-100 last:border-r-0 flex flex-col select-none ${
                      !isThisMonth ? 'bg-slate-50/70' :
                      isWeekend    ? 'bg-slate-50/40' :
                      'bg-white'
                    }`}
                    style={{ height: rowHeight }}
                  >
                    <div className="flex items-center justify-center" style={{ height: DAY_HEADER_H }}>
                      <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday      ? 'bg-blue-600 text-white font-bold' :
                        !isThisMonth ? 'text-slate-300' :
                        isWeekend    ? 'text-slate-400' :
                        'text-slate-700'
                      }`}>{day.getDate()}</span>
                    </div>
                    {hasOverflow && (
                      <div className="mt-auto mb-1 text-center">
                        <span className="text-[9px] text-slate-400 font-medium">+{overflow[di]}</span>
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

                const left  = adjStart * colW;
                const width = (adjEnd - adjStart + 1) * colW;
                const top   = DAY_HEADER_H + bar.slot * SLOT_HEIGHT + 3;
                const startsHere = bar.startCol >= 0;
                const endsHere   = bar.endCol <= 6;
                const isDragging = dragPreview?.taskId === bar.taskId && dragPreview?.phaseId === bar.phaseId;

                return (
                  <div
                    key={`${bar.taskId}-${bar.phaseId}-${bi}`}
                    className={`absolute ${meta.bar} text-[11px] font-semibold flex items-center overflow-hidden z-10 group/bar select-none ${isDragging ? 'opacity-90 shadow-lg' : 'hover:brightness-110'}`}
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
                        className={`absolute left-0 top-0 bottom-0 w-2 ${meta.handle} opacity-0 group-hover/bar:opacity-60 hover:!opacity-100 rounded-l-[5px] cursor-ew-resize z-20 flex items-center justify-center`}
                        onMouseDown={e => { e.stopPropagation(); task && startDrag(e, bar, 'resize-start', task); }}
                      />
                    )}

                    {startsHere && (
                      <span className="px-2 truncate leading-none pointer-events-none">{task?.title}</span>
                    )}

                    {/* Right resize handle */}
                    {endsHere && (
                      <div
                        className={`absolute right-0 top-0 bottom-0 w-2 ${meta.handle} opacity-0 group-hover/bar:opacity-60 hover:!opacity-100 rounded-r-[5px] cursor-ew-resize z-20`}
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

const DashboardView: React.FC<any> = ({ tasks, members, onEdit, onDelete, onUpdateTask, onOpenNew, onExport }) => {
  const [calView, setCalView] = useState<'calendar' | 'timeline'>('calendar');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Visão Geral</h2>
          <p className="text-slate-500 text-sm">Gestão das entregas criativas e de desenvolvimento.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
            <button
              onClick={() => setCalView('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${calView === 'calendar' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <CalendarDays className="w-3.5 h-3.5" /> Calendário
            </button>
            <button
              onClick={() => setCalView('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${calView === 'timeline' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <AlignLeft className="w-3.5 h-3.5" /> Linha do Tempo
            </button>
          </div>
          <Button variant="outline" onClick={onExport}><Download className="w-4 h-4 mr-1.5" /> PDF</Button>
          <Button onClick={onOpenNew}><Plus className="w-4 h-4 mr-1.5" /> Nova Demanda</Button>
        </div>
      </div>

      {/* View */}
      {calView === 'calendar'
        ? <CalendarView tasks={tasks} members={members} onEdit={onEdit} onDelete={onDelete} onUpdateTask={onUpdateTask} />
        : <TimelineView tasks={tasks} members={members} onEdit={onEdit} onDelete={onDelete} />
      }

      {/* Legend */}
      <div className="flex gap-4 flex-wrap text-xs text-slate-500 print:hidden">
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
