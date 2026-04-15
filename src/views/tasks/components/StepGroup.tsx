import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { STEP_META, type StepType, type Task } from '@/lib/steps';
import type { Member } from '@/hooks/useSupabase';
import { TaskRow } from './TaskRow';

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
    <div className="mb-4">
      <button
        className="flex items-center gap-2 mb-2 w-full text-left select-none"
        onClick={() => setIsExpanded(prev => !prev)}
        disabled={isEmpty}
      >
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isEmpty ? 'bg-muted-foreground/30' : meta.dot}`} />
        <span className={`text-sm font-semibold ${isEmpty ? 'text-muted-foreground/60' : 'text-foreground'}`}>
          {meta.label}
        </span>
        <span className={`text-xs font-normal px-1.5 py-0.5 rounded-full ${isEmpty ? 'text-muted-foreground/50 bg-muted/40' : 'text-muted-foreground bg-muted/60'}`}>
          {tasks.length}
        </span>
        {!isEmpty && (
          <span className="ml-0.5 text-muted-foreground">
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </span>
        )}
      </button>

      {!isEmpty && isExpanded && (
        <div className="space-y-1.5">
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

      {isEmpty && hasActiveFilters && (
        <div className="ml-5 py-2 text-xs text-muted-foreground/50 italic">
          Nenhuma demanda nesta etapa com os filtros atuais
        </div>
      )}
    </div>
  );
}
