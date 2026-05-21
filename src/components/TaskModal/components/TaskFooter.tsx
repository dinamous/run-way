import React from 'react';
import { Save, Trash2 } from 'lucide-react';
import { Button } from '../../ui';
import type { Task } from '../../../lib/steps';

interface Props {
  task: Task | null;
  isDirty: boolean;
  submitting: boolean;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

const TaskFooter: React.FC<Props> = ({ task, isDirty, submitting, onDelete, onClose }) => (
  <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-between">
    <div>
      {task && onDelete && (
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => onDelete(task.id)}
          className="text-muted-foreground hover:text-destructive flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          <span>Apagar demanda</span>
        </Button>
      )}
    </div>

    <div className="flex items-center gap-3">
      <Button variant="outline" onClick={onClose} type="button">
        Cancelar
      </Button>
      <Button type="submit" form="task-form" disabled={!isDirty || submitting} className="flex items-center gap-2">
        <Save className="w-4 h-4" />
        <span className="sm:hidden">{submitting ? 'A guardar…' : task ? 'Salvar' : 'Criar'}</span>
        <span className="hidden sm:inline">{submitting ? 'A guardar…' : task ? 'Salvar Alterações' : 'Criar Demanda'}</span>
      </Button>
    </div>
  </div>
);

export default TaskFooter;
