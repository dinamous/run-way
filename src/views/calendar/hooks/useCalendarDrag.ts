import { useCallback } from 'react';
import { normaliseTask, type BarItem, type DragState, type Task, type Step } from '../../../utils/dashboardUtils';
import { usePhaseDrag } from '@/hooks/usePhaseDrag';

export function useCalendarDrag(tasks: Task[], onUpdateTask: (task: Task) => void) {
  const { dragPreview, didDragRef, startDrag: phaseDragStart } = usePhaseDrag(tasks, onUpdateTask);

  const startDrag = useCallback((
    e: React.MouseEvent,
    bar: BarItem,
    type: DragState['type'],
    task: Task,
  ) => {
    const container = (e.currentTarget as HTMLElement).closest('[data-week-row]') as HTMLElement;
    const colWidth = container ? container.getBoundingClientRect().width / 7 : 80;
    const norm = normaliseTask(task);
    const step = (norm.steps as Step[]).find(s => s.type === bar.stepType);
    if (!step) return;
    phaseDragStart(e, bar.taskId, bar.stepType, type, step, colWidth);
  }, [phaseDragStart]);

  return { dragPreview, didDragRef, startDrag };
}
