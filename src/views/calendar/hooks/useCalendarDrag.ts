import { useState, useRef, useEffect, useCallback } from 'react';
import {
  toLocalDate, toDateStr, addDays, normaliseTask,
  type BarItem, type DragState, type DragPreview, type Task, type Step,
} from '../../../utils/dashboardUtils';

export function useCalendarDrag(tasks: Task[], onUpdateTask: (task: Task) => void) {
  const dragStateRef = useRef<DragState | null>(null);
  const didDragRef = useRef(false);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const ds = dragStateRef.current;
      if (!ds) return;
      const delta = Math.round((e.clientX - ds.startX) / ds.colWidth);
      if (delta !== 0) didDragRef.current = true;
      setDragPreview({ taskId: ds.taskId, stepType: ds.stepType, deltaDays: delta, type: ds.type });
    };

    const onUp = (e: MouseEvent) => {
      const ds = dragStateRef.current;
      if (!ds) return;
      const delta = Math.round((e.clientX - ds.startX) / ds.colWidth);
      if (delta !== 0) {
        const task = tasks.find(t => t.id === ds.taskId);
        if (task) {
          let newStart = new Date(ds.originalStart);
          let newEnd = new Date(ds.originalEnd);
          if (ds.type === 'move') {
            newStart = addDays(ds.originalStart, delta);
            newEnd = addDays(ds.originalEnd, delta);
          } else if (ds.type === 'resize-start') {
            newStart = addDays(ds.originalStart, delta);
            if (newStart >= newEnd) newStart = addDays(newEnd, -1);
          } else {
            newEnd = addDays(ds.originalEnd, delta);
            if (newEnd <= newStart) newEnd = addDays(newStart, 1);
          }
          const norm = normaliseTask(task);
          onUpdateTask({
            ...norm,
            steps: norm.steps.map((s: Step) =>
              s.type === ds.stepType
                ? { ...s, start: toDateStr(newStart), end: toDateStr(newEnd) }
                : s
            ),
          });
        }
      }
      dragStateRef.current = null;
      setDragPreview(null);
      setTimeout(() => { didDragRef.current = false; }, 0);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [tasks, onUpdateTask]);

  const startDrag = useCallback((
    e: React.MouseEvent,
    bar: BarItem,
    type: DragState['type'],
    task: Task,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const container = (e.currentTarget as HTMLElement).closest('[data-week-row]') as HTMLElement;
    const colWidth = container ? container.getBoundingClientRect().width / 7 : 80;
    const norm = normaliseTask(task);
    const step = (norm.steps as Step[]).find(s => s.type === bar.stepType);
    if (!step) return;
    dragStateRef.current = {
      type, taskId: bar.taskId, stepType: bar.stepType,
      originalStart: toLocalDate(step.start),
      originalEnd: toLocalDate(step.end),
      startX: e.clientX,
      colWidth,
    };
    didDragRef.current = false;
  }, []);

  return { dragPreview, didDragRef, startDrag };
}
