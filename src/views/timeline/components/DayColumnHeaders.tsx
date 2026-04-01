import React from 'react';
import { DAY_COL_W } from '@/utils/dashboardUtils';

interface DayColumnHeadersProps {
  days: Date[];
  today: Date;
  containerRef: React.Ref<HTMLDivElement>;
}

const DayColumnHeaders: React.FC<DayColumnHeadersProps> = ({ days, today, containerRef }) => (
  <div className="flex border-b border-border bg-muted sticky top-0 z-10">
    <div className="w-56 shrink-0 p-3 text-xs font-semibold text-muted-foreground border-r border-border">Demanda</div>
    <div ref={containerRef} className="flex">
      {days.map((d, i) => {
        const isToday = d.getTime() === today.getTime();
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        return (
          <div key={i} className={`shrink-0 border-r border-border py-1.5 text-center ${isWeekend ? 'bg-muted' : ''}`} style={{ width: DAY_COL_W }}>
            <div className={`text-[10px] font-bold mx-auto w-5 h-5 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-foreground'}`}>{d.getDate()}</div>
            <div className="text-[9px] text-muted-foreground">{['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][d.getDay()]}</div>
          </div>
        );
      })}
    </div>
  </div>
);

export default DayColumnHeaders;
