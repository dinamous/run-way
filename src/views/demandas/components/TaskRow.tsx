import { Link2, AlertCircle, Clock } from 'lucide-react';
import type { Task } from '@/lib/steps';
import type { Member } from '@/hooks/useSupabase';
import { formatDueDate } from '../utils';
import { ActionMenu } from './ActionMenu';

interface TaskRowProps {
  task: Task;
  members: Member[];
  onToggleBlock: (task: Task) => void;
  onConclude: (task: Task) => void;
  onEdit: (task: Task) => void;
}

export function TaskRow({ task, members, onToggleBlock, onConclude, onEdit }: TaskRowProps) {
  const isBlocked = task.status.blocked;
  const isConcluded = !!task.concludedAt;

  const currentStep = task.steps.find(s => s.active) ?? task.steps[0];
  const assigneeMembers = (currentStep?.assignees ?? [])
    .map(id => members.find(m => m.id === id))
    .filter((m): m is Member => m !== undefined);

  const timeStatus = formatDueDate(currentStep?.end);

  return (
    <div
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors
        ${isConcluded
          ? 'bg-muted/30 border-border opacity-60'
          : 'bg-card border-transparent hover:border-border hover:bg-muted/30'
        }`}
    >
      <button
        onClick={() => onEdit(task)}
        className="flex-1 text-left min-w-0 flex items-center gap-2"
      >
        <span className={`text-sm font-medium truncate ${isBlocked ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
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
          <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800">
            <AlertCircle className="w-3 h-3" />
            Bloqueada
          </span>
        )}
      </button>

      <div className="flex items-center gap-3 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
        {timeStatus && (
          <div className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${timeStatus.className}`}>
            <Clock className="w-3 h-3" />
            {timeStatus.label}
          </div>
        )}

        <div className="flex -space-x-1.5" title="Responsáveis pela etapa atual">
          {assigneeMembers.length === 0 ? (
            <div
              className="w-6 h-6 rounded-full border border-dashed border-border bg-muted flex items-center justify-center text-[10px] text-muted-foreground"
              title="Sem responsável"
            >
              ?
            </div>
          ) : (
            assigneeMembers.slice(0, 3).map(m => (
              <div
                key={m.id}
                title={m.name}
                className="w-6 h-6 rounded-full ring-2 ring-card bg-primary/20 text-primary text-[10px] font-semibold flex items-center justify-center overflow-hidden"
              >
                {m.avatar_url
                  ? <img src={m.avatar_url} alt={m.name} className="w-full h-full object-cover" />
                  : m.name.slice(0, 2).toUpperCase()
                }
              </div>
            ))
          )}
          {assigneeMembers.length > 3 && (
            <div className="w-6 h-6 rounded-full ring-2 ring-card bg-muted text-muted-foreground text-[10px] font-semibold flex items-center justify-center">
              +{assigneeMembers.length - 3}
            </div>
          )}
        </div>

        <ActionMenu
          task={task}
          onToggleBlock={onToggleBlock}
          onConclude={onConclude}
          onEdit={onEdit}
        />
      </div>
    </div>
  );
}
