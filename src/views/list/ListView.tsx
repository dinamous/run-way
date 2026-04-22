import { useAuthContext } from '@/contexts/AuthContext';
import { useTasksQuery } from '@/hooks/useTasksQuery';
import { useMembersQuery } from '@/hooks/useMembersQuery';
import { useClients } from '@/hooks/useClients';
import { useTaskQuickActions } from '@/hooks/useTaskQuickActions';
import type { Task } from '@/lib/steps';
import { useListFilters } from './hooks/useListFilters';
import { FilterBar } from '@/views/dashboard/components/FilterBar';
import { MonthGroup } from './components/MonthGroup';
import { useTaskFilters } from '@/views/dashboard/hooks/useTaskFilters';

interface ListViewProps {
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onOpenNew: () => void;
  onExport: () => void;
}

export function ListView({ onEdit, onDelete, onOpenNew, onExport }: ListViewProps) {
  const { member } = useAuthContext();
  const { effectiveClientId, isAdmin } = useClients();
  const { data: tasks = [] } = useTasksQuery(effectiveClientId, isAdmin);
  const { data: members = [] } = useMembersQuery(effectiveClientId);
  const { concludeTask, toggleBlock } = useTaskQuickActions(member?.auth_user_id);

  const {
    filterAssignee, setFilterAssignee,
    filterStatus, setFilterStatus,
    filterSteps,
    toggleStepFilter,
    hasActiveFilters,
    clearFilters,
    filteredTasks,
  } = useTaskFilters(tasks, false, '');

  const {
    filterPeriodMonths, setFilterPeriodMonths,
    groupedTasks,
  } = useListFilters(filteredTasks, members);

  const today = new Date().toISOString().slice(0, 7);

  const handleConclude = (task: Task) => concludeTask(task);
  const handleToggleBlock = (task: Task) => toggleBlock(task);

  const togglePeriod = (months: number) => {
    if (filterPeriodMonths === months) return;
    setFilterPeriodMonths(months);
  };

  return (
    <div className="space-y-4">
      <FilterBar
        members={members}
        filterAssignee={filterAssignee}
        onChangeAssignee={setFilterAssignee}
        filterStatus={filterStatus}
        onChangeStatus={setFilterStatus}
        filterSteps={filterSteps}
        onToggleStep={toggleStepFilter}
        showPeriodFilter={true}
        filterPeriodDays={filterPeriodMonths}
        onChangePeriodDays={togglePeriod}
        showViewMode={false}
        viewMode="step"
        onChangeViewMode={() => {}}
        onExport={onExport}
        onOpenNew={onOpenNew}
        hasActiveFilters={hasActiveFilters}
        onClear={clearFilters}
        filteredCount={groupedTasks.size}
        totalCount={tasks.length}
      />

      {groupedTasks.size === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Nenhuma demanda neste período com os filtros selecionados.
        </p>
      ) : (
        <div className="space-y-6">
          {[...groupedTasks.entries()].map(([monthKey, items]) => (
            <MonthGroup
              key={monthKey}
              monthKey={monthKey}
              items={items}
              isCurrentMonth={monthKey === today}
              members={members}
              onEdit={onEdit}
              onDelete={onDelete}
              onConclude={handleConclude}
              onToggleBlock={handleToggleBlock}
            />
          ))}
        </div>
      )}
    </div>
  );
}
