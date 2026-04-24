import { useEffect, useMemo, useState } from 'react';
import { useUIStore } from '@/store/useUIStore';
import { useTasksQuery } from '@/hooks/useTasksQuery';
import { useMembersQuery } from '@/hooks/useMembersQuery';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/contexts/AuthContext';
import { useClients } from '@/hooks/useClients';
import { useTaskQuickActions } from '@/hooks/useTaskQuickActions';
import { CalendarView } from '@/views/calendar';
import TimelineView from '@/views/timeline';
import { ListView } from '@/views/list';
import { useTaskFilters } from './hooks/useTaskFilters';
import { FilterBar } from './components/FilterBar';
import { StepsLegend } from './components/StepsLegend';
import { TasksFilters, type FiltersState } from './components/TasksFilters';
import { StepGroup } from './components/StepGroup';
import type { PlanningViewProps } from '@/types/props';
import { ViewState } from '@/components/ViewState';
import { CalendarX2, DatabaseZap, FilterX, Search, Plus } from 'lucide-react';
import { Skeleton } from 'boneyard-js/react';
import { STEP_TYPES_ORDER, type StepType, type Task } from '@/lib/steps';
import { Button } from '@/components/ui/Button';

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
};

const VIEW_TITLES: Record<string, { title: string; description: string }> = {
  calendar: { title: 'Calendário', description: 'Visualize as demandas em calendário mensal.' },
  timeline: { title: 'Linha do Tempo', description: 'Acompanhe as fases das demandas em Gantt.' },
  list: { title: 'Lista', description: 'Todas as demandas em formato de tabela.' },
  demandas: { title: 'Demandas', description: 'Visualize todas as demandas por etapa atual.' },
};

const PlanningView: React.FC<PlanningViewProps> = ({ subview, onEdit, onDelete, onUpdateTask, onOpenNew, onExport, holidays }) => {
  const { isAdmin, member } = useAuthContext();
  const { effectiveClientId } = useClients();
  const queryClient = useQueryClient();
  const dashboardRedirect = useUIStore((s) => s.dashboardRedirect);
  const clearDashboardRedirect = useUIStore((s) => s.clearDashboardRedirect);
  const { data: tasks = [], isLoading: tasksLoading, error: tasksErr } = useTasksQuery(effectiveClientId, isAdmin);
  const { data: members = [], isLoading: membersLoading, error: membersErr } = useMembersQuery(effectiveClientId);
  const tasksError = tasksErr?.message ?? null;
  const membersError = membersErr?.message ?? null;

  const { concludeTask, toggleBlock } = useTaskQuickActions(member?.auth_user_id);

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
    const { searchTerm, selectedSteps, selectedMemberIds, showOnlyBlocked, selectedPeriod } = demandasFilters;
    return tasks.filter(task => {
      const matchSearch =
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.id.toLowerCase().includes(searchTerm.toLowerCase());

      const currentStep = task.steps.find(s => s.active) ?? task.steps[0];
      const matchStep = selectedSteps.length > 0 ? selectedSteps.includes(currentStep?.type) : true;
      const matchMember = selectedMemberIds.length > 0
        ? task.steps.some(s => s.assignees.some(a => selectedMemberIds.includes(a)))
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

  const groupedDemandasTasks = useMemo(() => {
    const { selectedMemberIds } = demandasFilters;
    const groups = new Map<StepType, Task[]>();
    STEP_TYPES_ORDER.forEach(step => groups.set(step, []));
    filteredDemandasTasks.forEach(task => {
      let stepsToUse = task.steps.filter(s => s.active);
      if (stepsToUse.length === 0) stepsToUse = task.steps.slice(0, 1);

      if (selectedMemberIds.length > 0) {
        const memberSteps = task.steps.filter(s =>
          s.assignees.some(a => selectedMemberIds.includes(a))
        );
        if (memberSteps.length > 0) stepsToUse = memberSteps;
      }

      stepsToUse.forEach(step => {
        const bucket = groups.get(step.type);
        if (bucket) bucket.push(task);
      });
    });

    groups.forEach((bucket, stepType) => {
      bucket.sort((a, b) => {
        const endA = a.steps.find(s => s.type === stepType)?.end;
        const endB = b.steps.find(s => s.type === stepType)?.end;
        if (!endA && !endB) return 0;
        if (!endA) return 1;
        if (!endB) return -1;
        return endA < endB ? -1 : endA > endB ? 1 : 0;
      });
    });

    return groups;
  }, [filteredDemandasTasks, demandasFilters]);

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
          <div className="flex items-center justify-between">
            <TasksFilters
              filters={demandasFilters}
              members={members}
              onChange={next => setDemandasFilters(prev => ({ ...prev, ...next }))}
              onClear={() => setDemandasFilters(EMPTY_FILTERS)}
            />
            <Button onClick={onOpenNew} className="ml-3 shrink-0">
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
          ) : (
            <div className="space-y-3 pb-16">
              {([...groupedDemandasTasks.entries()] as [StepType, Task[]][])
                .filter(([stepType]) =>
                  demandasFilters.selectedSteps.length === 0 || demandasFilters.selectedSteps.includes(stepType)
                )
                .map(([stepType, stepTasks]) => (
                  <StepGroup
                    key={stepType}
                    stepType={stepType}
                    tasks={stepTasks}
                    members={members}
                    onToggleBlock={toggleBlock}
                    onConclude={concludeTask}
                    onEdit={onEdit}
                    hasActiveFilters={hasDemandasActiveFilters}
                  />
                ))}
              {filteredDemandasTasks.length === 0 && hasDemandasActiveFilters && (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <p className="text-sm">Nenhuma demanda encontrada com os filtros atuais.</p>
                  <button
                    onClick={() => setDemandasFilters(EMPTY_FILTERS)}
                    className="mt-2 text-xs text-primary hover:underline"
                  >
                    Limpar filtros
                  </button>
                </div>
              )}
            </div>
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
