import React from 'react';
import { Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { normaliseTask, getTaskStatusDisplay, type Task, type Step } from '@/utils/dashboardUtils';
import type { Member } from '@/types/member';

interface TaskInfoPanelProps {
  task: Task;
  members: Member[];
  visibleSteps: Step[];
  totalH: number;
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
}

const TaskInfoPanel: React.FC<TaskInfoPanelProps> = ({ task, members, visibleSteps, totalH, onEdit, onDelete }) => {
  const norm = normaliseTask(task);
  const status = getTaskStatusDisplay(task);
  const allMemberIds = new Set(visibleSteps.flatMap(s => s.assignees));
  const assignees = members.filter(m => allMemberIds.has(m.id));

  return (
    <div className="w-56 shrink-0 border-r border-border relative flex flex-col justify-center px-3 py-2 gap-1" style={{ minHeight: totalH }}>
      {norm.status?.blocked && (
        <div className="absolute top-1.5 left-1.5">
          <AlertTriangle className="w-3 h-3 text-red-500" />
        </div>
      )}
      <div className="font-medium text-sm text-foreground truncate pr-12 pl-4">{task.title}</div>
      <div className="flex items-center gap-1 flex-wrap pl-4">
        {assignees.slice(0, 3).map(m => (
          <div key={m.id} className="w-4 h-4 rounded-full bg-muted text-[8px] font-bold flex items-center justify-center text-muted-foreground shrink-0" title={m.name}>{m.avatar}</div>
        ))}
        {assignees.length === 0 && (
          <div className="w-4 h-4 rounded-full bg-muted border border-dashed border-muted-foreground/30 shrink-0" title="Sem responsável" />
        )}
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium truncate max-w-[120px] ${status.cls}`}>{status.label}</span>
      </div>
      <div className="absolute right-1.5 top-1.5 flex gap-0.5 opacity-0 group-hover:opacity-100 print:hidden transition-opacity">
        <button onClick={() => onEdit(task)} className="p-1 text-muted-foreground hover:text-blue-600 rounded hover:bg-blue-50 dark:hover:bg-blue-900"><Edit2 className="w-3 h-3" /></button>
        <button onClick={() => onDelete(task.id)} className="p-1 text-muted-foreground hover:text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900"><Trash2 className="w-3 h-3" /></button>
      </div>
    </div>
  );
};

export default TaskInfoPanel;
