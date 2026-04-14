import { useEffect, useState } from 'react';
import { useTaskStore } from '@/store/useTaskStore';
import { useMemberStore } from '@/store/useMemberStore';
import { useUIStore } from '@/store/useUIStore';
import { useAuthContext } from '@/contexts/AuthContext';
import { useClients } from '@/hooks/useClients';
import { CalendarView } from '@/views/calendar';
import TimelineView from '@/views/timeline';
import { ListView } from '@/views/list';
import { useTaskFilters } from './hooks/useTaskFilters';
import { DashboardHeader } from './components/DashboardHeader';
import type { CalView } from './components/DashboardHeader';
import { FilterBar } from './components/FilterBar';
import { MetricsBar } from './components/MetricsBar';
import { StepsLegend } from './components/StepsLegend';
import type { DashboardViewProps } from '@/types/props';
import { ViewState } from '@/components/ViewState';
import { CalendarX2, DatabaseZap, FilterX } from 'lucide-react';
import { Skeleton } from 'boneyard-js/react';

const DASHBOARD_BONES = {
  name: 'dashboard-view',
  viewportWidth: 1280,
  width: 1100,
  height: 560,
  bones: [
    { x: 0, y: 0, w: 100, h: 48, r: 10 },
    { x: 0, y: 64, w: 100, h: 68, r: 10 },
    { x: 0, y: 148, w: 100, h: 84, r: 10 },
    { x: 0, y: 248, w: 100, h: 300, r: 12 },
  ],
};

const DashboardView: React.FC<DashboardViewProps> = ({ onEdit, onDelete, onUpdateTask, onOpenNew, onExport, holidays }) => {
  const { isAdmin } = useAuthContext();
  const { effectiveClientId } = useClients();
  const dashboardRedirect = useUIStore((s) => s.dashboardRedirect);
  const clearDashboardRedirect = useUIStore((s) => s.clearDashboardRedirect);
  const {
    tasks,
    loading: tasksLoading,
    error: tasksError,
    fetchTasks,
    invalidate: invalidateTasks,
  } = useTaskStore();
  const {
    members,
    loading: membersLoading,
    error: membersError,
    fetchMembers,
    invalidate: invalidateMembers,
  } = useMemberStore();
  const [calView, setCalView] = useState<CalView>(() => dashboardRedirect?.mode ?? 'timeline');

  useEffect(() => {
    fetchTasks(effectiveClientId, isAdmin);
    fetchMembers(effectiveClientId);
  }, [effectiveClientId, isAdmin, fetchTasks, fetchMembers]);

  const {
    filterAssignee, setFilterAssignee,
    filterStatus, setFilterStatus,
    filterSteps,
    filterPeriodDays, setFilterPeriodDays,
    viewMode, setViewMode,
    hasActiveFilters,
    clearFilters, toggleStepFilter,
    filteredTasks, blockedCount, activeCount,
  } = useTaskFilters(tasks ?? [], calView === 'timeline', dashboardRedirect?.assigneeId ?? '');

  useEffect(() => {
    if (!dashboardRedirect) return;
    clearDashboardRedirect();
  }, [dashboardRedirect, clearDashboardRedirect]);

  const hasData = tasks.length > 0 || members.length > 0;
  const isLoading = tasksLoading || membersLoading;
  const errorMessage = tasksError || membersError;

  const handleRetry = () => {
    invalidateTasks();
    invalidateMembers();
    fetchTasks(effectiveClientId, isAdmin);
    fetchMembers(effectiveClientId);
  };

  if (errorMessage && !hasData) {
    return (
      <ViewState
        icon={DatabaseZap}
        title="Erro ao carregar dashboard"
        description={`Não foi possível buscar dados no banco agora. Detalhe: ${errorMessage}`}
        actionLabel="Tentar novamente"
        onAction={handleRetry}
      />
    );
  }

  if (tasks.length === 0 && !isLoading) {
    return (
      <ViewState
        icon={CalendarX2}
        title="Sem demandas neste cliente"
        description="Crie uma nova demanda para começar a visualizar calendário e timeline."
        actionLabel="Nova Demanda"
        onAction={onOpenNew}
      />
    );
  }

  const content = filteredTasks.length === 0 ? (
    <div className="space-y-5">
      <DashboardHeader
        calView={calView}
        onChangeView={setCalView}
      />
      <MetricsBar
        totalCount={(tasks ?? []).length}
        visibleCount={filteredTasks.length}
        activeCount={activeCount}
        blockedCount={blockedCount}
      />
      {calView !== 'list' && (
      <FilterBar
        members={members ?? []}
        filterAssignee={filterAssignee}
        onChangeAssignee={setFilterAssignee}
        filterStatus={filterStatus}
        onChangeStatus={setFilterStatus}
        filterSteps={filterSteps}
        onToggleStep={toggleStepFilter}
        showPeriodFilter={calView === 'timeline'}
        filterPeriodDays={filterPeriodDays}
        onChangePeriodDays={setFilterPeriodDays}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        onExport={onExport}
        onOpenNew={onOpenNew}
        hasActiveFilters={hasActiveFilters}
        onClear={clearFilters}
        filteredCount={filteredTasks.length}
        totalCount={(tasks ?? []).length}
      />
      )}
      <ViewState
        icon={FilterX}
        title="Nenhuma demanda com os filtros atuais"
        description="Limpe os filtros para voltar a ver as demandas deste cliente."
        actionLabel="Limpar filtros"
        onAction={clearFilters}
      />
      <StepsLegend />
    </div>
  ) : (
    <div className="space-y-5">
      <DashboardHeader
        calView={calView}
        onChangeView={setCalView}
      />
      <MetricsBar
        totalCount={(tasks ?? []).length}
        visibleCount={filteredTasks.length}
        activeCount={activeCount}
        blockedCount={blockedCount}
      />

      {calView !== 'list' && (
      <FilterBar
        members={members ?? []}
        filterAssignee={filterAssignee}
        onChangeAssignee={setFilterAssignee}
        filterStatus={filterStatus}
        onChangeStatus={setFilterStatus}
        filterSteps={filterSteps}
        onToggleStep={toggleStepFilter}
        showPeriodFilter={calView === 'timeline'}
        filterPeriodDays={filterPeriodDays}
        onChangePeriodDays={setFilterPeriodDays}
        showViewMode={calView === 'calendar'}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        onExport={onExport}
        onOpenNew={onOpenNew}
        hasActiveFilters={hasActiveFilters}
        onClear={clearFilters}
        filteredCount={filteredTasks.length}
        totalCount={(tasks ?? []).length}
      />
      )}

      {calView === 'calendar' ? (
        <CalendarView tasks={filteredTasks} members={members} onEdit={onEdit} onDelete={onDelete} onUpdateTask={onUpdateTask} holidays={holidays} viewMode={viewMode} />
      ) : calView === 'timeline' ? (
        <TimelineView tasks={filteredTasks} members={members} onEdit={onEdit} onDelete={onDelete} onUpdateTask={onUpdateTask} holidays={holidays} daysRange={filterPeriodDays} />
      ) : (
        <ListView onEdit={onEdit} onDelete={(task) => onDelete(task.id)} onOpenNew={onOpenNew} onExport={onExport} />
      )}

      <StepsLegend />
    </div>
  );

  return (
    <Skeleton loading={isLoading} initialBones={DASHBOARD_BONES} animate="shimmer">
      {content}
    </Skeleton>
  );
};

export default DashboardView;
