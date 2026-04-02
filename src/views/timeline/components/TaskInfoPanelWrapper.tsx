import React from 'react';
import { getVisibleSteps, type Task } from '@/utils/dashboardUtils';
import type { Member } from '@/types/member';
import TaskInfoPanel from './TaskInfoPanel';

const PHASE_ROW_H = 28;

interface TaskInfoPanelWrapperProps {
  task: Task;
  members: Member[];
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
  rowRef?: React.Ref<HTMLDivElement>;
}

const TaskInfoPanelWrapper: React.FC<TaskInfoPanelWrapperProps> = ({ task, members, onEdit, onDelete, rowRef }) => {
  const visibleSteps = getVisibleSteps(task);
  const totalH = Math.max(visibleSteps.length, 1) * PHASE_ROW_H;

  return (
    <div ref={rowRef} className="flex flex-col">
      <TaskInfoPanel
        task={task}
        members={members}
        visibleSteps={visibleSteps}
        totalH={totalH}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
};

export default TaskInfoPanelWrapper;
