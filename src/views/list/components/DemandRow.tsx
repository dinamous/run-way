import { memo } from 'react';
import { ExternalLink, Check, Lock, Trash2, Users, Calendar } from 'lucide-react';
import type { Task } from '@/lib/steps';
import type { Member } from '@/hooks/useSupabase';

interface DemandRowProps {
  task: Task;
  referenceDate: string;
  members: Member[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onConclude: (task: Task) => void;
  onToggleBlock: (task: Task) => void;
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate.length === 10 ? isoDate + 'T00:00:00' : isoDate);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export const DemandRow = memo(function DemandRow({ task, referenceDate, members, onEdit, onDelete, onConclude, onToggleBlock }: DemandRowProps) {
  const allAssigneeIds = [...new Set(task.steps.flatMap(s => s.assignees))];
  const assigneeMembers = allAssigneeIds
    .map(id => members.find(m => m.id === id))
    .filter((m): m is Member => m !== undefined);

  const isBlocked = task.status.blocked;
  const isConcluded = !!task.concludedAt;

  return (
    <div className={`flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border ${isConcluded ? 'bg-gray-100 dark:bg-gray-800/50 opacity-60' : 'bg-card'}`}>
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

      <div className="flex items-center gap-6 text-sm text-muted-foreground min-w-0">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Users className="w-4 h-4 text-muted-foreground/70" />
          <div className="flex -space-x-2">
            {assigneeMembers.slice(0, 3).map(m => (
              <div
                key={m.id}
                title={m.name}
                className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] font-semibold flex items-center justify-center ring-2 ring-card"
              >
                {m.avatar}
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

        <div className="flex items-center gap-2 whitespace-nowrap">
          <Calendar className="w-4 h-4 text-muted-foreground/70" />
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Referência</span>
            <span className="text-sm font-medium text-foreground">{formatDate(referenceDate)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-xs text-muted-foreground">Criado</span>
          <span className="text-sm">{formatDate(task.createdAt)}</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {!isConcluded && (
          <button
            onClick={() => onConclude(task)}
            title="Concluir"
            className="p-1.5 rounded hover:bg-emerald-100 hover:text-emerald-700 text-muted-foreground transition-colors dark:hover:bg-emerald-900 dark:hover:text-emerald-300"
          >
            <Check className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => onToggleBlock(task)}
          title={isBlocked ? 'Desbloquear' : 'Bloquear'}
          className={`p-1.5 rounded transition-colors ${isBlocked ? 'text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900' : 'text-muted-foreground hover:bg-orange-100 hover:text-orange-600 dark:hover:bg-orange-900 dark:hover:text-orange-400'}`}
        >
          <Lock className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(task)}
          title="Excluir"
          className="p-1.5 rounded hover:bg-red-100 hover:text-red-600 text-muted-foreground transition-colors dark:hover:bg-red-900 dark:hover:text-red-400"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}, (prev, next) =>
  prev.task.id === next.task.id &&
  prev.task.status?.blocked === next.task.status?.blocked &&
  prev.task.concludedAt === next.task.concludedAt &&
  prev.referenceDate === next.referenceDate &&
  prev.members.length === next.members.length
);
