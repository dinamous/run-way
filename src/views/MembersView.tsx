import React from 'react';
import Badge from '../components/ui/Badge';
import { STEP_META, migrateLegacyTask, getCurrentStep } from '../lib/steps';
import type { Task, Step, LegacyTask } from '../lib/steps';
import type { MembersViewProps } from '../types/props';

function normalizeTask(task: Task | LegacyTask): Task {
  if ((task as Task).steps && typeof (task as Task).status === 'object') return task as Task;
  const migrated = migrateLegacyTask(task as LegacyTask);
  return { ...(task as object), ...migrated } as Task;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const MembersView: React.FC<MembersViewProps> = ({ tasks, members }) => {
  const today = todayStr();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Capacity da Equipe</h2>
        <p className="text-muted-foreground">Alocação por step ativo por membro.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {members.map(member => {
          // Collect all active steps where this member is assigned
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

          // Current load = steps whose date range includes today
          const activeSteps = memberSteps.filter(
            ({ step }) => step.start <= today && step.end >= today
          );
          const activeCount = activeSteps.length;

          let statusColor = 'bg-green-500';
          let statusText = 'Capacidade Livre';
          if (activeCount > 3) { statusColor = 'bg-red-500'; statusText = 'Sobrecarregado'; }
          else if (activeCount > 0) { statusColor = 'bg-blue-500'; statusText = 'Alocado'; }

          // Group by task for display
          const taskMap = new Map<string, { task: Task; steps: Step[] }>();
          for (const { task, step } of memberSteps) {
            if (!taskMap.has(task.id)) taskMap.set(task.id, { task, steps: [] });
            taskMap.get(task.id)!.steps.push(step);
          }
          const taskEntries = Array.from(taskMap.values());

          return (
            <div key={member.id} className="bg-card p-5 rounded-xl border border-border shadow-sm flex items-start gap-4">
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
                      {taskEntries.map(({ task, steps }) => {
                        const norm = normalizeTask(task);
                        const currentStep = getCurrentStep(norm.steps, today);
                        const isBlocked = norm.status?.blocked;
                        return (
                          <li key={task.id} className="text-xs p-2 bg-muted/50 rounded-md border border-border space-y-1.5">
                            <div className="flex items-center gap-2">
                              {isBlocked && (
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                              )}
                              {!isBlocked && (
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${currentStep ? STEP_META[currentStep.type]?.dot : 'bg-muted-foreground'}`} />
                              )}
                              <span className="font-medium truncate flex-1">{task.title}</span>
                              {isBlocked && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 font-medium shrink-0">
                                  Bloqueado
                                </span>
                              )}
                            </div>
                            <div className="flex gap-1 flex-wrap pl-3.5">
                              {steps.map(step => {
                                const meta = STEP_META[step.type];
                                const isActive = step.start <= today && step.end >= today;
                                return (
                                  <span
                                    key={step.type}
                                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                      isBlocked && step.start >= (norm.status?.blockedAt ?? '')
                                        ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'
                                        : isActive
                                          ? `${meta.color} border`
                                          : 'bg-muted text-muted-foreground'
                                    }`}
                                    title={`${step.start} → ${step.end}`}
                                  >
                                    {meta.tag}
                                  </span>
                                );
                              })}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MembersView;
