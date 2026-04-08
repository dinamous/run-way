import { useMemo, useState } from 'react';
import type { Task } from '@/lib/steps';
import type { Member } from '@/hooks/useSupabase';

export interface NormalisedTask {
  task: Task;
  referenceDate: string;
}

function getReferenceDate(task: Task): string {
  const activeEnds = task.steps
    .filter(s => s.active && s.end)
    .map(s => s.end)
    .sort();
  if (activeEnds.length > 0) return activeEnds[activeEnds.length - 1];
  return task.createdAt.split('T')[0];
}

function toMonthKey(date: string): string {
  return date.slice(0, 7);
}

function addMonths(date: string, n: number): string {
  const d = new Date(date + 'T00:00:00');
  d.setMonth(d.getMonth() + n);
  return d.toISOString().split('T')[0];
}

export function useListFilters(tasks: Task[], _members: Member[]) {
  const [filterPeriodMonths, setFilterPeriodMonths] = useState(3);
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const rangeStart = addMonths(today, -filterPeriodMonths);
  const rangeEnd = addMonths(today, filterPeriodMonths);

  const groupedTasks = useMemo(() => {
    const normalised: NormalisedTask[] = tasks
      .map(task => ({ task, referenceDate: getReferenceDate(task) }))
      .filter(({ referenceDate }) => referenceDate >= rangeStart && referenceDate <= rangeEnd)
      .filter(({ task }) => {
        if (filterAssignee) {
          const allAssignees = task.steps.flatMap(s => s.assignees);
          if (!allAssignees.includes(filterAssignee)) return false;
        }
        if (filterStatus) {
          const taskStatus = task.status.blocked ? 'bloqueado' : 'em andamento';
          if (taskStatus !== filterStatus) return false;
        }
        return true;
      });

    const map = new Map<string, NormalisedTask[]>();
    for (const item of normalised) {
      const key = toMonthKey(item.referenceDate);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }

    const sortedKeys = [...map.keys()].sort((a, b) => b.localeCompare(a));
    const sorted = new Map<string, NormalisedTask[]>();
    for (const key of sortedKeys) {
      sorted.set(key, map.get(key)!);
    }
    return sorted;
  }, [tasks, filterAssignee, filterStatus, rangeStart, rangeEnd]);

  const clearFilters = () => {
    setFilterPeriodMonths(3);
    setFilterAssignee('');
    setFilterStatus('');
  };

  return {
    filterPeriodMonths, setFilterPeriodMonths,
    filterAssignee, setFilterAssignee,
    filterStatus, setFilterStatus,
    groupedTasks,
    rangeStart,
    rangeEnd,
    clearFilters,
  };
}
