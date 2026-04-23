import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  DAY_COL_W, toLocalDate, normaliseTask, isStepBlocked, formatDateDisplay,
  STEP_META, type DragPreview, type DragState, type Task, type Step, type StepType,
} from '@/utils/dashboardUtils';

interface PhaseBarProps {
  step: Step;
  task: Task;
  days: Date[];
  dragPreview: DragPreview | null;
  didDragRef: React.MutableRefObject<boolean>;
  startDrag: (e: React.MouseEvent, taskId: string, stepType: StepType, type: DragState['type'], step: Step, colWidth: number) => void;
  onEdit: (t: Task) => void;
}

const PhaseBar: React.FC<PhaseBarProps> = React.memo(({ step, task, days, dragPreview, didDragRef, startDrag, onEdit }) => {
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
  const isConcluded = !!task.concludedAt;
  const barCls = isConcluded 
    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-300 border border-gray-400 dark:border-gray-500' 
    : blocked 
      ? meta.barBlocked 
      : meta.bar;

  return (
    <div
      className={`absolute top-1.5 bottom-1.5 ${barCls} text-[11px] font-semibold flex items-center overflow-hidden select-none ${isDragging ? 'shadow-lg z-20' : 'hover:brightness-110 z-10'}`}
      style={{
        left: `${left}%`, width: `${width}%`,
        borderRadius: `${startsHere ? 5 : 0}px ${endsHere ? 5 : 0}px ${endsHere ? 5 : 0}px ${startsHere ? 5 : 0}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: isDragging ? 'none' : 'filter 0.1s',
      }}
      title={`${meta.label}: ${formatDateDisplay(pStart)} → ${formatDateDisplay(pEnd)}`}
      onMouseDown={e => startDrag(e, task.id, step.type, 'move', step, DAY_COL_W)}
      onClick={() => { if (!didDragRef.current) onEdit(task); }}
    >
      {startsHere && (
        <div
          className={`absolute left-0 top-0 bottom-0 w-2 ${isConcluded ? 'bg-gray-400 dark:bg-gray-500' : meta.handle} cursor-ew-resize z-20`}
          style={{ borderRadius: '5px 0 0 5px' }}
          onMouseDown={e => { e.stopPropagation(); startDrag(e, task.id, step.type, 'resize-start', step, DAY_COL_W); }}
        />
      )}
      {startsHere && (
        <span className="truncate px-2 pointer-events-none flex items-center gap-1">
          {isConcluded && <CheckCircle2 className="w-3 h-3 shrink-0" />}
          {blocked && !isConcluded && <AlertTriangle className="w-3 h-3 shrink-0" />}
          {meta.label}
        </span>
      )}
      {endsHere && (
        <div
          className={`absolute right-0 top-0 bottom-0 w-2 ${isConcluded ? 'bg-gray-400 dark:bg-gray-500' : meta.handle} cursor-ew-resize z-20`}
          style={{ borderRadius: '0 5px 5px 0' }}
          onMouseDown={e => { e.stopPropagation(); startDrag(e, task.id, step.type, 'resize-end', step, DAY_COL_W); }}
        />
      )}
    </div>
  );
}, (prev, next) =>
  prev.step.type === next.step.type &&
  prev.step.start === next.step.start &&
  prev.step.end === next.step.end &&
  prev.task.id === next.task.id &&
  prev.task.concludedAt === next.task.concludedAt &&
  prev.task.status?.blocked === next.task.status?.blocked &&
  prev.days.length === next.days.length &&
  prev.dragPreview === next.dragPreview
);

export default PhaseBar;
