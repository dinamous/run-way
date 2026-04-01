import React from 'react';
import { DAY_COL_W, type DragPreview, type DragState, type Task, type Step, type StepType } from '@/utils/dashboardUtils';
import PhaseBar from './PhaseBar';

const PHASE_ROW_H = 28;

interface StepRowProps {
  step: Step | null;
  days: Date[];
  daysRange: number;
  task: Task;
  dragPreview: DragPreview | null;
  didDragRef: React.MutableRefObject<boolean>;
  startDrag: (e: React.MouseEvent, taskId: string, stepType: StepType, type: DragState['type'], step: Step, colWidth: number) => void;
  onEdit: (t: Task) => void;
}

const StepRow: React.FC<StepRowProps> = ({ step, days, daysRange, task, dragPreview, didDragRef, startDrag, onEdit }) => (
  <div className="relative overflow-hidden" style={{ height: PHASE_ROW_H, width: daysRange * DAY_COL_W }}>
    <div className="absolute inset-0 flex pointer-events-none">
      {days.map((d, i) => (
        <div key={i} className={`shrink-0 border-r border-border/50 ${d.getDay() === 0 || d.getDay() === 6 ? 'bg-muted/60' : ''}`} style={{ width: DAY_COL_W }} />
      ))}
    </div>
    {step && (
      <PhaseBar
        step={step}
        task={task}
        days={days}
        dragPreview={dragPreview}
        didDragRef={didDragRef}
        startDrag={startDrag}
        onEdit={onEdit}
      />
    )}
  </div>
);

export default StepRow;
