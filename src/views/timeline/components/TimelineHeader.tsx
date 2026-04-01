import React from 'react';

interface TimelineHeaderProps {
  daysRange: number;
  onRangeChange: (n: number) => void;
}

const TimelineHeader: React.FC<TimelineHeaderProps> = ({ daysRange, onRangeChange }) => (
  <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted">
    <span className="text-xs font-semibold text-muted-foreground">Linha do Tempo — próximos {daysRange} dias</span>
    <div className="flex items-center gap-1">
      {[14, 30, 60, 90].map(n => (
        <button
          key={n}
          onClick={() => onRangeChange(n)}
          className={`text-xs px-2 py-0.5 rounded border transition-colors ${daysRange === n ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-card'}`}
        >{n}d</button>
      ))}
    </div>
  </div>
);

export default TimelineHeader;
