import { Link2, AlertCircle, Clock } from 'lucide-react';
import type { Task, StepType } from '@/lib/steps';
import type { Member } from '@/hooks/useSupabase';
import { formatDueDate } from '../utils';
import { ActionMenu } from './ActionMenu';

interface TaskRowProps {
  task: Task;
  stepType: StepType;
  members: Member[];
  onToggleBlock: (task: Task) => void;
  onConclude: (task: Task) => void;
  onEdit: (task: Task) => void;
}

export function TaskRow({ task, stepType, members, onToggleBlock, onConclude, onEdit }: TaskRowProps) {
  const isBlocked = task.status.blocked;
  const isConcluded = !!task.concludedAt;

  const currentStep = task.steps.find(s => s.type === stepType) ?? task.steps.find(s => s.active) ?? task.steps[0];
  const assigneeMembers = (currentStep?.assignees ?? [])
    .map(id => members.find(m => m.id === id))
    .filter((m): m is Member => m !== undefined);

  const timeStatus = formatDueDate(currentStep?.end);

  return (
    <div
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors cursor-pointer
        ${isConcluded
          ? 'bg-muted/20 border-border/50 opacity-55'
          : isBlocked
            ? 'bg-red-50/40 border-red-200/60 dark:bg-red-950/20 dark:border-red-800/40 hover:border-red-300 dark:hover:border-red-700'
            : 'bg-card border-border/60 hover:border-border hover:bg-muted/20'
        }`}
      onClick={() => onEdit(task)}
    >
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className={`text-sm font-medium truncate ${isBlocked ? 'line-through text-muted-foreground' : isConcluded ? 'text-muted-foreground' : 'text-foreground'}`}>
          {task.title}
        </span>
        {task.clickupLink && (
          <a
            href={task.clickupLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            title="Abrir no ClickUp"
            className="text-muted-foreground hover:text-primary transition-colors shrink-0"
          >
            <Link2 className="w-3.5 h-3.5" />
          </a>
        )}
        {isBlocked && (
          <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700 border border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-700">
            <AlertCircle className="w-3 h-3" />
            Bloqueada
          </span>
        )}
        {isConcluded && (
          <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border">
            Concluída
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {timeStatus && (
          <div className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${timeStatus.className}`}>
            <Clock className="w-3 h-3" />
            {timeStatus.label}
          </div>
        )}

        <div className="flex -space-x-1.5" title="Responsáveis pela etapa atual">
          {assigneeMembers.length === 0 ? (
            <div
              className="w-6 h-6 rounded-full border border-dashed border-muted-foreground/40 bg-muted flex items-center justify-center text-[10px] text-muted-foreground/60"
              title="Sem responsável"
            >
              ?
            </div>
          ) : (
            assigneeMembers.slice(0, 3).map(m => (
              <div
                key={m.id}
                title={m.name}
                className="w-6 h-6 rounded-full ring-2 ring-card bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center overflow-hidden"
              >
                {m.avatar_url
                  ? <img src={m.avatar_url} alt={m.name} className="w-full h-full object-cover" />
                  : m.name.slice(0, 2).toUpperCase()
                }
              </div>
            ))
          )}
          {assigneeMembers.length > 3 && (
            <div className="w-6 h-6 rounded-full ring-2 ring-card bg-muted-foreground/20 text-foreground text-[10px] font-bold flex items-center justify-center">
              +{assigneeMembers.length - 3}
            </div>
          )}
        </div>

        <div onClick={e => e.stopPropagation()}>
          <ActionMenu
            task={task}
            onToggleBlock={onToggleBlock}
            onConclude={onConclude}
            onEdit={onEdit}
          />
        </div>
      </div>
    </div>
  );
}
