import { memo } from 'react';
import type { Task } from '@/lib/steps';
import type { Member } from '@/hooks/infra/useSupabase';
import { TaskTableRow } from './TaskTableRow';

interface TaskTableProps {
  tasks: Task[];
  members: Member[];
  onToggleBlock: (task: Task) => void;
  onConclude: (task: Task) => void;
  onEdit: (task: Task) => void;
  onUpdateSubtaskAssignees?: (task: Task, subtaskId: string, assignees: string[]) => Promise<boolean>;
  onUpdateSubtaskDates?: (task: Task, subtaskId: string, start: string, end: string) => Promise<boolean>;
}

export const TaskTable = memo(function TaskTable({
  tasks,
  members,
  onToggleBlock,
  onConclude,
  onEdit,
  onUpdateSubtaskAssignees,
  onUpdateSubtaskDates,
}: TaskTableProps) {
  if (tasks.length === 0) return null;

  return (
    <div className="space-y-2 pb-16">
      {tasks.map(task => (
        <TaskTableRow
          key={task.id}
          task={task}
          members={members}
          onToggleBlock={onToggleBlock}
          onConclude={onConclude}
          onEdit={onEdit}
          defaultExpanded={tasks.length > 0}
          onUpdateSubtaskAssignees={onUpdateSubtaskAssignees}
          onUpdateSubtaskDates={onUpdateSubtaskDates}
        />
      ))}
    </div>
  );
});
