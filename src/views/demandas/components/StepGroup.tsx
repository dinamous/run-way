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
}

export function StepGroup({ stepType, tasks, members, onToggleBlock, onConclude, onEdit }: StepGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const meta = STEP_META[stepType];

  if (tasks.length === 0) return null;

  return (
    <div className="mb-6">
      <button
        className="flex items-center gap-2 mb-2 w-full text-left select-none group"
        onClick={() => setIsExpanded(prev => !prev)}
      >
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${meta.dot}`} />
        <span className="text-sm font-medium text-foreground">{meta.label}</span>
        <span className="text-sm text-muted-foreground font-normal">· {tasks.length}</span>
        <span className="ml-1 text-muted-foreground">
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </span>
      </button>

      {isExpanded && (
        <div className="space-y-1">
          {tasks.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              members={members}
              onToggleBlock={onToggleBlock}
              onConclude={onConclude}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
