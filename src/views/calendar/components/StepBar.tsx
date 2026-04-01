import React from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  DAY_HEADER_H, SLOT_HEIGHT,
  normaliseTask, isStepBlocked,
  STEP_META,
  type BarItem, type DragPreview, type DragState, type Task,
} from '../../../utils/dashboardUtils';

interface StepBarProps {
  bar: BarItem;
  task: Task;
  dragPreview: DragPreview | null;
  onStartDrag: (e: React.MouseEvent, bar: BarItem, type: DragState['type'], task: Task) => void;
  onClick: () => void;
}

const StepBar: React.FC<StepBarProps> = ({ bar, task, dragPreview, onStartDrag, onClick }) => {
  const meta = STEP_META[bar.stepType];
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
  const clampedEnd = Math.max(0, Math.min(6, adjEnd));
  const left = clampedStart * colW;
  const width = (clampedEnd - clampedStart + 1) * colW;
  const top = DAY_HEADER_H + bar.slot * SLOT_HEIGHT + 3;
  const startsHere = bar.startCol >= 0;
  const endsHere = bar.endCol <= 6;
  const isDragging = dragPreview?.taskId === bar.taskId && dragPreview?.stepType === bar.stepType;
  const norm = normaliseTask(task);
  const blocked = isStepBlocked(norm, bar.stepStart);
  const barCls = blocked ? meta.barBlocked : meta.bar;

  return (
    <div
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
      title={`${task.title} · ${meta.label}${blocked ? ' · BLOQUEADO' : ''}`}
      onMouseDown={e => onStartDrag(e, bar, 'move', task)}
      onClick={onClick}
    >
      {startsHere && (
        <div
          className={`absolute left-0 top-0 bottom-0 w-2 ${meta.handle} rounded-l-[5px] cursor-ew-resize z-20`}
          onMouseDown={e => { e.stopPropagation(); onStartDrag(e, bar, 'resize-start', task); }}
        />
      )}
      {startsHere && (
        <span className="flex items-center gap-1 px-1.5 truncate leading-none pointer-events-none min-w-0">
          {blocked
            ? <AlertTriangle className="w-3 h-3 shrink-0" />
            : <span className={`shrink-0 text-[9px] font-bold px-1 py-0.5 rounded ${meta.tagBg}`}>{meta.tag}</span>
          }
          <span className="truncate text-[11px]">{task.title}</span>
        </span>
      )}
      {endsHere && (
        <div
          className={`absolute right-0 top-0 bottom-0 w-2 ${meta.handle} rounded-r-[5px] cursor-ew-resize z-20`}
          onMouseDown={e => { e.stopPropagation(); onStartDrag(e, bar, 'resize-end', task); }}
        />
      )}
    </div>
  );
};

export default StepBar;
