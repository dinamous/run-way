import { useEffect } from 'react';
import { useTaskStore } from '@/store/useTaskStore';
import { useMemberStore } from '@/store/useMemberStore';
import { useUIStore } from '@/store/useUIStore';
import { useAuthContext } from '@/contexts/AuthContext';
import { useClients } from '@/hooks/useClients';
import { CalendarView } from '@/views/calendar';
import TimelineView from '@/views/timeline';
import { ListView } from '@/views/list';
import { useTaskFilters } from './hooks/useTaskFilters';
import { FilterBar } from './components/FilterBar';
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

const VIEW_TITLES: Record<string, { title: string; description: string }> = {
  calendar: { title: 'Calendário', description: 'Visualize as demandas em calendário mensal.' },
  timeline: { title: 'Linha do Tempo', description: 'Acompanhe as fases das demandas em Gantt.' },
  list: { title: 'Lista', description: 'Todas as demandas em formato de tabela.' },
};

const DashboardView: React.FC<DashboardViewProps> = ({ subview, onEdit, onDelete, onUpdateTask, onOpenNew, onExport, holidays }) => {
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
    filteredTasks,
  } = useTaskFilters(tasks ?? [], subview === 'timeline', dashboardRedirect?.assigneeId ?? '');

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

  const { title, description } = VIEW_TITLES[subview] ?? { title: 'Calendário', description: '' };

  const header = (
    <div>
      <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );

  const showFilters = subview !== 'list';

  const content = (
    <div className="space-y-5">
      {header}

      {showFilters && (
        <FilterBar
          members={members ?? []}
          filterAssignee={filterAssignee}
          onChangeAssignee={setFilterAssignee}
          filterStatus={filterStatus}
          onChangeStatus={setFilterStatus}
          filterSteps={filterSteps}
          onToggleStep={toggleStepFilter}
          showPeriodFilter={subview === 'timeline'}
          filterPeriodDays={filterPeriodDays}
          onChangePeriodDays={setFilterPeriodDays}
          showViewMode={subview === 'calendar'}
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

      {filteredTasks.length === 0 && showFilters ? (
        <ViewState
          icon={FilterX}
          title="Nenhuma demanda com os filtros atuais"
          description="Limpe os filtros para voltar a ver as demandas deste cliente."
          actionLabel="Limpar filtros"
          onAction={clearFilters}
        />
      ) : subview === 'calendar' ? (
        <CalendarView tasks={filteredTasks} members={members} onEdit={onEdit} onDelete={onDelete} onUpdateTask={onUpdateTask} holidays={holidays} viewMode={viewMode} />
      ) : subview === 'timeline' ? (
        <TimelineView tasks={filteredTasks} members={members} onEdit={onEdit} onDelete={onDelete} onUpdateTask={onUpdateTask} holidays={holidays} daysRange={filterPeriodDays} />
      ) : subview === 'list' ? (
        <ListView onEdit={onEdit} onDelete={(task) => onDelete(task.id)} onOpenNew={onOpenNew} onExport={onExport} />
      ) : null}

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