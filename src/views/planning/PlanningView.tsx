import { useCallback, useEffect, useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { useTasksQuery } from '@/hooks/tasks/useTasksQuery';
import { useMembersQuery } from '@/hooks/members/useMembersQuery';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/contexts/AuthContext';
import { useClients } from '@/hooks/clients/useClients';
import { useTaskQuickActions } from '@/hooks/tasks/useTaskQuickActions';
import { useTaskPriorityOrder } from '@/hooks/tasks/useTaskPriorityOrder';
import { useSubtaskQuickEdit } from '@/hooks/tasks/useSubtaskQuickEdit';
import { CalendarView } from '@/views/calendar';
import TimelineView from '@/views/timeline';
import { ListView } from '@/views/list';
import { useTaskFilters } from './hooks/useTaskFilters';
import { FilterBar } from './components/FilterBar';
import { StepsLegend } from './components/StepsLegend';
import { TasksFilters, type FiltersState } from './components/TasksFilters';
import { TaskTable } from './components/TaskTable';
import type { PlanningViewProps } from '@/types/props';
import { useUIStore } from '@/store/useUIStore';
import { ViewState } from '@/components/ViewState';
import { CalendarX2, DatabaseZap, FilterX, Search, Plus } from 'lucide-react';
import { Skeleton } from 'boneyard-js/react';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

const PLANNING_BONES = {
  name: 'planning-view',
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

const EMPTY_FILTERS: FiltersState = {
  searchTerm: '',
  selectedSteps: [],
  selectedMemberIds: [],
  selectedPeriod: '',
  showOnlyBlocked: false,
  showConcluded: false,
};

const VIEW_TITLES: Record<string, { title: string; description: string }> = {
  calendar: { title: 'Calendário', description: 'Visualize as demandas em calendário mensal.' },
  timeline: { title: 'Linha do Tempo', description: 'Acompanhe as fases das demandas em Gantt.' },
  list: { title: 'Lista', description: 'Todas as demandas em formato de tabela.' },
  demandas: { title: 'Demandas', description: 'Visualize todas as demandas por etapa atual.' },
};

const DEMAND_TABS = [
  { value: 'demandas', label: 'Todas as Demandas' },
  { value: 'calendar', label: 'Calendário' },
  { value: 'timeline', label: 'Linha do Tempo' },
] as const;

const PlanningView: React.FC<PlanningViewProps> = ({ subview, onViewChange, onEdit, onDelete, onUpdateTask, onOpenNew, onExport, holidays }) => {
  const { isAdmin, member } = useAuthContext();
  const { effectiveClientId } = useClients();
  const queryClient = useQueryClient();
  const dashboardRedirect = useUIStore((s) => s.dashboardRedirect);
  const clearDashboardRedirect = useUIStore((s) => s.clearDashboardRedirect);
  const { data: tasks = [], isLoading: tasksLoading, error: tasksErr } = useTasksQuery(effectiveClientId, isAdmin);
  const { data: members = [], isLoading: membersLoading, error: membersErr } = useMembersQuery(effectiveClientId);
  const tasksError = tasksErr?.message ?? null;
  const membersError = membersErr?.message ?? null;

  const { concludeTask, toggleBlock, concludeTasks, blockTasks } = useTaskQuickActions(member?.auth_user_id);
  const updateTaskPriorityOrder = useTaskPriorityOrder({
    clientId: effectiveClientId,
    isAdmin,
  });
  const { updateSubtaskAssignees, updateSubtaskDates } = useSubtaskQuickEdit({
    clientId: effectiveClientId,
    isAdmin,
  });

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

  const [demandasFilters, setDemandasFilters] = useState<FiltersState>(EMPTY_FILTERS);

  const handleBulkAssign = useCallback(async (selectedTasks: typeof tasks, memberId: string) => {
    const tasksWithActiveSubtask = selectedTasks
      .map(task => ({ task, subtask: task.subtasks.find(subtask => subtask.active) ?? task.subtasks[0] }))
      .filter(({ subtask }) => !!subtask);

    if (tasksWithActiveSubtask.length === 0) {
      toast.info('As demandas selecionadas não têm etapas para atribuir');
      return false;
    }

    for (const { task, subtask } of tasksWithActiveSubtask) {
      const nextAssignees = subtask.assignees.includes(memberId)
        ? subtask.assignees
        : [...subtask.assignees, memberId];
      const success = await updateSubtaskAssignees(task, subtask.id, nextAssignees);
      if (!success) return false;
    }

    toast.success(`${tasksWithActiveSubtask.length} demanda${tasksWithActiveSubtask.length !== 1 ? 's' : ''} atribuída${tasksWithActiveSubtask.length !== 1 ? 's' : ''}`);
    return true;
  }, [updateSubtaskAssignees]);

  useEffect(() => {
    if (!dashboardRedirect) return;
    clearDashboardRedirect();
  }, [dashboardRedirect, clearDashboardRedirect]);

  const hasData = tasks.length > 0 || members.length > 0;
  const isLoading = tasksLoading || membersLoading;
  const errorMessage = tasksError || membersError;

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['members'] });
  };

  const filteredDemandasTasks = useMemo(() => {
    if (subview !== 'demandas') return [];
    const { searchTerm, selectedSteps, selectedMemberIds, showOnlyBlocked, selectedPeriod, showConcluded } = demandasFilters;
    return tasks.filter(task => {
      const isConcluded = !!task.concludedAt;
      if (!showConcluded && isConcluded) return false;

      const matchSearch =
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.id.toLowerCase().includes(searchTerm.toLowerCase());

      const currentStep = task.subtasks.find(s => s.active) ?? task.subtasks[0];
      const matchStep = selectedSteps.length > 0 ? selectedSteps.includes(currentStep?.status) : true;
      const matchMember = selectedMemberIds.length > 0
        ? task.subtasks.some(s => s.assignees.some(a => selectedMemberIds.includes(a)))
        : true;
      const matchBlocked = showOnlyBlocked ? task.status.blocked : true;

      let matchPeriod = true;
      if (selectedPeriod && currentStep?.end) {
        const due = new Date(currentStep.end + 'T00:00:00');
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() + parseInt(selectedPeriod));
        matchPeriod = due <= cutoff;
      } else if (selectedPeriod && !currentStep?.end) {
        matchPeriod = false;
      }

      return matchSearch && matchStep && matchMember && matchBlocked && matchPeriod;
    });
  }, [tasks, demandasFilters, subview]);

const hasDemandasActiveFilters =
    demandasFilters.searchTerm !== '' ||
    demandasFilters.selectedSteps.length > 0 ||
    demandasFilters.selectedMemberIds.length > 0 ||
    demandasFilters.selectedPeriod !== '' ||
    demandasFilters.showOnlyBlocked;

  if (errorMessage && !hasData) {
    return (
      <ViewState
        icon={DatabaseZap}
        title="Erro ao carregar planejamento"
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

  const { title, description } = VIEW_TITLES[subview] ?? VIEW_TITLES.calendar;

  const showFilterBar = subview === 'calendar' || subview === 'timeline';

  const content = (
    <div className="space-y-5">
      <Tabs value={subview} onValueChange={(v) => onViewChange(v)}>
        <TabsList variant="underline" className="w-full justify-end gap-0">
          {DEMAND_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} variant="underline">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div>
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>

      {showFilterBar && (
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

      {showFilterBar && filteredTasks.length === 0 ? (
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
      ) : subview === 'demandas' ? (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-2">
            <TasksFilters
              filters={demandasFilters}
              members={members}
              onChange={next => setDemandasFilters(prev => ({ ...prev, ...next }))}
              onClear={() => setDemandasFilters(EMPTY_FILTERS)}
            />
            <Button onClick={onOpenNew} className="shrink-0">
              <Plus className="w-4 h-4" />
              Nova Demanda
            </Button>
          </div>

          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border border-dashed border-border rounded-xl bg-muted/10">
              <Search className="w-8 h-8 mb-3 text-muted-foreground/50" />
              <p className="text-sm">Nenhuma demanda cadastrada ainda.</p>
              <button onClick={onOpenNew} className="mt-3 text-xs text-primary hover:underline">
                Criar primeira demanda
              </button>
            </div>
          ) : filteredDemandasTasks.length === 0 && hasDemandasActiveFilters ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <p className="text-sm">Nenhuma demanda encontrada com os filtros atuais.</p>
              <button
                onClick={() => setDemandasFilters(EMPTY_FILTERS)}
                className="mt-2 text-xs text-primary hover:underline"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <TaskTable
              tasks={filteredDemandasTasks}
              members={members}
              onToggleBlock={toggleBlock}
              onConclude={concludeTask}
              onEdit={onEdit}
              onReorder={!hasDemandasActiveFilters ? updateTaskPriorityOrder : undefined}
              onBulkAssign={handleBulkAssign}
              onBulkBlock={blockTasks}
              onBulkConclude={concludeTasks}
              onUpdateSubtaskAssignees={updateSubtaskAssignees}
              onUpdateSubtaskDates={updateSubtaskDates}
            />
          )}
        </div>
      ) : null}

      {subview !== 'demandas' && <StepsLegend />}
    </div>
  );

  return (
    <Skeleton loading={isLoading} initialBones={PLANNING_BONES} animate="shimmer">
      {content}
    </Skeleton>
  );
};

export default PlanningView;
