import React from 'react';
import { MAX_SLOTS, PT_MONTHS } from '../../utils/dashboardUtils';
import type { CalendarViewProps } from '../../types/props';
import { useCalendarNavigation } from './hooks/useCalendarNavigation';
import { useCalendarDrag } from './hooks/useCalendarDrag';
import { usePlanningFiltersStore } from '@/store/usePlanningFiltersStore';
import DayHeaders from './components/DayHeaders';
import WeekRow from './components/WeekRow';
import { ConfirmModal } from '@/components/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const CalendarView: React.FC<CalendarViewProps> = ({ tasks: filteredTasks, onEdit, onUpdateTask, holidays }) => {
  const viewMode = usePlanningFiltersStore((s) => s.viewMode);

  const { today, monthDate, weeks, prevMonth, nextMonth, goToday } = useCalendarNavigation();
  const { dragPreview, didDragRef, startDrag, pendingDragUpdate, confirmDrag, cancelDrag, postponeDragToBusinessDay } = useCalendarDrag(filteredTasks, onUpdateTask, holidays);
  const rowHeight = `calc(var(--cal-day-header-h) + ${MAX_SLOTS} * var(--cal-slot-height) + var(--cal-row-padding))`;

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-5 py-3.5 border-b border-border bg-muted">
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <h3 className="text-base font-semibold text-foreground">
            {PT_MONTHS[monthDate.getMonth()]} {monthDate.getFullYear()}
          </h3>
          <button onClick={goToday} className="text-xs px-2 py-0.5 rounded border border-border text-muted-foreground hover:bg-card transition-colors">Hoje</button>
        </div>
        <div className="flex items-center justify-end gap-1">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

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
                tasks={filteredTasks}
                today={today}
                currentMonth={monthDate.getMonth()}
                rowHeight={rowHeight}
                dragPreview={dragPreview}
                didDragRef={didDragRef}
                onStartDrag={startDrag}
                onEdit={onEdit}
                holidays={holidays}
                viewMode={viewMode}
                weekIndex={wi}
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
