import { useState, useMemo } from 'react';
import type { StepType } from '@/lib/steps';
import { normaliseTask, todayStr } from '@/utils/dashboardUtils';
import { getCurrentStep } from '@/lib/steps';
import type { Task } from '@/types/task';

export function useTaskFilters(tasks: Task[]) {
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSteps, setFilterSteps] = useState<StepType[]>([]);

  const hasActiveFilters = !!(filterAssignee || filterStatus || filterSteps.length > 0);

  const clearFilters = () => {
    setFilterAssignee('');
    setFilterStatus('');
    setFilterSteps([]);
  };

  const toggleStepFilter = (type: StepType) => {
    setFilterSteps(prev =>
      prev.includes(type) ? prev.filter(s => s !== type) : [...prev, type]
    );
  };

  const filteredTasks = useMemo(() => {
    return tasks
      .filter(task => {
        if (filterStatus) {
          const norm = normaliseTask(task);
          if (filterStatus === 'bloqueado' && !norm.status?.blocked) return false;
          if (filterStatus === 'nao-bloqueado' && norm.status?.blocked) return false;
        }
        if (filterAssignee) {
          const norm = normaliseTask(task);
          const anyStepHas = norm.steps.some(s => s.assignees.includes(filterAssignee));
          if (!anyStepHas) return false;
        }
        if (filterSteps.length > 0) {
          const norm = normaliseTask(task);
          const activeTypes = norm.steps.filter(s => s.active).map(s => s.type);
          if (!filterSteps.some(ft => activeTypes.includes(ft))) return false;
        }
        return true;
      })
      .map(task => {
        const norm = normaliseTask(task);
        let steps = norm.steps;
        if (filterSteps.length > 0) {
          steps = steps.filter(s => filterSteps.includes(s.type));
        }
        if (filterAssignee) {
          steps = steps.filter(s => s.assignees.includes(filterAssignee));
        }
        return { ...norm, steps };
      });
  }, [tasks, filterAssignee, filterStatus, filterSteps]);

  const blockedCount = useMemo(
    () => tasks.filter(t => normaliseTask(t).status?.blocked).length,
    [tasks]
  );

  const activeCount = useMemo(() => {
    const today = todayStr();
    return tasks.filter(t => {
      const norm = normaliseTask(t);
      const step = getCurrentStep(norm.steps ?? [], today);
      return step && step.start <= today && step.end >= today;
    }).length;
  }, [tasks]);

  return {
    filterAssignee,
    setFilterAssignee,
    filterStatus,
    setFilterStatus,
    filterSteps,
    hasActiveFilters,
    clearFilters,
    toggleStepFilter,
    filteredTasks,
    blockedCount,
    activeCount,
  };
}
