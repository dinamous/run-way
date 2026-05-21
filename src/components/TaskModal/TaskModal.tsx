import React from 'react';
import { useMembersQuery } from '@/hooks/members/useMembersQuery';
import { useClients } from '@/hooks/clients/useClients';
import { ConfirmModal } from '../ui';
import { type Subtask, type TaskStatus } from '../../lib/steps';
import type { TaskModalProps, TaskModalPayload } from '../../types/props';
import { useFormState } from '@/hooks/ui/useFormState';
import { useSubtasks } from './hooks/useSubtasks';
import { useTaskForm, buildWeekendConfirmMessage, postponeSubtasks } from './hooks/useTaskForm';
import TaskHeader from './components/TaskHeader';
import TaskMetadataSection from './components/TaskMetadataSection';
import SubtaskList from './components/SubtaskList';
import TaskFooter from './components/TaskFooter';

const TaskModal: React.FC<TaskModalProps> = ({ task, members: propMembers, onClose, onSave, onDelete, holidays }) => {
  const { effectiveClientId } = useClients();
  const { data: storeMembers = [] } = useMembersQuery(effectiveClientId);
  const resolvedMembers = storeMembers.length > 0 ? storeMembers : propMembers;

  const {
    title, setTitle,
    clickupLink, setClickupLink,
    blocked, setBlocked,
    blockedAt, setBlockedAt,
    concludedAt, setConcludedAt,
    errors, setErrors,
    pendingSubmitData, setPendingSubmitData,
    confirmMessage, setConfirmMessage,
    showDirtyCloseConfirm, setShowDirtyCloseConfirm,
    initialSubtasks,
  } = useTaskForm(task);

  const { subtasks, addSubtask, removeSubtask, updateSubtask, toggleAssignee } = useSubtasks(initialSubtasks);

  const formSnapshot = { title, clickupLink, blocked, blockedAt, subtasks, concludedAt };
  const { isDirty, submitting, withSubmit } = useFormState(formSnapshot, !task, title.length >= 3);

  const handleRequestClose = () => {
    if (!isDirty) { onClose(); return; }
    setShowDirtyCloseConfirm(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    const activeSubtasks = subtasks.filter(s => s.active);
    if (!title || title.length < 3) e.title = 'Título obrigatório (mín. 3 caracteres).';
    if (clickupLink) {
      try { new URL(clickupLink); } catch { e.clickupLink = 'Insira um URL válido (ex: https://...).'; }
    }
    if (activeSubtasks.length === 0) e.subtasks = 'Adicione pelo menos uma subtask ativa.';
    subtasks.forEach(s => {
      if (!s.title.trim()) e[`${s._tempId}-title`] = 'Título obrigatório.';
      if (!s.start || !s.end) e[`${s._tempId}-dates`] = 'Datas obrigatórias.';
      else if (s.end < s.start) e[`${s._tempId}-dates`] = 'Fim anterior ao início.';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildTaskData = () => {
    const finalSubtasks: Subtask[] = subtasks.map((s, i) => ({
      id: s.id, title: s.title, status: s.status, progressStatus: s.progressStatus,
      start: s.start, end: s.end, assignees: s.assignees, active: s.active, order: i,
    }));
    const status: TaskStatus = { blocked, blockedAt: blocked ? blockedAt : undefined };
    return { ...task, title, clickupLink, status, subtasks: finalSubtasks, concludedAt } as TaskModalPayload;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const taskData = buildTaskData();
    const { affected, message } = buildWeekendConfirmMessage(subtasks, holidays);
    if (affected.length > 0) {
      setConfirmMessage(message);
      setPendingSubmitData(taskData);
      return;
    }
    withSubmit(() => onSave(taskData));
  };

  const handleConfirmWeekend = () => {
    if (!pendingSubmitData) return;
    const data = pendingSubmitData;
    setPendingSubmitData(null);
    withSubmit(() => onSave(data));
  };

  const handlePostponeWeekend = () => {
    if (!pendingSubmitData) return;
    const adjusted = { ...pendingSubmitData, subtasks: postponeSubtasks(pendingSubmitData.subtasks, holidays) } as TaskModalPayload;
    setPendingSubmitData(null);
    withSubmit(() => onSave(adjusted));
  };

  return (
    <>
      <style>{`
        .tm-scrollbar::-webkit-scrollbar { width: 6px; }
        .tm-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .tm-scrollbar::-webkit-scrollbar-thumb { background: color-mix(in oklch, var(--border) 80%, transparent); border-radius: 10px; }
        .tm-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--border); }
      `}</style>

      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm"
        onClick={handleRequestClose}
      >
        <div
          className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          <TaskHeader task={task ?? undefined} onClose={handleRequestClose} />

          <div className="flex-1 overflow-y-auto tm-scrollbar">
            <form id="task-form" onSubmit={handleSubmit} noValidate className="p-6 space-y-8">
              <TaskMetadataSection
                title={title} setTitle={setTitle}
                clickupLink={clickupLink} setClickupLink={setClickupLink}
                blocked={blocked} setBlocked={setBlocked}
                blockedAt={blockedAt} setBlockedAt={setBlockedAt}
                concludedAt={concludedAt} setConcludedAt={setConcludedAt}
                errors={errors}
              />
              <SubtaskList
                subtasks={subtasks}
                members={resolvedMembers}
                errors={errors}
                addSubtask={addSubtask}
                updateSubtask={updateSubtask}
                toggleAssignee={toggleAssignee}
                removeSubtask={removeSubtask}
              />
            </form>
          </div>

          <TaskFooter
            task={task}
            isDirty={isDirty}
            submitting={submitting}
            onDelete={onDelete}
            onClose={handleRequestClose}
          />

          {!!pendingSubmitData && (
            <ConfirmModal
              title="Datas em fim de semana ou feriado"
              message={confirmMessage}
              secondaryConfirmLabel="Prolongar para próximo dia útil"
              onSecondaryConfirm={handlePostponeWeekend}
              onConfirm={handleConfirmWeekend}
              onCancel={() => setPendingSubmitData(null)}
            />
          )}

          {showDirtyCloseConfirm && (
            <ConfirmModal
              title="Descartar alterações"
              message="Você tem alterações não guardadas. Tem certeza que quer fechar?"
              confirmLabel="Descartar e fechar"
              cancelLabel="Continuar editando"
              onConfirm={() => { setShowDirtyCloseConfirm(false); onClose(); }}
              onCancel={() => setShowDirtyCloseConfirm(false)}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default TaskModal;
