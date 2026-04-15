import { useMemo } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useTaskStore } from '@/store/useTaskStore';
import { useMemberStore } from '@/store/useMemberStore';
import { useClients } from '@/hooks/useClients';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { STEP_META, type Task, type StepType } from '@/lib/steps';
import type { Member } from '@/hooks/useSupabase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Search, Calendar, ExternalLink, Lock, Unlock, Check, Users, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';

function formatDate(isoDate: string): string {
  const d = new Date(isoDate.length === 10 ? isoDate + 'T00:00:00' : isoDate);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

interface StepGroupProps {
  stepType: StepType;
  tasks: Task[];
  members: Member[];
  onToggleBlock: (task: Task) => void;
  onConclude: (task: Task) => void;
  onEdit: (task: Task) => void;
}

function StepGroup({ stepType, tasks, members, onToggleBlock, onConclude, onEdit }: StepGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const meta = STEP_META[stepType];

  if (tasks.length === 0) return null;

  return (
    <div className="mb-6">
      <div 
        className="flex items-center gap-2 mb-3 cursor-pointer select-none group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={`w-3 h-3 rounded-full ${meta.dot}`} />
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          {meta.label}
          <span className="text-muted-foreground font-normal">- {tasks.length}</span>
        </h3>
      </div>
      
      {isExpanded && (
        <div className="space-y-1">
          {tasks.map(task => {
            const allAssigneeIds = [...new Set(task.steps.flatMap(s => s.assignees))];
            const assigneeMembers = allAssigneeIds
              .map(id => members.find(m => m.id === id))
              .filter((m): m is Member => m !== undefined);
            const isBlocked = task.status.blocked;
            const isConcluded = !!task.concludedAt;
            const currentStep = task.steps[0];

            return (
              <div 
                key={task.id}
                className={`flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border ${isConcluded ? 'bg-gray-100 dark:bg-gray-800/50 opacity-60' : 'bg-card'}`}
              >
                <button
                  onClick={() => onEdit(task)}
                  className="flex-1 text-left min-w-0"
                >
                  <div className="font-medium text-foreground truncate">{task.title}</div>
                  {task.clickupLink && (
                    <a
                      href={task.clickupLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5"
                    >
                      <ExternalLink className="w-3 h-3" /> Link externo
                    </a>
                  )}
                </button>

                <div className="flex items-center gap-4 text-sm text-muted-foreground min-w-0">
                  {currentStep?.start && currentStep?.end && (
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <Calendar className="w-4 h-4 text-muted-foreground/70" />
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Período</span>
                        <span className="text-sm font-medium text-foreground">
                          {formatDate(currentStep.start)} - {formatDate(currentStep.end)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <Users className="w-4 h-4 text-muted-foreground/70" />
                    <div className="flex -space-x-2">
                      {assigneeMembers.slice(0, 3).map(m => (
                        <div
                          key={m.id}
                          title={m.name}
                          className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] font-semibold flex items-center justify-center ring-2 ring-card"
                        >
                          {m.avatar_url ? (
                            <img src={m.avatar_url} alt={m.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            m.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                      ))}
                      {assigneeMembers.length > 3 && (
                        <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold flex items-center justify-center ring-2 ring-card">
                          +{assigneeMembers.length - 3}
                        </div>
                      )}
                    </div>
                    {assigneeMembers.length === 0 && (
                      <span className="text-xs">Sem responsáveis</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {!isConcluded && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => onConclude(task)}
                        title="Concluir"
                        className="text-muted-foreground hover:text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => onToggleBlock(task)}
                      title={isBlocked ? 'Desbloquear' : 'Bloquear'}
                      className={isBlocked ? 'text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900' : 'text-muted-foreground hover:text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900'}
                    >
                      {isBlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface DemandasViewProps {
  onEdit: (task: Task) => void;
  onOpenNew: () => void;
}

export default function DemandasView({ onEdit, onOpenNew }: DemandasViewProps) {
  const { member } = useAuthContext();
  const { tasks, fetchTasks, invalidate } = useTaskStore();
  const { members, fetchMembers } = useMemberStore();
  const { effectiveClientId, isAdmin } = useClients();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStep, setSelectedStep] = useState<StepType | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  useEffect(() => {
    fetchTasks(effectiveClientId, isAdmin);
    fetchMembers(effectiveClientId);
  }, [effectiveClientId, isAdmin, fetchTasks, fetchMembers]);

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

    if (error) {
      toast.error('Erro ao alterar bloqueio');
      return;
    }

    toast.success(newBlocked ? `"${task.title}" bloqueada` : `"${task.title}" desbloqueada`);
    invalidate();
    await fetchTasks(effectiveClientId, isAdmin);
  };

  const handleConclude = async (task: Task) => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('tasks')
      .update({
        concluded_at: now,
        concluded_by: member?.auth_user_id ?? null,
      })
      .eq('id', task.id);

    if (error) {
      toast.error('Erro ao concluir demanda');
      return;
    }

    toast.success(`"${task.title}" concluída`);
    invalidate();
    await fetchTasks(effectiveClientId, isAdmin);
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          task.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStep = selectedStep ? task.steps[0]?.type === selectedStep : true;
      const matchStatus = selectedStatus === '' ? true : 
        selectedStatus === 'bloqueado' ? task.status.blocked : 
        !task.status.blocked;
      return matchSearch && matchStep && matchStatus;
    });
  }, [tasks, searchTerm, selectedStep, selectedStatus]);

  const groupedTasks = useMemo(() => {
    const groups = new Map<StepType, Task[]>();
    const orderedSteps: StepType[] = ['analise-ux', 'analise-dev', 'design', 'aprovacao-design', 'desenvolvimento', 'homologacao', 'qa', 'publicacao'];

    orderedSteps.forEach(step => groups.set(step, []));

    filteredTasks.forEach(task => {
      const stepType = task.steps[0]?.type || 'desenvolvimento';
      if (!groups.has(stepType)) {
        groups.set(stepType, []);
      }
      groups.get(stepType)!.push(task);
    });

    return groups;
  }, [filteredTasks]);

  const hasActiveFilters = searchTerm !== '' || selectedStep !== '' || selectedStatus !== '';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Demandas</h2>
          <p className="text-sm text-muted-foreground">
            Visualize todas as demandas por etapa atual
          </p>
        </div>
        <Button onClick={onOpenNew}>
          <Plus className="w-4 h-4" />
          Nova Demanda
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            type="text" 
            placeholder="Pesquisar demanda ou ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <select
          value={selectedStep}
          onChange={(e) => setSelectedStep(e.target.value as StepType || '')}
          className="w-full sm:w-[180px] text-sm rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Todas as etapas</option>
          {(['analise-ux', 'analise-dev', 'design', 'aprovacao-design', 'desenvolvimento', 'homologacao', 'qa', 'publicacao'] as StepType[]).map(step => (
            <option key={step} value={step}>
              {STEP_META[step].label}
            </option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="w-full sm:w-[150px] text-sm rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Todos os status</option>
          <option value="bloqueado">Bloqueado</option>
          <option value="andamento">Em andamento</option>
        </select>

        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            onClick={() => {
              setSearchTerm('');
              setSelectedStep('');
              setSelectedStatus('');
            }}
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {filteredTasks.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Nenhuma demanda encontrada com os filtros selecionados.
        </p>
      ) : (
        <div className="space-y-6">
          {([...groupedTasks.entries()].filter(([_, tasks]) => tasks.length > 0) as [StepType, Task[]][]).map(([stepType, stepTasks]) => (
            <StepGroup
              key={stepType}
              stepType={stepType}
              tasks={stepTasks}
              members={members}
              onToggleBlock={handleToggleBlock}
              onConclude={handleConclude}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
