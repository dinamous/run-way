import React from 'react';
import { PT_DAYS_SHORT } from '../../../utils/dashboardUtils';

const DayHeaders: React.FC = () => (
  <div className="grid grid-cols-7 border-b border-border bg-muted">
    {PT_DAYS_SHORT.map((d, i) => (
      <div key={d} className={`py-2 text-center text-[11px] font-semibold uppercase tracking-wide ${i === 0 || i === 6 ? 'text-muted-foreground' : 'text-foreground'}`}>{d}</div>
    ))}
  </div>
);

export default DayHeaders;
