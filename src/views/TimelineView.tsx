import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Edit2, Trash2, AlertTriangle } from 'lucide-react';
import {
  DAY_COL_W,
  toLocalDate, toDateStr, addDays,
  normaliseTask, getVisibleSteps, getTaskStatusDisplay,
  type DragState, type DragPreview,
  type Task, type Step, type StepType,
  STEP_META, isStepBlocked,
  formatDate,
} from '../utils/dashboardUtils';
import type { TimelineViewProps } from '../types/props';

const TimelineView: React.FC<TimelineViewProps> = ({ tasks, members, onEdit, onDelete, onUpdateTask }) => {
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

  const renderBar = (step: Step, task: Task) => {
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
        ) : tasks.map(task => {
          const norm = normaliseTask(task);
          const visibleSteps = getVisibleSteps(task);
          const status = getTaskStatusDisplay(task);
          const PHASE_ROW_H = 28;
          const totalH = Math.max(visibleSteps.length, 1) * PHASE_ROW_H;
          const allMemberIds = new Set(visibleSteps.flatMap(s => s.assignees));
          const assignees = members.filter(m => allMemberIds.has(m.id));

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
                  {assignees.slice(0, 3).map(m => (
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

export default TimelineView;
