import React from 'react';
import { getVisibleSteps, type DragPreview, type DragState, type Task, type Step, type StepType } from '@/utils/dashboardUtils';
import type { Member } from '@/types/member';
import TaskInfoPanel from './TaskInfoPanel';
import StepRow from './StepRow';

const PHASE_ROW_H = 28;

interface TaskRowProps {
  task: Task;
  members: Member[];
  days: Date[];
  daysRange: number;
  dragPreview: DragPreview | null;
  didDragRef: React.MutableRefObject<boolean>;
  startDrag: (e: React.MouseEvent, taskId: string, stepType: StepType, type: DragState['type'], step: Step, colWidth: number) => void;
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
}

const TaskRow: React.FC<TaskRowProps> = ({ task, members, days, daysRange, dragPreview, didDragRef, startDrag, onEdit, onDelete }) => {
  const visibleSteps = getVisibleSteps(task);
  const totalH = Math.max(visibleSteps.length, 1) * PHASE_ROW_H;

  return (
    <div className="flex border-b border-border group hover:bg-muted/30 transition-colors">
      <TaskInfoPanel
        task={task}
        members={members}
        visibleSteps={visibleSteps}
        totalH={totalH}
        onEdit={onEdit}
        onDelete={onDelete}
      />
      <div className="flex flex-col">
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
          />
        ) : visibleSteps.map(step => (
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
          />
        ))}
      </div>
    </div>
  );
};


export default TaskRow;
