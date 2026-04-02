import React from 'react';
import { STEP_META, getCurrentStep } from '@/lib/steps';
import type { Task, Step } from '@/lib/steps';

interface MemberTaskItemProps {
  task: Task;
  steps: Step[];
  today: string;
}

const MemberTaskItem: React.FC<MemberTaskItemProps> = ({ task, steps, today }) => {
  const currentStep = getCurrentStep(task.steps, today);
  const isBlocked = task.status?.blocked;

  return (
    <li className="text-xs p-2 bg-muted/50 rounded-md border border-border space-y-1.5">
      <div className="flex items-center gap-2">
        {isBlocked ? (
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
        ) : (
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
                isBlocked && step.start >= (task.status?.blockedAt ?? '')
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
};

export default MemberTaskItem;
