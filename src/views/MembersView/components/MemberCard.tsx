import React from 'react';
import Badge from '@/components/ui/Badge';
import { migrateLegacyTask } from '@/lib/steps';
import type { Task, Step, LegacyTask } from '@/lib/steps';
import type { Member } from '@/hooks/useSupabase';
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
}

const MemberCard: React.FC<MemberCardProps> = ({ member, tasks, today }) => {
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

        <div className="mt-4">
          <div className="text-sm font-medium text-foreground mb-2">
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
              {taskEntries.map(({ task, steps }) => (
                <MemberTaskItem key={task.id} task={task} steps={steps} today={today} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberCard;
