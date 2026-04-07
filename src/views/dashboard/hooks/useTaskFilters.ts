import { useState, useMemo } from 'react';
import type { StepType } from '@/lib/steps';
import { normaliseTask, todayStr } from '@/utils/dashboardUtils';
import { getCurrentStep } from '@/lib/steps';
import type { Task } from '@/types/task';

export type CalendarViewMode = 'step' | 'demand';

export function useTaskFilters(tasks: Task[], enablePeriodFilter = false, initialAssignee = '') {
  const [filterAssignee, setFilterAssignee] = useState(() => initialAssignee);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSteps, setFilterSteps] = useState<StepType[]>([]);
  const [filterPeriodDays, setFilterPeriodDays] = useState(60);
  const [viewMode, setViewMode] = useState<CalendarViewMode>('step');
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

  const clearFilters = () => {
    setFilterAssignee('');
    setFilterStatus('');
    setFilterSteps([]);
    setFilterPeriodDays(60);
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

        if (enablePeriodFilter) {
          const norm = normaliseTask(task);
          const intersectsPeriod = norm.steps.some(step => {
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
        let steps = norm.steps;
        if (filterSteps.length > 0) {
          steps = steps.filter(s => filterSteps.includes(s.type));
        }
        if (filterAssignee) {
          steps = steps.filter(s => s.assignees.includes(filterAssignee));
        }
        return { ...norm, steps };
      });
  }, [tasks, filterAssignee, filterStatus, filterSteps, enablePeriodFilter, periodStart, periodEnd]);

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
    filterPeriodDays,
    setFilterPeriodDays,
    viewMode,
    setViewMode,
    hasActiveFilters,
    clearFilters,
    toggleStepFilter,
    filteredTasks,
    blockedCount,
    activeCount,
  };
}
