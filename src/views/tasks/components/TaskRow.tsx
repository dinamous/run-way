import { memo } from 'react';
import { Link2, AlertCircle, Clock } from 'lucide-react';
import { STEP_META, type Task, type StepType } from '@/lib/steps';
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

export const TaskRow = memo(function TaskRow({ task, stepType, members, onToggleBlock, onConclude, onEdit }: TaskRowProps) {
  const isBlocked = task.status.blocked;
  const isConcluded = !!task.concludedAt;
  const meta = STEP_META[stepType];

  const currentStep = task.steps.find(s => s.type === stepType) ?? task.steps.find(s => s.active) ?? task.steps[0];
  const assigneeMembers = (currentStep?.assignees ?? [])
    .map(id => members.find(m => m.id === id))
    .filter((m): m is Member => m !== undefined);

  const timeStatus = formatDueDate(currentStep?.end);

  return (
    <div
      className={`group flex items-stretch gap-0 rounded-lg border overflow-hidden transition-all cursor-pointer
        ${isConcluded
          ? 'border-border/40 opacity-50 hover:opacity-70'
          : isBlocked
            ? 'border-red-300/70 dark:border-red-700/60 hover:border-red-400 dark:hover:border-red-600'
            : 'border-border/50 hover:border-border hover:shadow-sm'
        }`}
      onClick={() => onEdit(task)}
    >
      {/* Borda lateral colorida */}
      <div className={`w-1 shrink-0 ${isBlocked ? 'bg-red-500' : isConcluded ? 'bg-muted-foreground/30' : meta.handle}`} />

      {/* Conteúdo do card */}
      <div className={`flex flex-1 items-center gap-3 px-3 py-2.5 min-w-0
        ${isConcluded
          ? 'bg-muted/10'
          : isBlocked
            ? 'bg-red-50/50 dark:bg-red-950/20 group-hover:bg-red-50/80 dark:group-hover:bg-red-950/30'
            : 'bg-background group-hover:bg-muted/30'
        }`}
      >
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className={`text-sm font-medium truncate ${
            isBlocked
              ? 'line-through text-muted-foreground'
              : isConcluded
                ? 'text-muted-foreground/70'
                : 'text-foreground'
          }`}>
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
            <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800">
              <AlertCircle className="w-3 h-3" />
              Bloqueada
            </span>
          )}
          {isConcluded && (
            <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted/80 text-muted-foreground border border-border/60">
              Concluída
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {timeStatus && (
            <div className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${timeStatus.className}`}>
              <Clock className="w-3 h-3" />
              {timeStatus.label}
            </div>
          )}

          <div className="flex -space-x-1.5" title="Responsáveis pela etapa atual">
            {assigneeMembers.length === 0 ? (
              <div
                className="w-6 h-6 rounded-full border border-dashed border-muted-foreground/30 bg-muted/60 flex items-center justify-center text-[10px] text-muted-foreground/50"
                title="Sem responsável"
              >
                ?
              </div>
            ) : (
              assigneeMembers.slice(0, 3).map(m => (
                <div
                  key={m.id}
                  title={m.name}
                  className="w-6 h-6 rounded-full ring-2 ring-background bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center overflow-hidden"
                >
                  {m.avatar_url
                    ? <img src={m.avatar_url} alt={m.name} className="w-full h-full object-cover" />
                    : m.name.slice(0, 2).toUpperCase()
                  }
                </div>
              ))
            )}
            {assigneeMembers.length > 3 && (
              <div className="w-6 h-6 rounded-full ring-2 ring-background bg-muted text-foreground text-[10px] font-bold flex items-center justify-center">
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
    </div>
  );
}, (prev, next) =>
  prev.task.id === next.task.id &&
  prev.task.status?.blocked === next.task.status?.blocked &&
  prev.task.concludedAt === next.task.concludedAt &&
  prev.stepType === next.stepType &&
  prev.members.length === next.members.length
);
