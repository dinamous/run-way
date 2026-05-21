import React from 'react';
import { Link as LinkIcon, Calendar, AlertCircle, CheckCircle2, ExternalLink, Users, CircleDot } from 'lucide-react';
import { Badge, Input } from '../../ui';
import { STEP_META, SUBTASK_PROGRESS_META, type Task } from '../../../lib/steps';
import type { Member } from '../../../hooks/infra/useSupabase';
import type { SubtaskDraft } from '../hooks/useSubtasks';

interface Props {
  task: Task | null;
  subtasks: SubtaskDraft[];
  members: Member[];
  clickupLink: string;
  setClickupLink: (v: string) => void;
  blocked: boolean;
  setBlocked: (v: boolean | ((prev: boolean) => boolean)) => void;
  blockedAt: string;
  setBlockedAt: (v: string) => void;
  concludedAt: string | undefined;
  setConcludedAt: (v: string | undefined) => void;
  errors: Record<string, string>;
}

function formatDateLabel(date?: string) {
  if (!date) return 'Sem data';
  const [year, month, day] = date.split('-');
  if (!year || !month || !day) return date;
  return `${day}/${month}/${year}`;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();
}

const TaskSidebar: React.FC<Props> = ({
  task, subtasks, members,
  clickupLink, setClickupLink,
  blocked, setBlocked,
  blockedAt, setBlockedAt,
  concludedAt, setConcludedAt,
  errors,
}) => {
  const activeSubtasks = subtasks.filter(s => s.active);
  const uniqueAssigneeIds = [...new Set(activeSubtasks.flatMap(s => s.assignees))];
  const assignedMembers = uniqueAssigneeIds
    .map(id => members.find(member => member.id === id))
    .filter((member): member is Member => Boolean(member));
  const nextSubtask = activeSubtasks
    .filter(s => s.end && s.progressStatus !== 'done' && s.progressStatus !== 'canceled')
    .sort((a, b) => a.end.localeCompare(b.end))[0];
  const firstStart = activeSubtasks.map(s => s.start).filter(Boolean).sort()[0];
  const lastEnd = activeSubtasks.map(s => s.end).filter(Boolean).sort().at(-1);

  return (
  <div className="w-full md:w-80 lg:w-[19rem] bg-muted/25 border-t md:border-t-0 md:border-l border-border p-5 space-y-6 overflow-y-auto shrink-0">

    {/* Status */}
    <div className="space-y-2.5">
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
        Status
      </span>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setBlocked(b => !b)}
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all border ${
            blocked
              ? 'bg-destructive/10 text-destructive border-destructive/20'
              : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          Bloqueada
        </button>

        <button
          type="button"
          onClick={() => setConcludedAt(concludedAt ? undefined : new Date().toISOString())}
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all border ${
            concludedAt
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          Concluída
        </button>
      </div>
    </div>

    <div className="h-px bg-border" />

    <div className="space-y-4">
      <div className="space-y-2.5">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <CircleDot className="w-3 h-3" /> Próxima entrega
        </span>
        <div className="rounded-lg border border-border bg-card p-3">
          {nextSubtask ? (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-snug text-foreground">{nextSubtask.title || STEP_META[nextSubtask.status].label}</p>
                <Badge variant="outline" className="rounded-md px-1.5 text-[10px] font-medium">
                  {formatDateLabel(nextSubtask.end)}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${STEP_META[nextSubtask.status].color}`}>
                  {STEP_META[nextSubtask.status].label}
                </span>
                <span className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${SUBTASK_PROGRESS_META[nextSubtask.progressStatus].className}`}>
                  {SUBTASK_PROGRESS_META[nextSubtask.progressStatus].label}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhuma entrega pendente com data definida.</p>
          )}
        </div>
      </div>

      <div className="space-y-2.5">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Users className="w-3 h-3" /> Responsáveis
        </span>
        <div className="space-y-1.5">
          {assignedMembers.length > 0 ? assignedMembers.map(member => (
            <div key={member.id} className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-2">
              <div className="size-7 overflow-hidden rounded-full bg-muted border border-border">
                {member.avatar_url ? (
                  <img src={member.avatar_url} alt={member.name} className="size-full object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center text-[10px] font-semibold text-foreground">
                    {member.avatar || getInitials(member.name)}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">{member.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">{member.role || 'Equipe'}</p>
              </div>
            </div>
          )) : (
            <div className="rounded-md border border-dashed border-border bg-card px-3 py-3 text-xs text-muted-foreground">
              Nenhum responsável nas Substasks.
            </div>
          )}
        </div>
      </div>
    </div>

    {(blocked || concludedAt) && (
      <>
        <div className="h-px bg-border" />
        <div className="space-y-3">
          {blocked && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> Bloqueada a partir de
              </span>
              <div className="bg-card border border-border rounded-md overflow-hidden">
                <div className="flex justify-between items-center px-3 py-2.5">
                  <span className="text-[12px] text-muted-foreground">Data</span>
                  <input
                    type="date"
                    value={blockedAt}
                    onChange={e => setBlockedAt(e.target.value)}
                    className="bg-transparent text-[12px] font-medium tabular-nums text-foreground focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {concludedAt && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> Concluída em
              </span>
              <div className="bg-card border border-border rounded-md overflow-hidden">
                <div className="flex justify-between items-center px-3 py-2.5">
                  <span className="text-[12px] text-muted-foreground">Data</span>
                  <input
                    type="date"
                    value={concludedAt.split('T')[0]}
                    onChange={e => setConcludedAt(e.target.value ? e.target.value + 'T00:00:00' : undefined)}
                    className="bg-transparent text-[12px] font-medium tabular-nums text-foreground focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </>
    )}

    <div className="h-px bg-border" />

    <div className="space-y-2.5">
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Calendar className="w-3 h-3" /> Cronograma
      </span>
      <div className="bg-card border border-border rounded-md overflow-hidden">
        <div className="flex justify-between items-center px-3 py-2.5">
          <span className="text-[12px] text-muted-foreground">Início</span>
          <span className="text-[12px] font-medium tabular-nums text-foreground">{formatDateLabel(firstStart)}</span>
        </div>
        <div className="border-t border-border flex justify-between items-center px-3 py-2.5">
          <span className="text-[12px] text-muted-foreground">Prazo</span>
          <span className="text-[12px] font-medium tabular-nums text-foreground">{formatDateLabel(lastEnd)}</span>
        </div>
        {task?.createdAt && (
          <div className="border-t border-border flex justify-between items-center px-3 py-2.5">
            <span className="text-[12px] text-muted-foreground">Criada em</span>
            <span className="text-[12px] font-medium tabular-nums text-foreground">{formatDateLabel(task.createdAt.split('T')[0])}</span>
          </div>
        )}
      </div>
    </div>

    <div className="h-px bg-border" />

    {/* Link */}
    <div className="space-y-2.5">
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <LinkIcon className="w-3 h-3" /> Link ClickUp
      </span>
      <div className="relative">
        <Input
          type="text"
          inputMode="url"
          value={clickupLink}
          onChange={e => setClickupLink(e.target.value)}
          placeholder="https://app.clickup.com/..."
          className="pl-8 text-[12px]"
        />
        <LinkIcon className="w-3 h-3 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        {clickupLink && (
          <a
            href={clickupLink}
            target="_blank"
            rel="noreferrer"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-blue-500 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
      {errors.clickupLink && <p className="text-xs text-destructive mt-1">{errors.clickupLink}</p>}
    </div>
  </div>
  );
};

export default TaskSidebar;
