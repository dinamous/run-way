import { useMemo } from 'react';
import { normaliseTask, todayStr } from '@/utils/dashboardUtils';
import { getCurrentStep } from '@/lib/steps';
import type { Task } from '@/types/task';
import { usePlanningFiltersStore } from '@/store/usePlanningFiltersStore';

export type { CalendarViewMode } from '@/store/usePlanningFiltersStore';

export function useTaskFilters(tasks: Task[], enablePeriodFilter = false, initialAssignee = '') {
  const {
    filterAssignee, setFilterAssignee,
    filterStatus, setFilterStatus,
    filterSteps,
    filterPeriodDays, setFilterPeriodDays,
    viewMode, setViewMode,
    toggleStepFilter,
    clearFilters,
  } = usePlanningFiltersStore();

  // seed assignee from redirect only once — store handles persistence
  useMemo(() => {
    if (initialAssignee && !filterAssignee) setFilterAssignee(initialAssignee);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAssignee]);

  const periodStart = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return start;
  }, []);

  const periodEnd = useMemo(() => {
    const end = new Date(periodStart);
    end.setDate(end.getDate() + filterPeriodDays - 1);
    return end;
  }, [filterPeriodDays, periodStart]);

  const hasActiveFilters = !!(
    filterAssignee ||
    filterStatus ||
    filterSteps.length > 0 ||
    (enablePeriodFilter && filterPeriodDays !== 60)
  );

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
          const anyStepHas = norm.subtasks.some(s => s.assignees.includes(filterAssignee));
          if (!anyStepHas) return false;
        }
        if (filterSteps.length > 0) {
          const norm = normaliseTask(task);
          const activeTypes = norm.subtasks.filter(s => s.active).map(s => s.status);
          if (!filterSteps.some(ft => activeTypes.includes(ft))) return false;
        }
        if (enablePeriodFilter) {
          const norm = normaliseTask(task);
          const intersectsPeriod = norm.subtasks.some(step => {
            if (!step.active || !step.start || !step.end) return false;
            const stepStart = new Date(step.start + 'T00:00:00');
            const stepEnd = new Date(step.end + 'T00:00:00');
            if (Number.isNaN(stepStart.getTime()) || Number.isNaN(stepEnd.getTime())) return false;
            return stepEnd >= periodStart && stepStart <= periodEnd;
          });
          if (!intersectsPeriod) return false;
        }
        return true;
      })
      .map(task => {
        const norm = normaliseTask(task);
        let subtasks = norm.subtasks;
        if (filterSteps.length > 0) {
          subtasks = subtasks.filter(s => filterSteps.includes(s.status));
        }
        if (filterAssignee) {
          subtasks = subtasks.filter(s => s.assignees.includes(filterAssignee));
        }
        return { ...norm, subtasks };
      });
  }, [tasks, filterAssignee, filterStatus, filterSteps, enablePeriodFilter, periodStart, periodEnd]);

  const blockedCount = useMemo(
    () => tasks.filter(t => {
      const norm = normaliseTask(t);
      return !norm.concludedAt && norm.status?.blocked;
    }).length,
    [tasks]
  );

  const activeCount = useMemo(() => {
    const today = todayStr();
    return tasks.filter(t => {
      const norm = normaliseTask(t);
      if (norm.concludedAt) return false;
      const step = getCurrentStep(norm.subtasks ?? [], today);
      return step && step.start <= today && step.end >= today;
    }).length;
  }, [tasks]);

  return {
    filterAssignee, setFilterAssignee,
    filterStatus, setFilterStatus,
    filterSteps,
    filterPeriodDays, setFilterPeriodDays,
    viewMode, setViewMode,
    hasActiveFilters,
    clearFilters,
    toggleStepFilter,
    filteredTasks,
    blockedCount,
    activeCount,
  };
}
