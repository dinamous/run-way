import React from 'react';
import { DAY_COL_W } from '@/utils/dashboardUtils';
import type { Holiday } from '@/utils/holidayUtils';
import { getHolidayName } from '@/utils/holidayUtils';

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_LABELS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

interface DayColumnHeadersProps {
  days: Date[];
  today: Date;
  containerRef: React.Ref<HTMLDivElement>;
  holidays?: Holiday[];
}

const toDateStr = (d: Date) => d.toISOString().slice(0, 10);

interface MonthGroup {
  label: string;
  count: number;
}

function groupByMonth(days: Date[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const d of days) {
    const label = `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;
    if (groups.length > 0 && groups[groups.length - 1].label === label) {
      groups[groups.length - 1].count++;
    } else {
      groups.push({ label, count: 1 });
    }
  }
  return groups;
}

const DayColumnHeaders: React.FC<DayColumnHeadersProps> = ({ days, today, containerRef, holidays = [] }) => {
  const monthGroups = groupByMonth(days);

  return (
    <div className="flex flex-col border-b border-border bg-muted sticky top-0 z-10">
      {/* Month row */}
      <div className="flex border-b border-border/50">
        {monthGroups.map((group, i) => (
          <div
            key={i}
            className="shrink-0 border-r border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide"
            style={{ width: DAY_COL_W * group.count }}
          >
            {group.label}
          </div>
        ))}
      </div>
      {/* Day row */}
      <div ref={containerRef} className="flex">
        {days.map((d, i) => {
          const isToday = d.getTime() === today.getTime();
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          const holidayName = getHolidayName(toDateStr(d), holidays);
          const bgClass = holidayName ? 'bg-amber-50 dark:bg-amber-950/30' : isWeekend ? 'bg-zinc-200/80 dark:bg-zinc-700/50' : '';
          return (
            <div key={i} className={`shrink-0 border-r border-border py-1.5 text-center ${bgClass}`} style={{ width: DAY_COL_W }}>
              <div className={`text-[10px] font-bold mx-auto w-5 h-5 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : isWeekend && !holidayName ? 'text-slate-500 dark:text-slate-400' : 'text-foreground'}`}>{d.getDate()}</div>
              <div className={`text-[9px] ${holidayName ? 'text-amber-700 dark:text-amber-400 font-medium' : isWeekend ? 'text-slate-500 dark:text-slate-400 font-medium' : 'text-muted-foreground'}`}>{DAY_LABELS[d.getDay()]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DayColumnHeaders;
