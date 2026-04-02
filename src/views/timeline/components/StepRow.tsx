import React from 'react';
import { DAY_COL_W, type DragPreview, type DragState, type Task, type Step, type StepType } from '@/utils/dashboardUtils';
import type { Holiday } from '@/utils/holidayUtils';
import { getHolidayName } from '@/utils/holidayUtils';
import PhaseBar from './PhaseBar';

const PHASE_ROW_H = 28;

const toDateStr = (d: Date) => d.toISOString().slice(0, 10);

interface StepRowProps {
  step: Step | null;
  days: Date[];
  daysRange: number;
  task: Task;
  dragPreview: DragPreview | null;
  didDragRef: React.MutableRefObject<boolean>;
  startDrag: (e: React.MouseEvent, taskId: string, stepType: StepType, type: DragState['type'], step: Step, colWidth: number) => void;
  onEdit: (t: Task) => void;
  holidays?: Holiday[];
  flex1?: boolean;
}

const StepRow: React.FC<StepRowProps> = ({ step, days, daysRange, task, dragPreview, didDragRef, startDrag, onEdit, holidays = [], flex1 = false }) => (
  <div className={`relative overflow-hidden${flex1 ? ' flex-1' : ''}`} style={{ minHeight: PHASE_ROW_H, width: daysRange * DAY_COL_W }}>
    <div className="absolute inset-0 flex pointer-events-none">
      {days.map((d, i) => {
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        const isHoliday = !!getHolidayName(toDateStr(d), holidays);
        const bgClass = isHoliday ? 'bg-amber-50/60 dark:bg-amber-950/20' : isWeekend ? 'bg-zinc-200/70 dark:bg-zinc-700/40' : '';
        return <div key={i} className={`shrink-0 border-r border-border/50 ${bgClass}`} style={{ width: DAY_COL_W }} />;
      })}
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
