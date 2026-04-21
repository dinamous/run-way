import React from 'react';
import Badge from '@/components/ui/Badge';
import { Button } from '@/components/ui';
import { migrateLegacyTask } from '@/lib/steps';
import { STEP_META } from '@/lib/steps';
import type { Task, Step, LegacyTask } from '@/lib/steps';
import type { Member } from '@/hooks/useSupabase';
import { ArrowUpRight, CalendarDays } from 'lucide-react';
import MemberTaskItem from './MemberTaskItem';

function normalizeTask(task: Task | LegacyTask): Task {
  if ((task as Task).steps && typeof (task as Task).status === 'object') return task as Task;
  const migrated = migrateLegacyTask(task as LegacyTask);
  return { ...(task as object), ...migrated } as Task;
}

interface MemberCardProps {
  member: Member;
  tasks: (Task | LegacyTask)[];
  today: string;
  onOpenCalendar: (memberId: string) => void;
}

function formatDateLabel(date: string): string {
  const d = new Date(date + 'T00:00:00');
  return Number.isNaN(d.getTime())
    ? date
    : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

const MemberCard: React.FC<MemberCardProps> = React.memo(({ member, tasks, today, onOpenCalendar }) => {
  const memberSteps: { task: Task; step: Step }[] = [];
  for (const task of tasks) {
    const norm = normalizeTask(task);
    const visibleSteps = (norm.steps as Step[]).filter(
      s => s.active && s.start && s.end && s.assignees.includes(member.id)
    );
    for (const step of visibleSteps) {
      memberSteps.push({ task: norm, step });
    }
  }

  const activeCount = memberSteps.filter(
    ({ step }) => step.start <= today && step.end >= today
  ).length;

  let statusColor = 'bg-green-500';
  let statusText = 'Capacidade Livre';
  if (activeCount > 3) { statusColor = 'bg-red-500'; statusText = 'Sobrecarregado'; }
  else if (activeCount > 0) { statusColor = 'bg-blue-500'; statusText = 'Alocado'; }

  const taskMap = new Map<string, { task: Task; steps: Step[] }>();
  for (const { task, step } of memberSteps) {
    if (!taskMap.has(task.id)) taskMap.set(task.id, { task, steps: [] });
    taskMap.get(task.id)!.steps.push(step);
  }
  const taskEntries = Array.from(taskMap.values());
  const blockedCount = taskEntries.filter(({ task }) => task.status?.blocked).length;
  const horizonDate = new Date(today + 'T00:00:00');
  horizonDate.setDate(horizonDate.getDate() + 7);
  const horizon = `${horizonDate.getFullYear()}-${String(horizonDate.getMonth() + 1).padStart(2, '0')}-${String(horizonDate.getDate()).padStart(2, '0')}`;

  const upcomingSteps = memberSteps
    .filter(({ step }) => step.end >= today)
    .sort((a, b) => a.step.end.localeCompare(b.step.end));
  const dueSoonCount = memberSteps.filter(({ step }) => step.end >= today && step.end <= horizon).length;
  const nextDeadline = upcomingSteps[0];
  const previewEntries = taskEntries.slice(0, 4);
  const remainingTasks = taskEntries.length - previewEntries.length;

  return (
    <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex items-start gap-4">
      <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center text-lg font-bold text-muted-foreground shrink-0">
        {member.avatar}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-foreground">{member.name}</h3>
            <p className="text-xs text-muted-foreground">{member.role}</p>
          </div>
          <Badge variant="default" className={statusColor + ' text-white border-transparent'}>
            {statusText}
          </Badge>
        </div>

        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-lg border border-border bg-muted/40 px-2 py-1.5">
              <p className="text-muted-foreground">Demandas</p>
              <p className="font-semibold text-foreground">{taskEntries.length}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 px-2 py-1.5">
              <p className="text-muted-foreground">Steps ativos hoje</p>
              <p className="font-semibold text-foreground">{activeCount}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 px-2 py-1.5">
              <p className="text-muted-foreground">Entregas em 7 dias</p>
              <p className="font-semibold text-foreground">{dueSoonCount}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 px-2 py-1.5">
              <p className="text-muted-foreground">Demandas bloqueadas</p>
              <p className="font-semibold text-foreground">{blockedCount}</p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 px-2.5 py-2 text-xs">
            {nextDeadline ? (
              <p className="text-muted-foreground">
                Próxima entrega <span className="font-semibold text-foreground">{formatDateLabel(nextDeadline.step.end)}</span> · {STEP_META[nextDeadline.step.type].label}
              </p>
            ) : (
              <p className="text-muted-foreground">Sem etapas futuras atribuídas.</p>
            )}
          </div>

          <div className="text-sm font-medium text-foreground">
            Demandas com steps ({taskEntries.length})
            {activeCount > 0 && (
              <span className="ml-2 text-xs text-blue-600 dark:text-blue-400 font-normal">
                {activeCount} step{activeCount !== 1 ? 's' : ''} ativo{activeCount !== 1 ? 's' : ''} hoje
              </span>
            )}
          </div>

          {taskEntries.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Nenhum step alocado.</p>
          ) : (
            <ul className="space-y-2">
              {previewEntries.map(({ task, steps }) => (
                <MemberTaskItem key={task.id} task={task} steps={steps} today={today} />
              ))}
            </ul>
          )}

          {remainingTasks > 0 && (
            <p className="text-xs text-muted-foreground">+{remainingTasks} demanda{remainingTasks > 1 ? 's' : ''} na alocação deste membro.</p>
          )}

          {taskEntries.length > 0 && (
            <Button size="sm" variant="outline" className="w-full justify-center" onClick={() => onOpenCalendar(member.id)}>
              <CalendarDays className="w-4 h-4" />
              Abrir calendário do membro
              <ArrowUpRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}, (prev, next) =>
  prev.member.id === next.member.id &&
  prev.tasks.length === next.tasks.length &&
  prev.tasks === next.tasks &&
  prev.today === next.today
);

export default MemberCard;
