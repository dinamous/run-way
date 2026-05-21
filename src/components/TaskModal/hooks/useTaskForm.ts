import { useState } from 'react';
import { migrateLegacyTask, type Subtask } from '../../../lib/steps';
import { isWeekendOrHoliday, getHolidayName, nextNonHolidayBusinessDay, type Holiday } from '../../../utils/holidayUtils';
import { draftFromSubtask, type SubtaskDraft } from './useSubtasks';
import type { TaskModalProps, TaskModalPayload } from '../../../types/props';
import { STEP_META } from '../../../lib/steps';

export function useTaskForm(task: TaskModalProps['task']) {
  const init = migrateLegacyTask(task ?? {});

  const [title, setTitle] = useState<string>(task?.title ?? '');
  const [clickupLink, setClickupLink] = useState<string>(task?.clickupLink ?? '');
  const [blocked, setBlocked] = useState<boolean>(init.status.blocked);
  const [blockedAt, setBlockedAt] = useState<string>(
    init.status.blockedAt ?? new Date().toISOString().split('T')[0]
  );
  const [concludedAt, setConcludedAt] = useState<string | undefined>(task?.concludedAt);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingSubmitData, setPendingSubmitData] = useState<TaskModalPayload | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [showDirtyCloseConfirm, setShowDirtyCloseConfirm] = useState(false);

  const initialSubtasks: SubtaskDraft[] = init.subtasks.map(draftFromSubtask);

  return {
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
  };
}

export function buildWeekendConfirmMessage(
  subtasks: SubtaskDraft[],
  holidays: Holiday[],
): { affected: string[]; message: string } {
  const describeDateConflict = (date: string): string => {
    const holidayName = getHolidayName(date, holidays);
    if (holidayName) return `${date} (Feriado: ${holidayName})`;
    const dow = new Date(date + 'T00:00:00').getDay();
    return `${date} (${dow === 0 ? 'Domingo' : 'Sábado'})`;
  };

  const affected = subtasks
    .filter(s => (s.start && isWeekendOrHoliday(s.start, holidays)) || (s.end && isWeekendOrHoliday(s.end, holidays)))
    .map(s => {
      const parts: string[] = [];
      if (s.start && isWeekendOrHoliday(s.start, holidays)) parts.push(`início em ${describeDateConflict(s.start)}`);
      if (s.end && isWeekendOrHoliday(s.end, holidays)) parts.push(`fim em ${describeDateConflict(s.end)}`);
      return `• ${s.title || STEP_META[s.status]?.label}: ${parts.join(' e ')}`;
    });

  const message = affected.length > 0
    ? `As seguintes subtasks têm datas em fim de semana ou feriado:\n\n${affected.join('\n')}\n\nDeseja salvar mesmo assim?`
    : '';

  return { affected, message };
}

export function postponeSubtasks(
  subtasks: Subtask[],
  holidays: Holiday[],
): Subtask[] {
  return subtasks.map(s => {
    const adjustedStart = s.start && isWeekendOrHoliday(s.start, holidays)
      ? nextNonHolidayBusinessDay(s.start, holidays)
      : s.start;
    let adjustedEnd = s.end && isWeekendOrHoliday(s.end, holidays)
      ? nextNonHolidayBusinessDay(s.end, holidays)
      : s.end;
    if (adjustedStart && adjustedEnd && adjustedEnd < adjustedStart) adjustedEnd = adjustedStart;
    return { ...s, start: adjustedStart, end: adjustedEnd };
  });
}
