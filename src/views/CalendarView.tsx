import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import {
  PT_MONTHS, PT_DAYS_SHORT,
  MAX_SLOTS, SLOT_HEIGHT, DAY_HEADER_H, ROW_PADDING,
  toLocalDate, toDateStr, addDays,
  normaliseTask,
  layoutWeekBars,
  type BarItem, type DragState, type DragPreview,
  type Task, type Step,
  STEP_META, isStepBlocked,
} from '../utils/dashboardUtils';
import type { CalendarViewProps } from '../types/props';

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onEdit, onUpdateTask }) => {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const [monthDate, setMonthDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const weeks = useMemo(() => {
    const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    const startDow = firstDay.getDay();
    const gridStart = new Date(firstDay);
    gridStart.setDate(gridStart.getDate() - startDow);
    const result: Date[][] = [];
    const cur = new Date(gridStart);
    while (true) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) { week.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
      result.push(week);
      if (cur > lastDay && result.length >= 4) break;
    }
    return result;
  }, [monthDate]);

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
        const task = tasks.find(t => t.id === ds.taskId);
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
    task: Task,
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
                const task = tasks.find(t => t.id === bar.taskId);
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

export default CalendarView;
