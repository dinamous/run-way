import { useAuthContext } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useTasksQuery } from '@/hooks/useTasksQuery';
import { useMembersQuery } from '@/hooks/useMembersQuery';
import { useClients } from '@/hooks/useClients';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
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
  const queryClient = useQueryClient();
  const { effectiveClientId, isAdmin } = useClients();
  const { data: tasks = [] } = useTasksQuery(effectiveClientId, isAdmin);
  const { data: members = [] } = useMembersQuery(effectiveClientId);

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

  const handleConclude = async (task: Task) => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('tasks')
      .update({
        concluded_at: now,
        concluded_by: member?.auth_user_id ?? null,
      })
      .eq('id', task.id);

    if (error) { toast.error('Erro ao concluir demanda'); return; }
    toast.success(`"${task.title}" concluída`);
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const handleToggleBlock = async (task: Task) => {
    const newBlocked = !task.status.blocked;
    const now = new Date().toISOString().split('T')[0];
    const { error } = await supabase
      .from('tasks')
      .update({
        blocked: newBlocked,
        blocked_at: newBlocked ? now : null,
      })
      .eq('id', task.id);

    if (error) { toast.error('Erro ao alterar bloqueio'); return; }
    toast.success(newBlocked ? `"${task.title}" bloqueada` : `"${task.title}" desbloqueada`);
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

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
