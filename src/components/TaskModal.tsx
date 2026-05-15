import React, { useState } from 'react';
import { useMembersQuery } from '@/hooks/members/useMembersQuery';
import { useClients } from '@/hooks/clients/useClients';
import { Input, Button, ConfirmModal } from './ui';
import {
  Save, ExternalLink, Trash2, Users, AlertCircle, CheckCircle2,
  Plus, GripVertical, X, Calendar, Link2, ChevronDown, ListTodo,
} from 'lucide-react';
import {
  STEP_META,
  STEP_TYPES_ORDER,
  SUBTASK_PROGRESS_META,
  SUBTASK_PROGRESS_STATUS_ORDER,
  migrateLegacyTask,
  type Subtask,
  type SubtaskProgressStatus,
  type SubtaskStatus,
  type TaskStatus,
} from '../lib/steps';
import type { TaskModalProps } from '../types/props';
import { useFormState } from '@/hooks/ui/useFormState';
import { isWeekendOrHoliday, getHolidayName, nextNonHolidayBusinessDay } from '../utils/holidayUtils';

let _subtaskCounter = 0;
function tempId() {
  return `__new__${++_subtaskCounter}`;
}

type SubtaskDraft = Subtask & { _tempId: string };

function draftFromSubtask(s: Subtask): SubtaskDraft {
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

const TaskModal: React.FC<TaskModalProps> = ({ task, members: propMembers, onClose, onSave, onDelete, holidays }) => {
  const { effectiveClientId } = useClients();
  const { data: storeMembers = [] } = useMembersQuery(effectiveClientId);

  const resolvedMembers = storeMembers.length > 0 ? storeMembers : propMembers;

  const init = migrateLegacyTask(task ?? {});

  const [title, setTitle] = useState<string>(task?.title ?? '');
  const [clickupLink, setClickupLink] = useState<string>(task?.clickupLink ?? '');
  const [blocked, setBlocked] = useState<boolean>(init.status.blocked);
  const [blockedAt, setBlockedAt] = useState<string>(
    init.status.blockedAt ?? new Date().toISOString().split('T')[0]
  );
  const [concludedAt, setConcludedAt] = useState<string | undefined>(task?.concludedAt);
  const [subtasks, setSubtasks] = useState<SubtaskDraft[]>(
    init.subtasks.map(draftFromSubtask)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingSubmitData, setPendingSubmitData] = useState<Parameters<typeof onSave>[0] | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [showDirtyCloseConfirm, setShowDirtyCloseConfirm] = useState(false);

  const formSnapshot = { title, clickupLink, blocked, blockedAt, subtasks, concludedAt };
  const { isDirty, submitting, withSubmit } = useFormState(
    formSnapshot,
    !task,
    title.length >= 3,
  );

  const handleRequestClose = () => {
    if (!isDirty) { onClose(); return; }
    setShowDirtyCloseConfirm(true);
  };

  const activeSubtasks = subtasks.filter(s => s.active);

  const validate = () => {
    const e: Record<string, string> = {};
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

  const buildTaskData = (drafts: SubtaskDraft[]) => {
    const finalSubtasks: Subtask[] = drafts.map((s, i) => ({
      id: s.id,
      title: s.title,
      status: s.status,
      progressStatus: s.progressStatus,
      start: s.start,
      end: s.end,
      assignees: s.assignees,
      active: s.active,
      order: i,
    }));
    const status: TaskStatus = { blocked, blockedAt: blocked ? blockedAt : undefined };
    return { ...task, title, clickupLink, status, subtasks: finalSubtasks, concludedAt };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const taskData = buildTaskData(subtasks);

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

    if (affected.length > 0) {
      setConfirmMessage(`As seguintes subtasks têm datas em fim de semana ou feriado:\n\n${affected.join('\n')}\n\nDeseja salvar mesmo assim?`);
      setPendingSubmitData(taskData as Parameters<typeof onSave>[0]);
      return;
    }

    withSubmit(() => onSave(taskData as Parameters<typeof onSave>[0]));
  };

  const handleConfirmWeekend = () => {
    if (!pendingSubmitData) return;
    setPendingSubmitData(null);
    withSubmit(() => onSave(pendingSubmitData));
  };

  const handleCancelWeekend = () => setPendingSubmitData(null);

  const handlePostponeWeekend = () => {
    if (!pendingSubmitData) return;

    const adjusted = {
      ...pendingSubmitData,
      subtasks: pendingSubmitData.subtasks.map((s: Subtask) => {
        const adjustedStart = s.start && isWeekendOrHoliday(s.start, holidays)
          ? nextNonHolidayBusinessDay(s.start, holidays)
          : s.start;
        let adjustedEnd = s.end && isWeekendOrHoliday(s.end, holidays)
          ? nextNonHolidayBusinessDay(s.end, holidays)
          : s.end;
        if (adjustedStart && adjustedEnd && adjustedEnd < adjustedStart) adjustedEnd = adjustedStart;
        return { ...s, start: adjustedStart, end: adjustedEnd };
      }),
    };

    setPendingSubmitData(null);
    withSubmit(() => onSave(adjusted));
  };

  const addSubtask = () => {
    setSubtasks(prev => [...prev, newDraft(prev.length)]);
  };

  const removeSubtask = (id: string) => {
    setSubtasks(prev => prev.filter(s => s._tempId !== id));
  };

  const updateSubtask = <K extends keyof SubtaskDraft>(id: string, field: K, value: SubtaskDraft[K]) => {
    setSubtasks(prev => prev.map(s => s._tempId === id ? { ...s, [field]: value } : s));
  };

  const toggleAssignee = (id: string, memberId: string) => {
    setSubtasks(prev => prev.map(s => {
      if (s._tempId !== id) return s;
      const has = s.assignees.includes(memberId);
      return { ...s, assignees: has ? s.assignees.filter(mid => mid !== memberId) : [...s.assignees, memberId] };
    }));
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

          {/* Header */}
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
              onClick={handleRequestClose}
              className="text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto tm-scrollbar">
            <form id="task-form" onSubmit={handleSubmit} noValidate className="p-6 space-y-8">

              {/* Seção 1: Título e metadados */}
              <div className="space-y-5">

                {/* Título grande */}
                <div>
                  <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Nome da Demanda..."
                    autoFocus
                    className="w-full bg-transparent text-3xl font-bold tracking-tight text-foreground placeholder:text-muted-foreground/40 outline-none border-b border-transparent focus:border-primary pb-1 transition-colors"
                  />
                  {errors.title && <p className="text-xs text-red-500 mt-1.5">{errors.title}</p>}
                </div>

                {/* Link ClickUp + toggles Bloqueada/Concluída */}
                <div className="flex flex-wrap items-center gap-3">

                  <div className="relative flex-1 min-w-[220px] group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Link2 className="w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    </div>
                    <Input
                      type="text"
                      inputMode="url"
                      value={clickupLink}
                      onChange={e => setClickupLink(e.target.value)}
                      placeholder="Colar link do ClickUp..."
                      className="pl-9 pr-8"
                    />
                    {clickupLink && (
                      <a
                        href={clickupLink}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-blue-500 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    {errors.clickupLink && <p className="text-xs text-red-500 mt-1">{errors.clickupLink}</p>}
                  </div>

                  <div className="flex items-center gap-1 bg-muted border border-border p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setBlocked(b => !b)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        blocked
                          ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                          : 'text-muted-foreground hover:text-foreground hover:bg-background border border-transparent'
                      }`}
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      Bloqueada
                    </button>

                    <button
                      type="button"
                      onClick={() => setConcludedAt(concludedAt ? undefined : new Date().toISOString())}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        concludedAt
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'text-muted-foreground hover:text-foreground hover:bg-background border border-transparent'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Concluída
                    </button>
                  </div>
                </div>

                {/* Datas condicionais (bloqueio / conclusão) */}
                {(blocked || concludedAt) && (
                  <div className="flex flex-wrap gap-4 p-3.5 bg-muted/50 rounded-lg border border-border">
                    {blocked && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-red-600 dark:text-red-400 shrink-0">A partir de:</span>
                        <Input
                          type="date"
                          value={blockedAt}
                          onChange={e => setBlockedAt(e.target.value)}
                          className="h-7 text-xs w-auto border-red-300 dark:border-red-700"
                        />
                      </div>
                    )}
                    {concludedAt && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 shrink-0">Concluída em:</span>
                        <Input
                          type="date"
                          value={concludedAt.split('T')[0]}
                          onChange={e => setConcludedAt(e.target.value ? e.target.value + 'T00:00:00' : undefined)}
                          className="h-7 text-xs w-auto border-emerald-300 dark:border-emerald-700"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Seção 2: Subtasks */}
              <div className="space-y-4 pt-4 border-t border-border">

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">Subtasks</span>
                    {activeSubtasks.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground font-medium border border-border">
                        {activeSubtasks.length} ativa{activeSubtasks.length !== 1 ? 's' : ''}
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
                  {subtasks.map((subtask) => {
                    const meta = STEP_META[subtask.status];
                    return (
                      <div
                        key={subtask._tempId}
                        className={`group relative flex flex-col lg:flex-row lg:items-center gap-4 p-3.5 bg-muted/30 border ${meta.color} rounded-xl hover:bg-muted/50 transition-colors`}
                      >
                        {/* Lado esquerdo: grip + título + selects */}
                        <div className="flex flex-1 items-center gap-3 min-w-0">
                          <GripVertical className="w-4 h-4 text-muted-foreground/40 cursor-grab hover:text-muted-foreground shrink-0" />

                          <div className="flex-1 flex flex-col gap-2 min-w-0">
                            <input
                              type="text"
                              value={subtask.title}
                              onChange={e => updateSubtask(subtask._tempId, 'title', e.target.value)}
                              placeholder="Nome da subtask…"
                              className="w-full bg-transparent text-sm font-semibold text-foreground placeholder:text-muted-foreground/40 outline-none border-b border-transparent focus:border-border pb-0.5 transition-colors"
                            />

                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="relative">
                                <select
                                  value={subtask.status}
                                  onChange={e => updateSubtask(subtask._tempId, 'status', e.target.value as SubtaskStatus)}
                                  className="appearance-none bg-background border border-border text-foreground text-[11px] rounded px-2.5 py-1 pr-6 outline-none focus:ring-1 focus:ring-ring cursor-pointer transition-shadow"
                                >
                                  {STEP_TYPES_ORDER.map(s => (
                                    <option key={s} value={s}>{STEP_META[s].label}</option>
                                  ))}
                                </select>
                                <ChevronDown className="w-3 h-3 text-muted-foreground absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                              </div>

                              <div className="relative">
                                <select
                                  value={subtask.progressStatus}
                                  onChange={e => updateSubtask(subtask._tempId, 'progressStatus', e.target.value as SubtaskProgressStatus)}
                                  className="appearance-none bg-background border border-border text-foreground text-[11px] rounded px-2.5 py-1 pr-6 outline-none focus:ring-1 focus:ring-ring cursor-pointer transition-shadow"
                                  title="Status da subtask"
                                >
                                  {SUBTASK_PROGRESS_STATUS_ORDER.map(s => (
                                    <option key={s} value={s}>{SUBTASK_PROGRESS_META[s].label}</option>
                                  ))}
                                </select>
                                <ChevronDown className="w-3 h-3 text-muted-foreground absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                              </div>
                            </div>

                            {errors[`${subtask._tempId}-title`] && (
                              <span className="text-[10px] text-red-500">{errors[`${subtask._tempId}-title`]}</span>
                            )}
                          </div>
                        </div>

                        {/* Lado direito: responsáveis + datas + remover */}
                        <div className="flex items-center gap-4 lg:justify-end border-t border-border lg:border-none pt-3 lg:pt-0 flex-wrap">

                          {/* Avatares / responsáveis */}
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <div className="flex flex-wrap gap-1">
                              {resolvedMembers.map(m => {
                                const sel = subtask.assignees.includes(m.id);
                                return (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => toggleAssignee(subtask._tempId, m.id)}
                                    title={m.name}
                                    className={`relative w-7 h-7 rounded-full overflow-hidden transition-all duration-150 ${
                                      sel
                                        ? 'ring-2 ring-primary ring-offset-1 ring-offset-card opacity-100 scale-110 z-10'
                                        : 'opacity-40 grayscale hover:opacity-70 hover:grayscale-0'
                                    }`}
                                  >
                                    {m.avatar_url ? (
                                      <img src={m.avatar_url} alt={m.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full bg-muted border border-border flex items-center justify-center text-[10px] font-bold text-foreground">
                                        {m.avatar}
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Range de datas compacto */}
                          <div className="flex items-center bg-background border border-border rounded-md overflow-hidden focus-within:ring-1 focus-within:ring-ring transition-all">
                            <div className="flex items-center px-2.5 border-r border-border">
                              <Calendar className="w-3.5 h-3.5 text-muted-foreground mr-2 shrink-0" />
                              <input
                                type="date"
                                value={subtask.start}
                                onChange={e => updateSubtask(subtask._tempId, 'start', e.target.value)}
                                className="bg-transparent text-[11px] font-mono text-foreground py-1.5 w-[90px] outline-none"
                              />
                            </div>
                            <div className="flex items-center px-2.5">
                              <span className="text-[10px] text-muted-foreground mr-2 font-medium">até</span>
                              <input
                                type="date"
                                value={subtask.end}
                                onChange={e => updateSubtask(subtask._tempId, 'end', e.target.value)}
                                className="bg-transparent text-[11px] font-mono text-foreground py-1.5 w-[90px] outline-none"
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeSubtask(subtask._tempId)}
                            className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100"
                            aria-label="Remover subtask"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {errors[`${subtask._tempId}-dates`] && (
                          <p className="absolute -bottom-4 right-10 text-[10px] text-red-500">
                            {errors[`${subtask._tempId}-dates`]}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Empty state */}
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
            </form>
          </div>

          {/* Footer */}
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
              <Button variant="outline" onClick={handleRequestClose} type="button">
                Cancelar
              </Button>
              <Button type="submit" form="task-form" disabled={!isDirty || submitting} className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                <span className="sm:hidden">{submitting ? 'A guardar…' : task ? 'Salvar' : 'Criar'}</span>
                <span className="hidden sm:inline">{submitting ? 'A guardar…' : task ? 'Salvar Alterações' : 'Criar Demanda'}</span>
              </Button>
            </div>
          </div>

          {pendingSubmitData && (
            <ConfirmModal
              title="Datas em fim de semana ou feriado"
              message={confirmMessage}
              secondaryConfirmLabel="Prolongar para próximo dia útil"
              onSecondaryConfirm={handlePostponeWeekend}
              onConfirm={handleConfirmWeekend}
              onCancel={handleCancelWeekend}
            />
          )}

          {showDirtyCloseConfirm && (
            <ConfirmModal
              title="Descartar alterações"
              message="Você tem alterações não guardadas. Tem certeza que quer fechar?"
              confirmLabel="Descartar e fechar"
              cancelLabel="Continuar editando"
              onConfirm={() => {
                setShowDirtyCloseConfirm(false);
                onClose();
              }}
              onCancel={() => setShowDirtyCloseConfirm(false)}
            />
          )}

        </div>
      </div>
    </>
  );
};

export default TaskModal;
