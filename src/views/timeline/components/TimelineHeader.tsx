import React from 'react';

interface TimelineHeaderProps {
  daysRange: number;
}

const TimelineHeader: React.FC<TimelineHeaderProps> = ({ daysRange }) => (
  <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted">
    <span className="text-xs font-semibold text-muted-foreground">Linha do Tempo — próximos {daysRange} dias</span>
  </div>
);

export default TimelineHeader;
