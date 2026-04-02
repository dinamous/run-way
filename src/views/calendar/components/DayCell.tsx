import React from 'react';
import { DAY_HEADER_H } from '../../../utils/dashboardUtils';

interface DayCellProps {
  day: Date;
  today: Date;
  currentMonth: number;
  rowHeight: number;
  overflowCount: number;
  holidayName?: string;
}

const DayCell: React.FC<DayCellProps> = ({ day, today, currentMonth, rowHeight, overflowCount, holidayName }) => {
  const isToday = day.getTime() === today.getTime();
  const isThisMonth = day.getMonth() === currentMonth;
  const isWeekend = day.getDay() === 0 || day.getDay() === 6;

  const bgClass = holidayName
    ? 'bg-amber-50 dark:bg-amber-950/30'
    : !isThisMonth
    ? 'bg-muted'
    : isWeekend
    ? 'bg-muted'
    : 'bg-card';

  return (
    <div
      className={`border-r border-border last:border-r-0 flex flex-col select-none ${bgClass}`}
      style={{ height: rowHeight }}
    >
      <div className="flex items-center justify-center gap-1" style={{ height: DAY_HEADER_H }}>
        <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full shrink-0 ${
          isToday ? 'bg-blue-600 text-white font-bold' :
          !isThisMonth ? 'text-muted-foreground' :
          isWeekend ? 'text-muted-foreground' :
          'text-foreground'
        }`}>{day.getDate()}</span>
        {holidayName && (
          <span className="text-[9px] text-amber-700 dark:text-amber-400 truncate font-medium leading-tight">
            {holidayName}
          </span>
        )}
      </div>
      {overflowCount > 0 && (
        <div className="mt-auto mb-1 text-center">
          <span className="text-[9px] text-muted-foreground font-medium">+{overflowCount}</span>
        </div>
      )}
    </div>
  );
};

export default DayCell;
