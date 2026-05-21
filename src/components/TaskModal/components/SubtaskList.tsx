import React from 'react';
import { Plus, ListTodo } from 'lucide-react';
import type { Member } from '../../../hooks/infra/useSupabase';
import type { SubtaskDraft } from '../hooks/useSubtasks';
import SubtaskRow from './SubtaskRow';

interface Props {
  subtasks: SubtaskDraft[];
  members: Member[];
  errors: Record<string, string>;
  addSubtask: () => void;
  updateSubtask: <K extends keyof SubtaskDraft>(id: string, field: K, value: SubtaskDraft[K]) => void;
  toggleAssignee: (id: string, memberId: string) => void;
  removeSubtask: (id: string) => void;
}

const SubtaskList: React.FC<Props> = ({ subtasks, members, errors, addSubtask, updateSubtask, toggleAssignee, removeSubtask }) => {
  const activeCount = subtasks.filter(s => s.active).length;

  return (
    <div className="space-y-4 pt-4 border-t border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Subtasks</span>
          {activeCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground font-medium border border-border">
              {activeCount} ativa{activeCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={addSubtask}
          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:opacity-80 hover:bg-muted px-3 py-1.5 rounded-md transition-all"
        >
          <Plus className="w-4 h-4" />
          Nova Subtask
        </button>
      </div>

      {errors.subtasks && <p className="text-xs text-red-500">{errors.subtasks}</p>}

      <div className="space-y-2.5">
        {subtasks.map(subtask => (
          <SubtaskRow
            key={subtask._tempId}
            subtask={subtask}
            members={members}
            errors={errors}
            updateSubtask={updateSubtask}
            toggleAssignee={toggleAssignee}
            removeSubtask={removeSubtask}
          />
        ))}
      </div>

      {subtasks.length === 0 && (
        <div className="text-center py-10 bg-muted/20 rounded-xl border border-dashed border-border flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
            <ListTodo className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">Nenhuma subtask definida</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Adicione subtasks para estruturar esta demanda, atribuir responsáveis e definir prazos de entrega.
          </p>
        </div>
      )}
    </div>
  );
};

export default SubtaskList;
