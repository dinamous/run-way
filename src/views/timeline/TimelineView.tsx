import React, { useRef } from 'react';
import { DAY_COL_W, STEP_META, getTaskStatusDisplay, getVisibleSteps } from '@/utils/dashboardUtils';
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
import { Edit2, Trash2 } from 'lucide-react';

const formatStepRange = (start: string, end: string) => {
  const startDate = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');
  return `${startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - ${endDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
};

const TimelineView: React.FC<TimelineViewProps> = ({ tasks, members, onEdit, onDelete, onUpdateTask, holidays, daysRange }) => {
  const { days, today } = useTimelineDays(daysRange);
  const { dragPreview, didDragRef, startDrag, pendingDragUpdate, confirmDrag, cancelDrag, postponeDragToBusinessDay } = usePhaseDrag(tasks, onUpdateTask, holidays);
  const containerRef = useRef<HTMLDivElement>(null);
  const { setInfoRef, setCalRef } = useRowHeightSync(tasks.length);
  const { infoHeaderRef, calHeaderRef } = useHeaderHeightSync();

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm w-full">
      <TimelineHeader daysRange={daysRange} />

      <div className="md:hidden w-full">
        {tasks.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">
            Nenhuma demanda no período selecionado.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {tasks.map((task) => {
              const visibleSteps = getVisibleSteps(task);
              const status = getTaskStatusDisplay(task);

              return (
                <div key={task.id} className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">{task.title}</div>
                      <span className={`mt-1 inline-flex text-[10px] px-1.5 py-0.5 rounded-full font-medium ${status.cls}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => onEdit(task)} className="p-1 text-muted-foreground hover:text-blue-600 rounded hover:bg-blue-50 dark:hover:bg-blue-900"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => onDelete(task.id)} className="p-1 text-muted-foreground hover:text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>

                  {visibleSteps.length === 0 ? (
                    <div className="text-xs text-muted-foreground">Sem fases ativas.</div>
                  ) : (
                    <div className="space-y-1.5">
                      {visibleSteps.map((step) => {
                        const assignees = step.assignees
                          .map(id => members.find(member => member.id === id)?.name)
                          .filter(Boolean)
                          .join(', ');

                        return (
                          <div key={step.type} className="rounded-lg border border-border bg-muted/30 px-2 py-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${STEP_META[step.type].tagBg}`}>{STEP_META[step.type].tag}</span>
                              <span className="text-[11px] text-muted-foreground">{formatStepRange(step.start, step.end)}</span>
                            </div>
                            {assignees && <div className="text-[11px] text-muted-foreground mt-1 truncate">{assignees}</div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="hidden md:flex w-full">
        {/* Fixed info column */}
        <div className="shrink-0 w-56 border-r border-border z-20 bg-card">
          <div ref={infoHeaderRef} className="border-b border-border bg-muted flex flex-col h-[41px]">
            
            <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground flex items-center h-[22px]">Demanda</div>
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
