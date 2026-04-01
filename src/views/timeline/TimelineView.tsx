import React, { useRef } from 'react';
import { DAY_COL_W } from '@/utils/dashboardUtils';
import type { TimelineViewProps } from '@/types/props';
import { usePhaseDrag } from '@/hooks/usePhaseDrag';
import { useTimelineDays } from './hooks/useTimelineDays';
import TimelineHeader from './components/TimelineHeader';
import DayColumnHeaders from './components/DayColumnHeaders';
import TaskRow from './components/TaskRow';

const TimelineView: React.FC<TimelineViewProps> = ({ tasks, members, onEdit, onDelete, onUpdateTask }) => {
  const { daysRange, setDaysRange, days, today } = useTimelineDays();
  const { dragPreview, didDragRef, startDrag } = usePhaseDrag(tasks, onUpdateTask);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <div style={{ minWidth: 224 + daysRange * DAY_COL_W }}>
        <TimelineHeader daysRange={daysRange} onRangeChange={setDaysRange} />
        <DayColumnHeaders days={days} today={today} containerRef={containerRef} />

        {tasks.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            Nenhuma demanda. Clique em "Nova Demanda" para começar.
          </div>
        ) : tasks.map(task => (
          <TaskRow
            key={task.id}
            task={task}
            members={members}
            days={days}
            daysRange={daysRange}
            dragPreview={dragPreview}
            didDragRef={didDragRef}
            startDrag={startDrag}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
};

export default TimelineView;
