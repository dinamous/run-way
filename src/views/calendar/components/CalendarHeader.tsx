import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PT_MONTHS } from '../../../utils/dashboardUtils';

interface CalendarHeaderProps {
  monthDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onGoToday: () => void;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({ monthDate, onPrevMonth, onNextMonth, onGoToday }) => (
  <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted">
    <div className="flex items-center gap-3">
      <h3 className="text-base font-semibold text-foreground">
        {PT_MONTHS[monthDate.getMonth()]} {monthDate.getFullYear()}
      </h3>
      <button onClick={onGoToday} className="text-xs px-2 py-0.5 rounded border border-border text-muted-foreground hover:bg-card transition-colors">Hoje</button>
    </div>
    <div className="flex items-center gap-1">
      <button onClick={onPrevMonth} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"><ChevronLeft className="w-4 h-4" /></button>
      <button onClick={onNextMonth} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"><ChevronRight className="w-4 h-4" /></button>
    </div>
  </div>
);

export default CalendarHeader;
