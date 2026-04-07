import React, { useRef } from 'react';
import { DAY_COL_W } from '@/utils/dashboardUtils';
import type { TimelineViewProps } from '@/types/props';
import { usePhaseDrag } from '@/hooks/usePhaseDrag';
import { useTimelineDays } from './hooks/useTimelineDays';
import { useRowHeightSync } from './hooks/useRowHeightSync';
import { useHeaderHeightSync } from './hooks/useHeaderHeightSync';
import TimelineHeader from './components/TimelineHeader';
import DayColumnHeaders from './components/DayColumnHeaders';
import TaskInfoPanelWrapper from './components/TaskInfoPanelWrapper';
import TaskCalendarRows from './components/TaskCalendarRows';
import { ConfirmModal } from '@/components/ui';

const TimelineView: React.FC<TimelineViewProps> = ({ tasks, members, onEdit, onDelete, onUpdateTask, holidays, daysRange }) => {
  const { days, today } = useTimelineDays(daysRange);
  const { dragPreview, didDragRef, startDrag, pendingDragUpdate, confirmDrag, cancelDrag, postponeDragToBusinessDay } = usePhaseDrag(tasks, onUpdateTask, holidays);
  const containerRef = useRef<HTMLDivElement>(null);
  const { setInfoRef, setCalRef } = useRowHeightSync(tasks.length);
  const { infoHeaderRef, calHeaderRef } = useHeaderHeightSync();

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm w-full">
      <TimelineHeader daysRange={daysRange} />

      <div className="flex w-full">
        {/* Fixed info column */}
        <div className="shrink-0 w-56 border-r border-border z-10">
          <div ref={infoHeaderRef} className="border-b border-border bg-muted sticky top-0 z-10 flex flex-col">
            <div className="border-b border-border/50 px-3 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">&nbsp;</div>
            <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground flex items-center flex-1">Demanda</div>
          </div>
          {tasks.length > 0 && tasks.map((task, i) => (
            <div key={task.id} className={`border-b border-border group hover:bg-muted/30 transition-colors ${i % 2 === 1 ? 'bg-muted/20' : ''}`}>
              <TaskInfoPanelWrapper
                task={task}
                members={members}
                onEdit={onEdit}
                onDelete={onDelete}
                rowRef={setInfoRef(i)}
              />
            </div>
          ))}
        </div>

        {/* Scrollable calendar area */}
        <div className="overflow-x-auto flex-1 min-w-0">
          <div style={{ minWidth: daysRange * DAY_COL_W }}>
            <div ref={calHeaderRef}>
              <DayColumnHeaders days={days} today={today} containerRef={containerRef} holidays={holidays} />
            </div>

            {tasks.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground text-sm">
                Nenhuma demanda. Clique em "Nova Demanda" para comecar.
              </div>
            ) : tasks.map((task, i) => (
              <TaskCalendarRows
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
                taskIndex={i}
                holidays={holidays}
                rowRef={setCalRef(i)}
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

export default TimelineView;
