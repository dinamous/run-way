import React from 'react';
import { X } from 'lucide-react';
import type { Task } from '../../../lib/steps';

interface Props {
  task?: Task;
  onClose: () => void;
}

const TaskHeader: React.FC<Props> = ({ task, onClose }) => (
  <div className="flex justify-between items-center px-6 py-4 border-b border-border bg-muted/30">
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-muted-foreground">
        {task ? 'Editar Demanda' : 'Nova Demanda'}
      </span>
      {task && (
        <span className="px-2 py-0.5 rounded text-[10px] bg-muted text-muted-foreground font-mono tracking-wider border border-border">
          #{task.id}
        </span>
      )}
    </div>
    <button
      onClick={onClose}
      className="text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-md transition-colors"
    >
      <X className="w-5 h-5" />
    </button>
  </div>
);

export default TaskHeader;
