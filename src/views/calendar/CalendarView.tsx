import React from 'react';
import { MAX_SLOTS } from '../../utils/dashboardUtils';
import type { CalendarViewProps } from '../../types/props';
import { useCalendarNavigation } from './hooks/useCalendarNavigation';
import { useCalendarDrag } from './hooks/useCalendarDrag';
import CalendarHeader from './components/CalendarHeader';
import DayHeaders from './components/DayHeaders';
import WeekRow from './components/WeekRow';
import { ConfirmModal } from '@/components/ui';

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onEdit, onUpdateTask, holidays }) => {
  const { today, monthDate, weeks, prevMonth, nextMonth, goToday } = useCalendarNavigation();
  const { dragPreview, didDragRef, startDrag, pendingDragUpdate, confirmDrag, cancelDrag, postponeDragToBusinessDay } = useCalendarDrag(tasks, onUpdateTask, holidays);
  const rowHeight = `calc(var(--cal-day-header-h) + ${MAX_SLOTS} * var(--cal-slot-height) + var(--cal-row-padding))`;

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <CalendarHeader
        monthDate={monthDate}
        onPrevMonth={prevMonth}
        onNextMonth={nextMonth}
        onGoToday={goToday}
      />
      <div
        className="overflow-x-auto overscroll-x-contain"
        style={{
          ['--cal-day-header-h' as string]: 'clamp(32px, 9vw, 40px)',
          ['--cal-slot-height' as string]: 'clamp(20px, 6vw, 28px)',
          ['--cal-row-padding' as string]: 'clamp(4px, 2vw, 8px)',
        }}
      >
        <div className="min-w-full sm:min-w-[720px]">
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
                holidays={holidays}
              />
            ))}
          </div>
        </div>
      </div>
      {pendingDragUpdate && (
        <ConfirmModal
          title="Fase em fim de semana ou feriado"
          message="A fase foi movida para uma data em fim de semana ou feriado. Deseja manter mesmo assim?"
          secondaryConfirmLabel="Prolongar para próximo dia útil"
          onSecondaryConfirm={postponeDragToBusinessDay}
          onConfirm={confirmDrag}
          onCancel={cancelDrag}
        />
      )}
    </div>
  );
};

export default CalendarView;
