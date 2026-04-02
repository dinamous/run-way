import { useState } from 'react';
import { CalendarView } from '@/views/calendar';
import TimelineView from '@/views/timeline';
import { useTaskFilters } from './hooks/useTaskFilters';
import { DashboardHeader } from './components/DashboardHeader';
import { FilterBar } from './components/FilterBar';
import { MetricsBar } from './components/MetricsBar';
import { StepsLegend } from './components/StepsLegend';
import type { DashboardViewProps } from '@/types/props';

const DashboardView: React.FC<DashboardViewProps> = ({ tasks, members, onEdit, onDelete, onUpdateTask, onOpenNew, onExport, holidays }) => {
  const [calView, setCalView] = useState<'calendar' | 'timeline'>('calendar');
  const {
    filterAssignee, setFilterAssignee,
    filterStatus, setFilterStatus,
    filterSteps, hasActiveFilters,
    clearFilters, toggleStepFilter,
    filteredTasks, blockedCount, activeCount,
  } = useTaskFilters(tasks);

  return (
    <div className="space-y-5">
      <DashboardHeader
        calView={calView}
        onChangeView={setCalView}
        onExport={onExport}
        onOpenNew={onOpenNew}
      />
      <MetricsBar
        totalCount={tasks.length}
        activeCount={activeCount}
        blockedCount={blockedCount}
      />

      <FilterBar
        members={members}
        filterAssignee={filterAssignee}
        onChangeAssignee={setFilterAssignee}
        filterStatus={filterStatus}
        onChangeStatus={setFilterStatus}
        filterSteps={filterSteps}
        onToggleStep={toggleStepFilter}
        hasActiveFilters={hasActiveFilters}
        onClear={clearFilters}
        filteredCount={filteredTasks.length}
        totalCount={tasks.length}
      />

      

      {calView === 'calendar' ? (
        <CalendarView tasks={filteredTasks} members={members} onEdit={onEdit} onDelete={onDelete} onUpdateTask={onUpdateTask} holidays={holidays} />
      ) : (
        <TimelineView tasks={filteredTasks} members={members} onEdit={onEdit} onDelete={onDelete} onUpdateTask={onUpdateTask} holidays={holidays} />
      )}

      <StepsLegend />
    </div>
  );
};

export default DashboardView;
