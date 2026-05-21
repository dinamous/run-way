import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { KanbanView } from '@/views/kanban';
import { useTaskFilters } from './hooks/useTaskFilters';
import { PlanningViewHeader } from './components/PlanningViewHeader';
import { StepsLegend } from './components/StepsLegend';
import { type FiltersState } from './components/TasksFilters';
import { TaskTable } from './components/TaskTable';
import type { PlanningViewProps } from '@/types/props';
import { useUIStore } from '@/store/useUIStore';
import { ViewState } from '@/components/ViewState';
import { CalendarX2, DatabaseZap, FilterX, Search } from 'lucide-react';
import { Skeleton } from 'boneyard-js/react';
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
  selectedProgressStatuses: [],
  selectedMemberIds: [],
  selectedPeriod: '',
  dateFrom: '',
  dateTo: '',
  showOnlyBlocked: false,
  showConcluded: false,
  sortField: 'priority',
  sortDirection: 'asc',
  groupBy: 'none',
};


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
  const { updateSubtaskAssignees, updateSubtaskDates, updateSubtaskProgressStatus } = useSubtaskQuickEdit({
    clientId: effectiveClientId,
    isAdmin,
  });

  const { clearFilters, filteredTasks: allFilteredTasks } = useTaskFilters(tasks ?? [], subview === 'timeline', dashboardRedirect?.assigneeId ?? '');

  const [demandasFilters, setDemandasFilters] = useState<FiltersState>(EMPTY_FILTERS);
  const [calendarFilters, setCalendarFilters] = useState<FiltersState>(EMPTY_FILTERS);

  const filteredTasks = useMemo(() => {
    if (subview !== 'calendar' && subview !== 'timeline') return allFilteredTasks;
    const { searchTerm, selectedSteps, selectedProgressStatuses, selectedMemberIds, showOnlyBlocked, selectedPeriod, showConcluded } = calendarFilters;
    return allFilteredTasks.filter(task => {
      const isConcluded = !!task.concludedAt;
      if (!showConcluded && isConcluded) return false;
      const lowerSearch = searchTerm.toLowerCase();
      if (lowerSearch && !(
        task.title.toLowerCase().includes(lowerSearch) ||
        task.id.toLowerCase().includes(lowerSearch) ||
        task.subtasks.some(s => s.title.toLowerCase().includes(lowerSearch))
      )) return false;
      if (selectedSteps.length > 0 && !task.subtasks.some(s => selectedSteps.includes(s.status))) return false;
      if (selectedProgressStatuses.length > 0 && !task.subtasks.some(s => selectedProgressStatuses.includes(s.progressStatus))) return false;
      if (selectedMemberIds.length > 0 && !task.subtasks.some(s => s.assignees.some(a => selectedMemberIds.includes(a)))) return false;
      if (showOnlyBlocked && !task.status.blocked) return false;
      if (selectedPeriod) {
        const currentStep = task.subtasks.find(s => s.active) ?? task.subtasks[0];
        if (!currentStep?.end) return false;
        const due = new Date(currentStep.end + 'T00:00:00');
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() + parseInt(selectedPeriod));
        if (due > cutoff) return false;
      }
      return true;
    });
  }, [allFilteredTasks, calendarFilters, subview]);

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
    const { searchTerm, selectedSteps, selectedProgressStatuses, selectedMemberIds, showOnlyBlocked, selectedPeriod, showConcluded } = demandasFilters;
    return tasks.filter(task => {
      const isConcluded = !!task.concludedAt;
      if (!showConcluded && isConcluded) return false;

      const lowerSearch = searchTerm.toLowerCase();
      const matchSearch =
        task.title.toLowerCase().includes(lowerSearch) ||
        task.id.toLowerCase().includes(lowerSearch) ||
        task.subtasks.some(s => s.title.toLowerCase().includes(lowerSearch));

      const currentStep = task.subtasks.find(s => s.active) ?? task.subtasks[0];
      const matchStep = selectedSteps.length > 0
        ? task.subtasks.some(s => selectedSteps.includes(s.status))
        : true;
      const matchProgressStatus = selectedProgressStatuses.length > 0
        ? task.subtasks.some(s => selectedProgressStatuses.includes(s.progressStatus))
        : true;
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

      return matchSearch && matchStep && matchProgressStatus && matchMember && matchBlocked && matchPeriod;
    });
  }, [tasks, demandasFilters, subview]);

const hasDemandasActiveFilters =
    demandasFilters.searchTerm !== '' ||
    demandasFilters.selectedSteps.length > 0 ||
    demandasFilters.selectedProgressStatuses.length > 0 ||
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

  const showFilterBar = subview === 'calendar' || subview === 'timeline' || subview === 'kanban';

  const contentRef = useRef<HTMLDivElement>(null);
  const prevSubview = useRef(subview);

  useEffect(() => {
    if (prevSubview.current === subview) return;
    prevSubview.current = subview;

    if (!('startViewTransition' in document)) return;
    const el = contentRef.current;
    if (!el) return;
    el.style.viewTransitionName = 'planning-content';
    document.startViewTransition(() => {
      el.style.viewTransitionName = '';
    });
  }, [subview]);

  const subviewContent = showFilterBar && filteredTasks.length === 0 ? (
    <ViewState
      icon={FilterX}
      title="Nenhuma demanda com os filtros atuais"
      description="Limpe os filtros para voltar a ver as demandas deste cliente."
      actionLabel="Limpar filtros"
      onAction={clearFilters}
    />
  ) : subview === 'calendar' ? (
    <CalendarView tasks={filteredTasks} onEdit={onEdit} onUpdateTask={onUpdateTask} holidays={holidays} />
  ) : subview === 'timeline' ? (
    <TimelineView tasks={filteredTasks} members={members} onEdit={onEdit} onDelete={onDelete} onUpdateTask={onUpdateTask} holidays={holidays} />
  ) : subview === 'kanban' ? (
    <KanbanView tasks={filteredTasks} members={members} onEdit={onEdit} onUpdateTask={onUpdateTask} />
  ) : subview === 'list' ? (
    <ListView onEdit={onEdit} onDelete={(task) => onDelete(task.id)} onOpenNew={onOpenNew} onExport={onExport} />
  ) : subview === 'demandas' ? (
    <div className="space-y-5">
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
          onUpdateSubtaskProgressStatus={updateSubtaskProgressStatus}
        />
      )}
    </div>
  ) : null;

  const content = (
    <div className="space-y-5 p-4 md:p-6 lg:p-8">
      <PlanningViewHeader
        subview={subview}
        onViewChange={onViewChange}
        onOpenNew={onOpenNew}
        members={members ?? []}
        demandasFilters={demandasFilters}
        onChangeDemandasFilters={next => setDemandasFilters(prev => ({ ...prev, ...next }))}
        onClearDemandasFilters={() => setDemandasFilters(EMPTY_FILTERS)}
        calendarFilters={calendarFilters}
        onChangeCalendarFilters={next => setCalendarFilters(prev => ({ ...prev, ...next }))}
        onClearCalendarFilters={() => setCalendarFilters(EMPTY_FILTERS)}
      />

      <div ref={contentRef} className="space-y-5 pt-1">
        {subviewContent}
        {subview !== 'demandas' && subview !== 'calendar' && subview !== 'kanban' && <StepsLegend />}
      </div>
    </div>
  );

  return (
    <Skeleton loading={isLoading} initialBones={PLANNING_BONES} animate="shimmer">
      {content}
    </Skeleton>
  );
};

export default PlanningView;
