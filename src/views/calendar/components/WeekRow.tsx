import React from 'react';
import {
  layoutWeekBars,
  type BarItem, type DragPreview, type DragState, type Task, type CalendarViewMode,
} from '../../../utils/dashboardUtils';
import type { Holiday } from '../../../utils/holidayUtils';
import { getHolidayName } from '../../../utils/holidayUtils';
import DayCell from './DayCell';
import StepBar from './StepBar';

const DEMAND_COLORS = [
  '#fca5a5', '#fdba8c', '#fde047', '#bef264', '#86efac', 
  '#5eead4', '#7dd3fc', '#a5b4fc', '#c4b5fd', '#f9c5d4',
];

const getDemandColor = (taskId: string): string => {
  const hash = taskId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = hash % DEMAND_COLORS.length;
  return DEMAND_COLORS[index];
};

interface WeekRowProps {
  week: Date[];
  tasks: Task[];
  today: Date;
  currentMonth: number;
  rowHeight: string;
  dragPreview: DragPreview | null;
  didDragRef: React.RefObject<boolean>;
  onStartDrag: (e: React.MouseEvent, bar: BarItem, type: DragState['type'], task: Task) => void;
  onEdit: (task: Task) => void;
  holidays: Holiday[];
  viewMode?: CalendarViewMode;
}

const WeekRow: React.FC<WeekRowProps> = ({
  week, tasks, today, currentMonth, rowHeight,
  dragPreview, didDragRef, onStartDrag, onEdit, holidays,
  viewMode = 'step',
}) => {
  const bars = layoutWeekBars(week, tasks, viewMode);
  
  const maxSlotUsed = bars.reduce((max, bar) => Math.max(max, bar.slot + 1), 0);
  const minSlots = 1;
  const actualSlots = Math.max(minSlots, maxSlotUsed);
  const dynamicRowHeight = `calc(var(--cal-day-header-h) + ${actualSlots} * var(--cal-slot-height) + var(--cal-row-padding))`;
  
  const overflow = Array(7).fill(0);
  for (const bar of bars) {
    if (bar.slot >= actualSlots) {
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
      style={{ height: dynamicRowHeight, overflow: 'hidden' }}
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

      {bars.filter(b => b.slot < actualSlots).map((bar, bi) => {
        const task = tasks.find(t => t.id === bar.taskId);
        if (!task) return null;
        const weekStart = week[0].toISOString().split('T')[0];
        const weekEnd = week[6].toISOString().split('T')[0];
        const isFirstBarOfStep = bar.stepStart >= weekStart;
        const isLastBarOfStep = bar.stepEnd <= weekEnd;
        const demandColor = viewMode === 'demand' ? getDemandColor(bar.taskId) : undefined;
        return (
          <StepBar
            key={`${bar.taskId}-${bar.stepType}-${bi}`}
            bar={bar}
            task={task}
            isFirstBarOfStep={isFirstBarOfStep}
            isLastBarOfStep={isLastBarOfStep}
            dragPreview={dragPreview}
            onStartDrag={onStartDrag}
            onClick={() => { if (!didDragRef.current) onEdit(task); }}
            viewMode={viewMode}
            demandColor={demandColor}
          />
        );
      })}
    </div>
  );
};

export default WeekRow;
