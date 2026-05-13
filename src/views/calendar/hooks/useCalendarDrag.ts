import { useCallback } from 'react';
import { normaliseTask, type BarItem, type DragState, type Task, type Step } from '../../../utils/dashboardUtils';
import { usePhaseDrag } from '@/hooks/ui/usePhaseDrag';
import type { Holiday } from '@/utils/holidayUtils';

export function useCalendarDrag(tasks: Task[], onUpdateTask: (task: Task) => void, holidays: Holiday[] = []) {
  const {
    dragPreview,
    didDragRef,
    startDrag: phaseDragStart,
    pendingDragUpdate,
    confirmDrag,
    cancelDrag,
    postponeDragToBusinessDay,
  } = usePhaseDrag(tasks, onUpdateTask, holidays);

  const startDrag = useCallback((
    e: React.MouseEvent,
    bar: BarItem,
    type: DragState['type'],
    task: Task,
  ) => {
    const container = (e.currentTarget as HTMLElement).closest('[data-week-row]') as HTMLElement;
    const colWidth = container ? container.getBoundingClientRect().width / 7 : 80;
    const norm = normaliseTask(task);
    const step = (norm.subtasks as Step[]).find(s => s.id === bar.subtaskId);
    if (!step) return;
    phaseDragStart(e, bar.taskId, bar.subtaskId, type, step, colWidth);
  }, [phaseDragStart]);

  return { dragPreview, didDragRef, startDrag, pendingDragUpdate, confirmDrag, cancelDrag, postponeDragToBusinessDay };
}
