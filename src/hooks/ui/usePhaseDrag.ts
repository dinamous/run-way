import { useState, useRef, useEffect, useCallback } from 'react';
import {
  toLocalDate, toDateStr, addDays, normaliseTask,
  type DragState, type DragPreview, type Task, type Subtask,
} from '@/utils/dashboardUtils';
import { isWeekendOrHoliday, nextNonHolidayBusinessDay, type Holiday } from '@/utils/holidayUtils';

type PendingDragUpdate = { task: Task; subtaskId: string };

export function usePhaseDrag(tasks: Task[], onUpdateTask: (task: Task) => void, holidays: Holiday[] = []) {
  const dragStateRef = useRef<DragState | null>(null);
  const didDragRef = useRef(false);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const [pendingDragUpdate, setPendingDragUpdate] = useState<PendingDragUpdate | null>(null);
  const originalTaskRef = useRef<{ start: Date; end: Date } | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const ds = dragStateRef.current;
      if (!ds) return;
      const delta = Math.round((e.clientX - ds.startX) / ds.colWidth);
      if (delta !== 0) didDragRef.current = true;
      setDragPreview({ taskId: ds.taskId, subtaskId: ds.subtaskId, deltaDays: delta, type: ds.type });
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
          const updatedTask: Task = {
            ...norm,
            subtasks: norm.subtasks.map((s: Subtask) =>
              s.id === ds.subtaskId
                ? { ...s, start: toDateStr(newStart), end: toDateStr(newEnd) }
                : s
            ),
          };

          const startStr = toDateStr(newStart);
          const endStr = toDateStr(newEnd);
          if (isWeekendOrHoliday(startStr, holidays) || isWeekendOrHoliday(endStr, holidays)) {
            originalTaskRef.current = { start: ds.originalStart, end: ds.originalEnd };
            setPendingDragUpdate({ task: updatedTask, subtaskId: ds.subtaskId });
          } else {
            onUpdateTask(updatedTask);
          }
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
  }, [tasks, onUpdateTask, holidays]);

  const startDrag = useCallback((
    e: React.MouseEvent,
    taskId: string,
    subtaskId: string,
    type: DragState['type'],
    subtask: Subtask,
    colWidth: number,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    dragStateRef.current = {
      type, taskId, subtaskId,
      originalStart: toLocalDate(subtask.start),
      originalEnd: toLocalDate(subtask.end),
      startX: e.clientX,
      colWidth,
    };
    didDragRef.current = false;
  }, []);

  const confirmDrag = useCallback(() => {
    if (!pendingDragUpdate) return;
    onUpdateTask(pendingDragUpdate.task);
    setPendingDragUpdate(null);
    originalTaskRef.current = null;
  }, [pendingDragUpdate, onUpdateTask]);

  const cancelDrag = useCallback(() => {
    setPendingDragUpdate(null);
    originalTaskRef.current = null;
  }, []);

  const postponeDragToBusinessDay = useCallback(() => {
    if (!pendingDragUpdate) return;

    const adjustedTask: Task = {
      ...pendingDragUpdate.task,
      subtasks: pendingDragUpdate.task.subtasks.map((s: Subtask) => {
        if (s.id !== pendingDragUpdate.subtaskId) return s;

        const adjustedStart = isWeekendOrHoliday(s.start, holidays)
          ? nextNonHolidayBusinessDay(s.start, holidays)
          : s.start;
        let adjustedEnd = isWeekendOrHoliday(s.end, holidays)
          ? nextNonHolidayBusinessDay(s.end, holidays)
          : s.end;

        if (adjustedEnd < adjustedStart) adjustedEnd = adjustedStart;

        return { ...s, start: adjustedStart, end: adjustedEnd };
      }),
    };

    onUpdateTask(adjustedTask);
    setPendingDragUpdate(null);
    originalTaskRef.current = null;
  }, [pendingDragUpdate, holidays, onUpdateTask]);

  return { dragPreview, didDragRef, startDrag, pendingDragUpdate, confirmDrag, cancelDrag, postponeDragToBusinessDay };
}
