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
  isFirstBarOfStep: boolean;
  isLastBarOfStep: boolean;
  dragPreview: DragPreview | null;
  onStartDrag: (e: React.MouseEvent, bar: BarItem, type: DragState['type'], task: Task) => void;
  onClick: () => void;
}

const STEP_BORDER_COLORS: Record<string, string> = {
  'analise-ux': '#f9a8d4',
  'analise-dev': '#67e8f9',
  'design': '#c4b5fd',
  'aprovacao-design': '#fdba74',
  'desenvolvimento': '#86ceef',
  'homologacao': '#708ef1',
  'qa': '#6ee7b7',
  'publicacao': '#bafc50',
};

const StepBar: React.FC<StepBarProps> = ({ bar, task, isFirstBarOfStep, isLastBarOfStep, dragPreview, onStartDrag, onClick }) => {
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
  const isDragging = dragPreview?.taskId === bar.taskId && dragPreview?.stepType === bar.stepType;
  const norm = normaliseTask(task);
  const blocked = isStepBlocked(norm, bar.stepStart);
  const bgClass = blocked ? 'bg-red-500 dark:bg-red-600 text-white' : meta.bar.replace(/border\s+\S+/g, '');
  const stepKey = `${bar.taskId}-${bar.stepType}`;

  const borderColor = blocked ? '#dc2626' : (STEP_BORDER_COLORS[bar.stepType] ?? '#d1d5db');

  let borderRadius = '0px';
  if (isFirstBarOfStep && isLastBarOfStep) {
    borderRadius = '5px';
  } else if (isFirstBarOfStep) {
    borderRadius = '5px 0 0 5px';
  } else if (isLastBarOfStep) {
    borderRadius = '0 5px 5px 0';
  }

  const showLeftDeco = isFirstBarOfStep;
  const showRightDeco = isLastBarOfStep;

  return (
    <div
      className={`absolute ${bgClass} text-[11px] font-semibold flex items-center overflow-hidden z-10 group/bar select-none ${isDragging ? 'shadow-lg' : 'hover:brightness-110'}`}
      data-step-key={stepKey}
      style={{
        top,
        height: SLOT_HEIGHT - 4,
        left: `calc(${left}% + ${showLeftDeco ? 3 : 0}px)`,
        width: `calc(${width}% - ${(showLeftDeco ? 3 : 0) + (showRightDeco ? 3 : 0)}px)`,
        borderRadius,
        borderLeft: showLeftDeco ? `2px solid ${borderColor}` : 'none',
        borderRight: showRightDeco ? `2px solid ${borderColor}` : 'none',
        borderTop: showLeftDeco || showRightDeco ? `1px solid ${borderColor}` : 'none',
        borderBottom: showLeftDeco || showRightDeco ? `1px solid ${borderColor}` : 'none',
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: isDragging ? 'none' : 'filter 0.1s',
      }}
      title={`${task.title} · ${meta.label}${blocked ? ' · BLOQUEADO' : ''}`}
      onMouseDown={e => onStartDrag(e, bar, 'move', task)}
      onMouseEnter={(e) => {
        document.querySelectorAll(`[data-step-key="${stepKey}"]`).forEach(el => {
          if (el !== e.currentTarget) el.classList.add('brightness-110');
        });
      }}
      onMouseLeave={() => {
        document.querySelectorAll(`[data-step-key="${stepKey}"]`).forEach(el => {
          el.classList.remove('brightness-110');
        });
      }}
      onClick={onClick}
    >
      {showLeftDeco && (
        <div
          className={`absolute left-0 top-0 bottom-0 w-2 ${meta.handle} cursor-ew-resize z-20`}
          style={{ borderRadius: 'inherit' }}
          onMouseDown={e => { e.stopPropagation(); onStartDrag(e, bar, 'resize-start', task); }}
        />
      )}
      {showLeftDeco && (
        <span className="flex items-center gap-1 px-1.5 truncate leading-none pointer-events-none min-w-0">
          {blocked
            ? <AlertTriangle className="w-3 h-3 shrink-0" />
            : <span className={`shrink-0 text-[9px] font-bold px-1 py-0.5 rounded ${meta.tagBg}`}>{meta.tag}</span>
          }
          <span className="truncate text-[11px]">{task.title}</span>
        </span>
      )}
      {showRightDeco && (
        <div
          className={`absolute right-0 top-0 bottom-0 w-2 ${meta.handle} cursor-ew-resize z-20`}
          style={{ borderRadius: 'inherit' }}
          onMouseDown={e => { e.stopPropagation(); onStartDrag(e, bar, 'resize-end', task); }}
        />
      )}
    </div>
  );
};

export default StepBar;
