import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ListTodo } from 'lucide-react';
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

const SubtaskList: React.FC<Props> = ({ subtasks, members, errors, updateSubtask, toggleAssignee, removeSubtask }) => (
  <div className="space-y-2 mt-3">
    <AnimatePresence initial={false}>
      {subtasks.map(subtask => (
        <motion.div
          key={subtask._tempId}
          layout
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: 'hidden', transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] } }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        >
          <SubtaskRow
            subtask={subtask}
            members={members}
            errors={errors}
            updateSubtask={updateSubtask}
            toggleAssignee={toggleAssignee}
            removeSubtask={removeSubtask}
          />
        </motion.div>
      ))}
    </AnimatePresence>

    {subtasks.length === 0 && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-10 border border-dashed border-border rounded-lg flex flex-col items-center justify-center"
      >
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
          <ListTodo className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">Nenhuma tarefa-filha definida</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          Adicione tarefas-filhas para estruturar esta demanda, atribuir responsaveis e definir prazos de entrega.
        </p>
      </motion.div>
    )}
  </div>
);

export default SubtaskList;
