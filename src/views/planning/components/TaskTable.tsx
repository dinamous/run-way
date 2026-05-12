import { memo, useState } from 'react';
import { ChevronDown, ChevronRight, Link2, AlertCircle, Circle, CheckCircle2 } from 'lucide-react';
import { STEP_META, type Task, type SubtaskStatus } from '@/lib/steps';
import type { Member } from '@/hooks/infra/useSupabase';
import { formatDueDate } from '../utils';
import { ActionMenu } from './ActionMenu';

interface TaskTableProps {
  tasks: Task[];
  members: Member[];
  onToggleBlock: (task: Task) => void;
  onConclude: (task: Task) => void;
  onEdit: (task: Task) => void;
}

function MemberAvatars({ assigneeIds, members, size = 'sm' }: {
  assigneeIds: string[];
  members: Member[];
  size?: 'sm' | 'xs';
}) {
  const dim = size === 'xs' ? 'w-5 h-5 text-[9px]' : 'w-6 h-6 text-[10px]';
  const resolved = assigneeIds
    .map(id => members.find(m => m.id === id))
    .filter((m): m is Member => m !== undefined);

  if (resolved.length === 0) {
    return (
      <div
        className={`${dim} rounded-full border border-dashed border-muted-foreground/30 bg-muted/60 flex items-center justify-center text-muted-foreground/50`}
        title="Sem responsável"
      >
        ?
      </div>
    );
  }

  return (
    <div className="flex -space-x-1.5">
      {resolved.slice(0, 3).map(m => (
        <div
          key={m.id}
          title={m.name}
          className={`${dim} rounded-full ring-2 ring-background bg-primary text-primary-foreground font-bold flex items-center justify-center overflow-hidden`}
        >
          {m.avatar_url
            ? <img src={m.avatar_url} alt={m.name} className="w-full h-full object-cover" />
            : m.name.slice(0, 2).toUpperCase()
          }
        </div>
      ))}
      {resolved.length > 3 && (
        <div className={`${dim} rounded-full ring-2 ring-background bg-muted text-foreground font-bold flex items-center justify-center`}>
          +{resolved.length - 3}
        </div>
      )}
    </div>
  );
}

function formatDateRange(start: string, end: string): string {
  const fmt = (d: string) => {
    if (!d) return '—';
    const [, m, day] = d.split('-');
    return `${day}/${m}`;
  };
  if (!start && !end) return '—';
  if (!start) return `até ${fmt(end)}`;
  if (!end) return `de ${fmt(start)}`;
  return `${fmt(start)} → ${fmt(end)}`;
}

const SubtaskRow = memo(function SubtaskRow({
  subtask,
  task,
  members,
  isLast,
  onEdit,
}: {
  subtask: Task['subtasks'][number];
  task: Task;
  members: Member[];
  isLast: boolean;
  onEdit: (task: Task) => void;
}) {
  const meta = STEP_META[subtask.status as SubtaskStatus];
  const timeStatus = formatDueDate(subtask.end);
  const isBlocked = task.status.blocked;
  const isConcluded = !!task.concludedAt;

  return (
    <div
      className={`grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-0 pl-8 pr-3 py-0 min-h-[38px] cursor-pointer transition-colors
        ${!isLast ? 'border-b border-border/40' : ''}
        ${isBlocked
          ? 'hover:bg-red-50/60 dark:hover:bg-red-950/20'
          : isConcluded
            ? 'hover:bg-muted/20 opacity-60'
            : 'hover:bg-muted/40'
        }`}
      onClick={() => onEdit(task)}
    >
      {/* Indicador de fase */}
      <div className="flex items-center gap-2 pr-3 py-2.5">
        <div className={`w-0.5 h-4 rounded-full ${meta.dot}`} />
        <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-sm leading-none whitespace-nowrap ${meta.tagBg}`}>
          {meta.label}
        </span>
        {subtask.active && !isConcluded && (
          <span className="flex items-center gap-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            <Circle className="w-2 h-2 fill-current" />
            ativa
          </span>
        )}
      </div>

      {/* Título da subtask */}
      <span className="text-xs text-muted-foreground truncate py-2.5 pr-4">
        {subtask.title}
      </span>

      {/* Datas */}
      <span className="text-[11px] text-muted-foreground/70 tabular-nums whitespace-nowrap pr-4 py-2.5">
        {formatDateRange(subtask.start, subtask.end)}
      </span>

      {/* Badge de prazo */}
      <div className="pr-3 py-2.5 hidden sm:block">
        {timeStatus && subtask.active && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${timeStatus.className}`}>
            {timeStatus.label}
          </span>
        )}
      </div>

      {/* Responsáveis */}
      <div className="py-2.5">
        <MemberAvatars assigneeIds={subtask.assignees} members={members} size="xs" />
      </div>
    </div>
  );
});

const TaskTableRow = memo(function TaskTableRow({
  task,
  members,
  onToggleBlock,
  onConclude,
  onEdit,
  defaultExpanded,
}: {
  task: Task;
  members: Member[];
  onToggleBlock: (task: Task) => void;
  onConclude: (task: Task) => void;
  onEdit: (task: Task) => void;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const isBlocked = task.status.blocked;
  const isConcluded = !!task.concludedAt;

  const activeSubtask = task.subtasks.find(s => s.active);
  const allAssigneeIds = [...new Set(task.subtasks.flatMap(s => s.assignees))];

  const taskTimeStatus = formatDueDate(activeSubtask?.end);

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
      {/* Linha da task (pai) */}
      <div
        className={`flex items-center gap-0 cursor-pointer transition-colors
          ${isConcluded
            ? 'bg-muted/10 hover:bg-muted/20'
            : isBlocked
              ? 'bg-red-50/50 dark:bg-red-950/20 hover:bg-red-50/80 dark:hover:bg-red-950/30'
              : 'bg-background hover:bg-muted/30'
          }`}
        onClick={() => task.subtasks.length > 0 && setExpanded(e => !e)}
      >
        {/* Borda lateral colorida */}
        <div className={`w-1 self-stretch shrink-0 ${
          isBlocked ? 'bg-red-500' : isConcluded ? 'bg-muted-foreground/25' : activeSubtask ? STEP_META[activeSubtask.status as SubtaskStatus].handle : 'bg-muted-foreground/30'
        }`} />

        {/* Expand/collapse */}
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

        {/* Título */}
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

        {/* Meta-info da task: subtask count + prazo + responsáveis */}
        <div className="flex items-center gap-3 pr-2 shrink-0">
          {task.subtasks.length > 0 && (
            <span className="text-[10px] text-muted-foreground/50 tabular-nums hidden sm:block">
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

      {/* Linhas das subtasks */}
      {expanded && task.subtasks.length > 0 && (
        <div className="border-t border-border/40">
          {task.subtasks.map((subtask, idx) => (
            <SubtaskRow
              key={subtask.id}
              subtask={subtask}
              task={task}
              members={members}
              isLast={idx === task.subtasks.length - 1}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}, (prev, next) =>
  prev.task.id === next.task.id &&
  prev.task.status?.blocked === next.task.status?.blocked &&
  prev.task.concludedAt === next.task.concludedAt &&
  prev.task.subtasks?.length === next.task.subtasks?.length &&
  prev.members.length === next.members.length &&
  prev.defaultExpanded === next.defaultExpanded
);

export const TaskTable = memo(function TaskTable({ tasks, members, onToggleBlock, onConclude, onEdit }: TaskTableProps) {
  if (tasks.length === 0) return null;

  const hasActiveFilters = tasks.length > 0;

  return (
    <div className="space-y-2 pb-16">
      {/* Cabeçalho de colunas (apenas visual, alinhado com as subtask rows) */}
      <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center pl-14 pr-3 pb-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/50 pr-3">Etapa</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/50 pr-4">Título</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/50 pr-4">Período</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/50 pr-3 hidden sm:block">Prazo</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/50">Resp.</span>
      </div>

      {tasks.map(task => (
        <TaskTableRow
          key={task.id}
          task={task}
          members={members}
          onToggleBlock={onToggleBlock}
          onConclude={onConclude}
          onEdit={onEdit}
          defaultExpanded={hasActiveFilters}
        />
      ))}
    </div>
  );
});
