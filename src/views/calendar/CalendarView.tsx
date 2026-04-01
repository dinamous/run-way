import React from 'react';
import { DAY_HEADER_H, MAX_SLOTS, SLOT_HEIGHT, ROW_PADDING } from '../../utils/dashboardUtils';
import type { CalendarViewProps } from '../../types/props';
import { useCalendarNavigation } from './hooks/useCalendarNavigation';
import { useCalendarDrag } from './hooks/useCalendarDrag';
import CalendarHeader from './components/CalendarHeader';
import DayHeaders from './components/DayHeaders';
import WeekRow from './components/WeekRow';

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onEdit, onUpdateTask }) => {
  const { today, monthDate, weeks, prevMonth, nextMonth, goToday } = useCalendarNavigation();
  const { dragPreview, didDragRef, startDrag } = useCalendarDrag(tasks, onUpdateTask);
  const rowHeight = DAY_HEADER_H + MAX_SLOTS * SLOT_HEIGHT + ROW_PADDING;

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <CalendarHeader
        monthDate={monthDate}
        onPrevMonth={prevMonth}
        onNextMonth={nextMonth}
        onGoToday={goToday}
      />
      <DayHeaders />
      <div>
        {weeks.map((week, wi) => (
          <WeekRow
            key={wi}
            week={week}
            tasks={tasks}
            today={today}
            currentMonth={monthDate.getMonth()}
            rowHeight={rowHeight}
            dragPreview={dragPreview}
            didDragRef={didDragRef}
            onStartDrag={startDrag}
            onEdit={onEdit}
          />
        ))}
      </div>
    </div>
  );
};

export default CalendarView;
