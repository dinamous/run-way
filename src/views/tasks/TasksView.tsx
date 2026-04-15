import { useMemo, useState, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useTaskStore } from '@/store/useTaskStore';
import { useMemberStore } from '@/store/useMemberStore';
import { useClients } from '@/hooks/useClients';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { STEP_TYPES_ORDER, type Task, type StepType } from '@/lib/steps';
import { Button } from '@/components/ui/Button';
import { Search, Plus } from 'lucide-react';
import { TasksFilters, type FiltersState } from './components/TasksFilters';
import { StepGroup } from './components/StepGroup';

const EMPTY_FILTERS: FiltersState = {
  searchTerm: '',
  selectedStep: '',
  selectedMemberId: '',
  selectedPeriod: '',
  showOnlyBlocked: false,
};

interface TasksViewProps {
  onEdit: (task: Task) => void;
  onOpenNew: () => void;
}

export default function TasksView({ onEdit, onOpenNew }: TasksViewProps) {
  const { member } = useAuthContext();
  const { tasks, fetchTasks, invalidate } = useTaskStore();
  const { members, fetchMembers } = useMemberStore();
  const { effectiveClientId, isAdmin } = useClients();

  const [filters, setFilters] = useState<FiltersState>(EMPTY_FILTERS);

  useEffect(() => {
    fetchTasks(effectiveClientId, isAdmin);
    fetchMembers(effectiveClientId);
  }, [effectiveClientId, isAdmin, fetchTasks, fetchMembers]);

  const handleToggleBlock = async (task: Task) => {
    const newBlocked = !task.status.blocked;
    const now = new Date().toISOString().split('T')[0];
    const { error } = await supabase
      .from('tasks')
      .update({ blocked: newBlocked, blocked_at: newBlocked ? now : null })
      .eq('id', task.id);

    if (error) { toast.error('Erro ao alterar bloqueio'); return; }
    toast.success(newBlocked ? `"${task.title}" bloqueada` : `"${task.title}" desbloqueada`);
    invalidate();
    await fetchTasks(effectiveClientId, isAdmin);
  };

  const handleConclude = async (task: Task) => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('tasks')
      .update({ concluded_at: now, concluded_by: member?.auth_user_id ?? null })
      .eq('id', task.id);

    if (error) { toast.error('Erro ao concluir demanda'); return; }
    toast.success(`"${task.title}" concluída`);
    invalidate();
    await fetchTasks(effectiveClientId, isAdmin);
  };

  const filteredTasks = useMemo(() => {
    const { searchTerm, selectedStep, selectedMemberId, showOnlyBlocked, selectedPeriod } = filters;
    return tasks.filter(task => {
      const matchSearch =
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.id.toLowerCase().includes(searchTerm.toLowerCase());

      const currentStep = task.steps.find(s => s.active) ?? task.steps[0];
      const matchStep = selectedStep ? currentStep?.type === selectedStep : true;
      const matchMember = selectedMemberId
        ? task.steps.some(s => s.assignees.includes(selectedMemberId))
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
  }, [tasks, filters]);

  const groupedTasks = useMemo(() => {
    const groups = new Map<StepType, Task[]>();
    STEP_TYPES_ORDER.forEach(step => groups.set(step, []));
    filteredTasks.forEach(task => {
      const activeSteps = task.steps.filter(s => s.active);
      const stepsToUse = activeSteps.length > 0 ? activeSteps : task.steps.slice(0, 1);
      stepsToUse.forEach(step => {
        const bucket = groups.get(step.type);
        if (bucket) bucket.push(task);
      });
    });

    // Ordena cada grupo pelo end do step correspondente: mais atrasada primeiro, sem data por último
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
  }, [filteredTasks]);

  const hasActiveFilters = Object.entries(filters).some(([, v]) => v !== '' && v !== false);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Demandas</h2>
          <p className="text-sm text-muted-foreground">Visualize todas as demandas por etapa atual</p>
        </div>
        <Button onClick={onOpenNew}>
          <Plus className="w-4 h-4" />
          Nova Demanda
        </Button>
      </div>

      <TasksFilters
        filters={filters}
        members={members}
        onChange={next => setFilters(prev => ({ ...prev, ...next }))}
        onClear={() => setFilters(EMPTY_FILTERS)}
      />

      {/* Content */}
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border border-dashed border-border rounded-xl bg-muted/10">
          <Search className="w-8 h-8 mb-3 text-muted-foreground/50" />
          <p className="text-sm">Nenhuma demanda cadastrada ainda.</p>
          <button onClick={onOpenNew} className="mt-3 text-xs text-primary hover:underline">
            Criar primeira demanda
          </button>
        </div>
      ) : (
        <div className="space-y-2 pb-16">
          {([...groupedTasks.entries()] as [StepType, Task[]][])
            .map(([stepType, stepTasks]) => (
              <StepGroup
                key={stepType}
                stepType={stepType}
                tasks={stepTasks}
                members={members}
                onToggleBlock={handleToggleBlock}
                onConclude={handleConclude}
                onEdit={onEdit}
                hasActiveFilters={hasActiveFilters}
              />
            ))}
          {filteredTasks.length === 0 && hasActiveFilters && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <p className="text-sm">Nenhuma demanda encontrada com os filtros atuais.</p>
              <button
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="mt-2 text-xs text-primary hover:underline"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
