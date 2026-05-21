import { useState } from 'react';
import type { Subtask, SubtaskStatus } from '../../../lib/steps';

let _subtaskCounter = 0;
function tempId() {
  return `__new__${++_subtaskCounter}`;
}

export type SubtaskDraft = Subtask & { _tempId: string };

export function draftFromSubtask(s: Subtask): SubtaskDraft {
  return { ...s, _tempId: s.id || tempId() };
}

function newDraft(order: number): SubtaskDraft {
  return {
    _tempId: tempId(),
    id: '',
    title: '',
    status: 'design' as SubtaskStatus,
    progressStatus: 'todo',
    start: '',
    end: '',
    assignees: [],
    active: true,
    order,
  };
}

export function useSubtasks(initial: SubtaskDraft[]) {
  const [subtasks, setSubtasks] = useState<SubtaskDraft[]>(initial);

  const addSubtask = () => setSubtasks(prev => [...prev, newDraft(prev.length)]);

  const removeSubtask = (id: string) =>
    setSubtasks(prev => prev.filter(s => s._tempId !== id));

  const updateSubtask = <K extends keyof SubtaskDraft>(id: string, field: K, value: SubtaskDraft[K]) =>
    setSubtasks(prev => prev.map(s => s._tempId === id ? { ...s, [field]: value } : s));

  const toggleAssignee = (id: string, memberId: string) =>
    setSubtasks(prev => prev.map(s => {
      if (s._tempId !== id) return s;
      const has = s.assignees.includes(memberId);
      return { ...s, assignees: has ? s.assignees.filter(mid => mid !== memberId) : [...s.assignees, memberId] };
    }));

  return { subtasks, addSubtask, removeSubtask, updateSubtask, toggleAssignee };
}
