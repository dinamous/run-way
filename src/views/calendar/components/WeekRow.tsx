import React from 'react';
import {
  MAX_SLOTS, layoutWeekBars,
  type BarItem, type DragPreview, type DragState, type Task,
} from '../../../utils/dashboardUtils';
import type { Holiday } from '../../../utils/holidayUtils';
import { getHolidayName } from '../../../utils/holidayUtils';
import DayCell from './DayCell';
import StepBar from './StepBar';

interface WeekRowProps {
  week: Date[];
  tasks: Task[];
  today: Date;
  currentMonth: number;
  rowHeight: number;
  dragPreview: DragPreview | null;
  didDragRef: React.RefObject<boolean>;
  onStartDrag: (e: React.MouseEvent, bar: BarItem, type: DragState['type'], task: Task) => void;
  onEdit: (task: Task) => void;
  holidays: Holiday[];
}

const WeekRow: React.FC<WeekRowProps> = ({
  week, tasks, today, currentMonth, rowHeight,
  dragPreview, didDragRef, onStartDrag, onEdit, holidays,
}) => {
  const bars = layoutWeekBars(week, tasks);
  const overflow = Array(7).fill(0);
  for (const bar of bars) {
    if (bar.slot >= MAX_SLOTS) {
      for (let c = bar.startCol; c <= bar.endCol; c++) overflow[c]++;
    }
  }

  function toDateStr(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  return (
    <div
      data-week-row
      className="relative grid grid-cols-7 border-b border-border last:border-b-0"
      style={{ height: rowHeight, overflow: 'hidden' }}
    >
      {week.map((day, di) => (
        <DayCell
          key={di}
          day={day}
          today={today}
          currentMonth={currentMonth}
          rowHeight={rowHeight}
          overflowCount={overflow[di]}
          holidayName={getHolidayName(toDateStr(day), holidays)}
        />
      ))}

      {bars.filter(b => b.slot < MAX_SLOTS).map((bar, bi) => {
        const task = tasks.find(t => t.id === bar.taskId);
        if (!task) return null;
        return (
          <StepBar
            key={`${bar.taskId}-${bar.stepType}-${bi}`}
            bar={bar}
            task={task}
            dragPreview={dragPreview}
            onStartDrag={onStartDrag}
            onClick={() => { if (!didDragRef.current) onEdit(task); }}
          />
        );
      })}
    </div>
  );
};

export default WeekRow;
