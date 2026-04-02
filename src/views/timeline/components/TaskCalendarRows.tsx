import React from 'react';
import { getVisibleSteps, type DragPreview, type DragState, type Task, type Step, type StepType } from '@/utils/dashboardUtils';
import type { Member } from '@/types/member';
import type { Holiday } from '@/utils/holidayUtils';
import StepRow from './StepRow';

const PHASE_ROW_H = 28;

interface TaskCalendarRowsProps {
  task: Task;
  members: Member[];
  days: Date[];
  daysRange: number;
  dragPreview: DragPreview | null;
  didDragRef: React.MutableRefObject<boolean>;
  startDrag: (e: React.MouseEvent, taskId: string, stepType: StepType, type: DragState['type'], step: Step, colWidth: number) => void;
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
  taskIndex: number;
  holidays?: Holiday[];
  rowRef?: React.Ref<HTMLDivElement>;
}

const TaskCalendarRows: React.FC<TaskCalendarRowsProps> = ({ task, days, daysRange, dragPreview, didDragRef, startDrag, onEdit, taskIndex, holidays = [], rowRef }) => {
  const visibleSteps = getVisibleSteps(task);
  const totalH = Math.max(visibleSteps.length, 1) * PHASE_ROW_H;
  const stripeBg = taskIndex % 2 === 1 ? 'bg-muted/20' : '';

  return (
    <div
      ref={rowRef}
      className={`flex flex-col border-b border-border group hover:bg-muted/30 transition-colors ${stripeBg}`}
      style={{ minHeight: totalH }}
    >
      {visibleSteps.length === 0 ? (
        <StepRow
          step={null}
          days={days}
          daysRange={daysRange}
          task={task}
          dragPreview={dragPreview}
          didDragRef={didDragRef}
          startDrag={startDrag}
          onEdit={onEdit}
          holidays={holidays}
          flex1
        />
      ) : visibleSteps.map((step) => (
        <StepRow
          key={step.type}
          step={step}
          days={days}
          daysRange={daysRange}
          task={task}
          dragPreview={dragPreview}
          didDragRef={didDragRef}
          startDrag={startDrag}
          onEdit={onEdit}
          holidays={holidays}
          flex1={visibleSteps.length === 1}
        />
      ))}
    </div>
  );
};

export default TaskCalendarRows;
