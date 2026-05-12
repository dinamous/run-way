import { memo, useState } from 'react';
import { ChevronDown, ChevronRight, Link2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { STEP_META, type Task, type SubtaskStatus } from '@/lib/steps';
import type { Member } from '@/hooks/infra/useSupabase';
import { formatDueDate } from '../utils';
import { ActionMenu } from './ActionMenu';
import { MemberAvatars } from './MemberAvatars';
import { SubtaskRow } from './SubtaskRow';

interface TaskTableRowProps {
  task: Task;
  members: Member[];
  onToggleBlock: (task: Task) => void;
  onConclude: (task: Task) => void;
  onEdit: (task: Task) => void;
  defaultExpanded: boolean;
  onUpdateSubtaskAssignees?: (task: Task, subtaskId: string, assignees: string[]) => Promise<boolean>;
  onUpdateSubtaskDates?: (task: Task, subtaskId: string, start: string, end: string) => Promise<boolean>;
}

export const TaskTableRow = memo(function TaskTableRow({
  task,
  members,
  onToggleBlock,
  onConclude,
  onEdit,
  defaultExpanded,
  onUpdateSubtaskAssignees,
  onUpdateSubtaskDates,
}: TaskTableRowProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const isBlocked = task.status.blocked;
  const isConcluded = !!task.concludedAt;

  const activeSubtask = task.subtasks.find(s => s.active);
  const allAssigneeIds = [...new Set(task.subtasks.flatMap(s => s.assignees))];
  const taskTimeStatus = formatDueDate(activeSubtask?.end);
  const completedCount = task.subtasks.filter(s => !s.active && s.end).length;
  const progress = task.subtasks.length > 0
    ? isConcluded ? 100 : Math.round((completedCount / task.subtasks.length) * 100)
    : 0;

  return (
    <div
      className={`rounded-xl border overflow-hidden transition-colors
        ${isConcluded
          ? 'border-border/30 bg-muted/5'
          : isBlocked
            ? 'border-red-300/70 dark:border-red-700/50'
            : 'border-border/60 bg-card'
        }`}
    >
      <div
        className={`flex items-center gap-0 cursor-pointer transition-colors group/row
          ${isConcluded
            ? 'bg-muted/10 hover:bg-muted/20'
            : isBlocked
              ? 'bg-red-50/50 dark:bg-red-950/20 hover:bg-red-50/80 dark:hover:bg-red-950/30'
              : 'bg-background hover:bg-muted/30'
          }`}
        onClick={() => task.subtasks.length > 0 && setExpanded(e => !e)}
      >
        <div className={`w-1 self-stretch shrink-0 ${
          isBlocked ? 'bg-red-500' : isConcluded ? 'bg-muted-foreground/25' : activeSubtask ? STEP_META[activeSubtask.status as SubtaskStatus].handle : 'bg-muted-foreground/30'
        }`} />

        <button
          className="px-2 py-3 text-muted-foreground/60 hover:text-muted-foreground shrink-0"
          onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
          tabIndex={-1}
        >
          {task.subtasks.length > 0
            ? expanded
              ? <ChevronDown className="w-3.5 h-3.5" />
              : <ChevronRight className="w-3.5 h-3.5" />
            : <span className="w-3.5 h-3.5 block" />
          }
        </button>

        <div
          className="flex-1 min-w-0 flex items-center gap-2 py-2.5 pr-2"
          onClick={e => { e.stopPropagation(); onEdit(task); }}
        >
          <span className={`text-sm font-semibold truncate ${
            isBlocked
              ? 'line-through text-muted-foreground'
              : isConcluded
                ? 'text-muted-foreground/70 line-through'
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
            <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted/80 text-muted-foreground border border-border/60">
              <CheckCircle2 className="w-3 h-3" />
              Concluída
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 pr-2 shrink-0">
          {task.subtasks.length > 0 && (
            <div className="hidden md:flex items-center gap-2 w-[100px]">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground/60 tabular-nums w-7 text-right">{progress}%</span>
            </div>
          )}

          {task.subtasks.length > 0 && (
            <span className="text-[10px] text-muted-foreground/50 tabular-nums hidden sm:block whitespace-nowrap">
              {task.subtasks.length} etapa{task.subtasks.length !== 1 ? 's' : ''}
            </span>
          )}

          {taskTimeStatus && !isConcluded && (
            <span className={`hidden sm:block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${taskTimeStatus.className}`}>
              {taskTimeStatus.label}
            </span>
          )}

          <MemberAvatars assigneeIds={allAssigneeIds.slice(0, 4)} members={members} />

          <div onClick={e => e.stopPropagation()}>
            <ActionMenu task={task} onToggleBlock={onToggleBlock} onConclude={onConclude} onEdit={onEdit} />
          </div>
        </div>
      </div>

      {expanded && task.subtasks.length > 0 && (
        <div className="border-t border-border/40 bg-muted/5">
          <div className="relative pl-10 pr-3 py-1.5 border-b border-border/30 grid grid-cols-[180px_1fr_110px_90px_auto]">
            <div className="absolute left-[18px] top-0 bottom-0 w-px bg-border/40" />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/40">Etapa</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/40">Título</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/40">Período</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/40">Prazo</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/40 text-right">Resp.</span>
          </div>

          <div className="relative">
            <div className="absolute left-[18px] top-0 bottom-4 w-px bg-border/40" />
            {task.subtasks.map((subtask, idx) => (
              <SubtaskRow
                key={subtask.id}
                subtask={subtask}
                task={task}
                members={members}
                isLast={idx === task.subtasks.length - 1}
                onEdit={onEdit}
                onUpdateSubtaskAssignees={onUpdateSubtaskAssignees}
                onUpdateSubtaskDates={onUpdateSubtaskDates}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}, (prev, next) =>
  prev.task === next.task &&
  prev.members === next.members &&
  prev.defaultExpanded === next.defaultExpanded
);
