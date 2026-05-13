import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { StepType } from '@/lib/steps';

export type CalendarViewMode = 'step' | 'demand';

interface PlanningFiltersState {
  filterAssignee: string;
  setFilterAssignee: (value: string) => void;

  filterStatus: string;
  setFilterStatus: (value: string) => void;

  filterSteps: StepType[];
  toggleStepFilter: (type: StepType) => void;

  filterPeriodDays: number;
  setFilterPeriodDays: (value: number) => void;

  viewMode: CalendarViewMode;
  setViewMode: (mode: CalendarViewMode) => void;

  clearFilters: () => void;
}

export const usePlanningFiltersStore = create<PlanningFiltersState>()(
  devtools(
    (set) => ({
      filterAssignee: '',
      setFilterAssignee: (filterAssignee) => set({ filterAssignee }),

      filterStatus: '',
      setFilterStatus: (filterStatus) => set({ filterStatus }),

      filterSteps: [],
      toggleStepFilter: (type) =>
        set((s) => ({
          filterSteps: s.filterSteps.includes(type)
            ? s.filterSteps.filter((t) => t !== type)
            : [...s.filterSteps, type],
        })),

      filterPeriodDays: 60,
      setFilterPeriodDays: (filterPeriodDays) => set({ filterPeriodDays }),

      viewMode: 'step',
      setViewMode: (viewMode) => set({ viewMode }),

      clearFilters: () =>
        set({ filterAssignee: '', filterStatus: '', filterSteps: [], filterPeriodDays: 60 }),
    }),
    { name: 'app/planning-filters', enabled: true }
  )
);
