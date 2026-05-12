import React from 'react';
import { DAY_COL_W, type DragPreview, type DragState, type Task, type Subtask } from '@/utils/dashboardUtils';
import type { Holiday } from '@/utils/holidayUtils';
import { getHolidayName } from '@/utils/holidayUtils';
import PhaseBar from './PhaseBar';

const PHASE_ROW_H = 28;

const toDateStr = (d: Date) => d.toISOString().slice(0, 10);

interface StepRowProps {
  subtask: Subtask | null;
  days: Date[];
  daysRange: number;
  task: Task;
  dragPreview: DragPreview | null;
  didDragRef: React.MutableRefObject<boolean>;
  startDrag: (e: React.MouseEvent, taskId: string, subtaskId: string, type: DragState['type'], subtask: Subtask, colWidth: number) => void;
  onEdit: (t: Task) => void;
  holidays?: Holiday[];
  flex1?: boolean;
}

const StepRow: React.FC<StepRowProps> = React.memo(({ subtask, days, daysRange, task, dragPreview, didDragRef, startDrag, onEdit, holidays = [], flex1 = false }) => (
  <div className={`relative overflow-hidden${flex1 ? ' flex-1' : ''}`} style={{ minHeight: PHASE_ROW_H, width: daysRange * DAY_COL_W }}>
    <div className="absolute inset-0 flex pointer-events-none">
      {days.map((d, i) => {
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        const isHoliday = !!getHolidayName(toDateStr(d), holidays);
        const bgClass = isHoliday ? 'bg-amber-50/60 dark:bg-amber-950/20' : isWeekend ? 'bg-zinc-200/70 dark:bg-zinc-700/40' : '';
        return <div key={i} className={`shrink-0 border-r border-border/50 ${bgClass}`} style={{ width: DAY_COL_W }} />;
      })}
    </div>
    {subtask && (
      <PhaseBar
        subtask={subtask}
        task={task}
        days={days}
        dragPreview={dragPreview}
        didDragRef={didDragRef}
        startDrag={startDrag}
        onEdit={onEdit}
      />
    )}
  </div>
), (prev, next) =>
  prev.task.id === next.task.id &&
  prev.task.concludedAt === next.task.concludedAt &&
  prev.task.status?.blocked === next.task.status?.blocked &&
  prev.subtask?.id === next.subtask?.id &&
  prev.subtask?.status === next.subtask?.status &&
  prev.subtask?.start === next.subtask?.start &&
  prev.subtask?.end === next.subtask?.end &&
  prev.subtask?.title === next.subtask?.title &&
  prev.days.length === next.days.length &&
  prev.daysRange === next.daysRange &&
  prev.dragPreview === next.dragPreview &&
  (prev.holidays ?? []).length === (next.holidays ?? []).length
);

export default StepRow;
