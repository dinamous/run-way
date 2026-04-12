import React from 'react';
interface DayCellProps {
  day: Date;
  today: Date;
  currentMonth: number;
  rowHeight: string;
  overflowCount: number;
  holidayName?: string;
  weekIndex?: number;
}

const DayCell: React.FC<DayCellProps> = ({ day, today, currentMonth, rowHeight, overflowCount, holidayName, weekIndex = 0 }) => {
  const isToday = day.getTime() === today.getTime();
  const isThisMonth = day.getMonth() === currentMonth;
  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
  const isEvenWeek = weekIndex % 2 === 0;

  const bgClass = holidayName
    ? 'bg-amber-50 dark:bg-amber-950/30'
    : !isThisMonth
    ? 'cal-day-outside'
    : isWeekend
    ? 'cal-day-weekend'
    : isEvenWeek
    ? 'cal-day-even'
    : 'cal-day-odd';

  return (
    <div
      className={`border-r border-border last:border-r-0 flex flex-col select-none ${bgClass}`}
      style={{ height: rowHeight }}
    >
      <div className="flex flex-col items-center justify-center gap-0.5 px-1" style={{ height: 'var(--cal-day-header-h)' }}>
        <span className={`text-[11px] sm:text-xs font-medium w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full shrink-0 ${
          isToday ? 'bg-blue-600 text-white font-bold' :
          !isThisMonth ? 'text-muted-foreground' :
          isWeekend ? 'text-muted-foreground' :
          'text-foreground'
        }`}>{day.getDate()}</span>
        {holidayName && (
          <span className="max-w-full text-[10px] sm:text-[11px] text-amber-700 dark:text-amber-400 truncate font-semibold leading-none" title={holidayName}>
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
