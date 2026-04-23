import { useState } from 'react';
import { FixedSizeList as List, type ListChildComponentProps } from 'react-window';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { STEP_META, type StepType, type Task } from '@/lib/steps';
import type { Member } from '@/hooks/useSupabase';
import { TaskRow } from './TaskRow';

const TASK_ROW_HEIGHT = 52;
const VIRTUALIZE_THRESHOLD = 50;

interface StepGroupProps {
  stepType: StepType;
  tasks: Task[];
  members: Member[];
  onToggleBlock: (task: Task) => void;
  onConclude: (task: Task) => void;
  onEdit: (task: Task) => void;
  hasActiveFilters?: boolean;
}

export function StepGroup({ stepType, tasks, members, onToggleBlock, onConclude, onEdit, hasActiveFilters }: StepGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const meta = STEP_META[stepType];
  const isEmpty = tasks.length === 0;

  return (
    <div className={`rounded-xl border transition-colors ${isEmpty ? 'border-border/40 bg-muted/5' : 'border-border bg-card'}`}>
      {/* Header da categoria */}
      <button
        className="flex items-center gap-3 w-full text-left select-none px-4 py-3 disabled:cursor-default"
        onClick={() => setIsExpanded(prev => !prev)}
        disabled={isEmpty}
      >
        {/* Faixa colorida lateral */}
        <div className={`w-1 h-7 rounded-full shrink-0 ${isEmpty ? 'bg-muted-foreground/20' : meta.dot}`} />

        <span className={`text-sm font-semibold tracking-tight ${isEmpty ? 'text-muted-foreground/50' : 'text-foreground'}`}>
          {meta.label}
        </span>

        {/* Badge de contagem */}
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full leading-none ${
          isEmpty
            ? 'text-muted-foreground/40 bg-muted/40'
            : `${meta.tagBg} opacity-90`
        }`}>
          {tasks.length}
        </span>

        {/* Separador flex */}
        <div className="flex-1" />

        {!isEmpty && (
          <span className="text-muted-foreground">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </span>
        )}
      </button>

      {/* Separator entre header e lista */}
      {!isEmpty && isExpanded && (
        <div className="h-px bg-border/60 mx-4" />
      )}

      {/* Lista de tarefas */}
      {!isEmpty && isExpanded && (
        <div className="p-3">
          {tasks.length > VIRTUALIZE_THRESHOLD ? (
            <List
              height={Math.min(tasks.length * TASK_ROW_HEIGHT, 600)}
              itemCount={tasks.length}
              itemSize={TASK_ROW_HEIGHT}
              width="100%"
              itemData={{ tasks, stepType, members, onToggleBlock, onConclude, onEdit }}
            >
              {({ index, style, data }: ListChildComponentProps<{
                tasks: Task[];
                stepType: StepType;
                members: Member[];
                onToggleBlock: (task: Task) => void;
                onConclude: (task: Task) => void;
                onEdit: (task: Task) => void;
              }>) => (
                <div style={{ ...style, paddingBottom: 8 }}>
                  <TaskRow
                    task={data.tasks[index]}
                    stepType={data.stepType}
                    members={data.members}
                    onToggleBlock={data.onToggleBlock}
                    onConclude={data.onConclude}
                    onEdit={data.onEdit}
                  />
                </div>
              )}
            </List>
          ) : (
            <div className="space-y-2">
              {tasks.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  stepType={stepType}
                  members={members}
                  onToggleBlock={onToggleBlock}
                  onConclude={onConclude}
                  onEdit={onEdit}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {isEmpty && hasActiveFilters && (
        <div className="px-4 pb-3 text-xs text-muted-foreground/40 italic">
          Nenhuma demanda com os filtros atuais
        </div>
      )}
    </div>
  );
}
