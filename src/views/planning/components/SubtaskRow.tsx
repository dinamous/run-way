import { memo } from 'react';
import { AlertCircle, Circle, CheckCircle2, PlayCircle, AlertTriangle } from 'lucide-react';
import { STEP_META, type Task, type SubtaskStatus } from '@/lib/steps';
import type { Member } from '@/hooks/infra/useSupabase';
import { formatDueDate } from '../utils';
import { DatesPopover } from './DatesPopover';
import { AssigneesPopover } from './AssigneesPopover';

function SubtaskStatusIcon({ subtask, isConcluded, isBlocked }: {
  subtask: Task['subtasks'][number];
  isConcluded: boolean;
  isBlocked: boolean;
}) {
  if (isConcluded) return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
  if (isBlocked && subtask.active) return <AlertTriangle className="w-3.5 h-3.5 text-orange-500 shrink-0" />;
  if (subtask.active) {
    const timeStatus = formatDueDate(subtask.end);
    if (timeStatus?.label.startsWith('Atrasada')) return <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />;
    return <PlayCircle className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
  }
  return <Circle className="w-2.5 h-2.5 text-muted-foreground/40 shrink-0 mx-0.5" />;
}

interface SubtaskRowProps {
  subtask: Task['subtasks'][number];
  task: Task;
  members: Member[];
  isLast: boolean;
  onEdit: (task: Task) => void;
  onUpdateSubtaskAssignees?: (task: Task, subtaskId: string, assignees: string[]) => Promise<boolean>;
  onUpdateSubtaskDates?: (task: Task, subtaskId: string, start: string, end: string) => Promise<boolean>;
}

export const SubtaskRow = memo(function SubtaskRow({
  subtask,
  task,
  members,
  isLast,
  onEdit,
  onUpdateSubtaskAssignees,
  onUpdateSubtaskDates,
}: SubtaskRowProps) {
  const meta = STEP_META[subtask.status as SubtaskStatus];
  const timeStatus = formatDueDate(subtask.end);
  const isBlocked = task.status.blocked;
  const isConcluded = !!task.concludedAt;

  return (
    <div
      className={`relative grid grid-cols-[180px_1fr_110px_90px_auto] items-center gap-0 pl-10 pr-3 min-h-[38px] cursor-pointer transition-colors group/sub
        ${!isLast ? 'border-b border-border/40' : ''}
        ${isBlocked && subtask.active
          ? 'hover:bg-red-50/60 dark:hover:bg-red-950/20'
          : isConcluded
            ? 'hover:bg-muted/20 opacity-60'
            : 'hover:bg-muted/40'
        }`}
      onClick={() => onEdit(task)}
    >
      <div className="absolute left-[18px] top-1/2 w-4 h-px bg-border/60 -translate-y-1/2" />

      <div className="flex items-center gap-2 py-2.5 pr-3">
        <SubtaskStatusIcon subtask={subtask} isConcluded={isConcluded} isBlocked={isBlocked} />
        <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-sm leading-none whitespace-nowrap ${meta.tagBg}`}>
          {meta.label}
        </span>
      </div>

      <span className="text-xs text-muted-foreground truncate py-2.5 pr-4">
        {subtask.title}
      </span>

      <div className="py-2.5 pr-4" onClick={e => e.stopPropagation()}>
        <DatesPopover subtask={subtask} task={task} onUpdate={onUpdateSubtaskDates} />
      </div>

      <div className="py-2.5 pr-3">
        {timeStatus ? (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${timeStatus.className}`}>
            {timeStatus.label}
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground/30">—</span>
        )}
      </div>

      <div className="py-2.5" onClick={e => e.stopPropagation()}>
        <AssigneesPopover
          subtask={subtask}
          task={task}
          members={members}
          onUpdate={onUpdateSubtaskAssignees}
        />
      </div>
    </div>
  );
});
