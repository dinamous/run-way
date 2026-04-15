import React, { useEffect, useState } from 'react';
import { useMemberStore } from '@/store/useMemberStore';
import { useClients } from '@/hooks/useClients';
import { Input, Label, Button, ConfirmModal } from './ui';
import { Save, ExternalLink, Trash2, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  STEP_META,
  createDefaultSteps,
  migrateLegacyTask,
  type Step,
  type StepType,
  type TaskStatus,
} from '../lib/steps';
import type { TaskModalProps } from '../types/props';
import { useFormState } from '../hooks/useFormState';
import { isWeekendOrHoliday, getHolidayName, nextNonHolidayBusinessDay } from '../utils/holidayUtils';

const TaskModal: React.FC<TaskModalProps> = ({ task, members: propMembers, onClose, onSave, onDelete, holidays }) => {
  const { effectiveClientId } = useClients();
  const { fetchMembers, members: storeMembers } = useMemberStore();

  useEffect(() => {
    fetchMembers(effectiveClientId);
  }, [effectiveClientId, fetchMembers]);

  const resolvedMembers = storeMembers.length > 0 ? storeMembers : propMembers;

  const init = migrateLegacyTask(task ?? {});

  const [title, setTitle] = useState<string>(task?.title ?? '');
  const [clickupLink, setClickupLink] = useState<string>(task?.clickupLink ?? '');
  const [blocked, setBlocked] = useState<boolean>(init.status.blocked);
  const [blockedAt, setBlockedAt] = useState<string>(
    init.status.blockedAt ?? new Date().toISOString().split('T')[0]
  );
  const [concludedAt, setConcludedAt] = useState<string | undefined>(task?.concludedAt);
  const [steps, setSteps] = useState<Step[]>(
    task ? init.steps : createDefaultSteps()
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingSubmitData, setPendingSubmitData] = useState<Parameters<typeof onSave>[0] | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [showDirtyCloseConfirm, setShowDirtyCloseConfirm] = useState(false);

  const formSnapshot = { title, clickupLink, blocked, blockedAt, steps, concludedAt };
  const { isDirty, submitting, withSubmit } = useFormState(
    formSnapshot,
    !task,
    title.length >= 3,
  );

  const handleRequestClose = () => {
    if (!isDirty) {
      onClose();
      return;
    }

    setShowDirtyCloseConfirm(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!title || title.length < 3) e.title = 'Título obrigatório (mín. 3 caracteres).';
    if (clickupLink) {
      try { new URL(clickupLink) } catch { e.clickupLink = 'Insira um URL válido (ex: https://...).'; }
    }
    if (activeCount === 0) e.steps = 'Selecione pelo menos um step.';
    steps.filter(s => s.active).forEach(s => {
      if (!s.start || !s.end) e[`${s.type}-dates`] = 'Datas obrigatórias quando step está ativo.';
      else if (s.end < s.start) e[`${s.type}-dates`] = 'Fim anterior ao início.';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const status: TaskStatus = {
      blocked,
      blockedAt: blocked ? blockedAt : undefined,
    };
    const taskData = { ...task, title, clickupLink, status, steps, concludedAt };

    const describeDateConflict = (date: string): string => {
      const holidayName = getHolidayName(date, holidays);
      if (holidayName) return `${date} (Feriado: ${holidayName})`;
      const dow = new Date(date + 'T00:00:00').getDay();
      return `${date} (${dow === 0 ? 'Domingo' : 'Sábado'})`;
    };

    const affected = steps
      .filter(s => s.active)
      .filter(s => (s.start && isWeekendOrHoliday(s.start, holidays)) || (s.end && isWeekendOrHoliday(s.end, holidays)))
      .map(s => {
        const parts: string[] = [];
        if (s.start && isWeekendOrHoliday(s.start, holidays)) parts.push(`início em ${describeDateConflict(s.start)}`);
        if (s.end && isWeekendOrHoliday(s.end, holidays)) parts.push(`fim em ${describeDateConflict(s.end)}`);
        return `• ${STEP_META[s.type]?.label ?? s.type}: ${parts.join(' e ')}`;
      });

    if (affected.length > 0) {
      setConfirmMessage(`As seguintes fases têm datas em fim de semana ou feriado:\n\n${affected.join('\n')}\n\nDeseja salvar mesmo assim?`);
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

  const handleCancelWeekend = () => {
    setPendingSubmitData(null);
  };

  const handlePostponeWeekend = () => {
    if (!pendingSubmitData) return;

    const adjustedTaskData = {
      ...pendingSubmitData,
      steps: pendingSubmitData.steps.map(step => {
        if (!step.active) return step;

        const adjustedStart = step.start && isWeekendOrHoliday(step.start, holidays)
          ? nextNonHolidayBusinessDay(step.start, holidays)
          : step.start;
        let adjustedEnd = step.end && isWeekendOrHoliday(step.end, holidays)
          ? nextNonHolidayBusinessDay(step.end, holidays)
          : step.end;

        if (adjustedStart && adjustedEnd && adjustedEnd < adjustedStart) {
          adjustedEnd = adjustedStart;
        }

        return { ...step, start: adjustedStart, end: adjustedEnd };
      }),
    };

    setPendingSubmitData(null);
    withSubmit(() => onSave(adjustedTaskData));
  };

  const toggleStep = (type: StepType) => {
    setSteps(prev => prev.map(s => s.type === type ? { ...s, active: !s.active } : s));
  };

  const updateStep = (type: StepType, field: keyof Step, value: Step[keyof Step]) => {
    setSteps(prev => prev.map(s => s.type === type ? { ...s, [field]: value } : s));
  };

  const toggleAssignee = (type: StepType, memberId: string) => {
    setSteps(prev => prev.map(s => {
      if (s.type !== type) return s;
      const has = s.assignees.includes(memberId);
      return { ...s, assignees: has ? s.assignees.filter(id => id !== memberId) : [...s.assignees, memberId] };
    }));
  };

  const activeCount = steps.filter(s => s.active).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleRequestClose}
    >
      <div
        className="bg-card rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {task ? 'Editar Demanda' : 'Nova Demanda'}
          </h2>
          <button
            onClick={handleRequestClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >✕</button>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
          <form id="task-form" onSubmit={handleSubmit} noValidate>
            <div className="space-y-6">

              {/* Título */}
              <div className="space-y-1.5">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ex: Landing Page Black Friday"
                />
                {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
              </div>

              {/* Link ClickUp */}
              <div className="space-y-1.5">
                <Label htmlFor="clickup" className="flex items-center gap-1">
                  Link ClickUp
                  <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
                </Label>
                <div className="relative">
                  <Input
                    id="clickup"
                    type="text"
                    inputMode="url"
                    value={clickupLink}
                    onChange={e => setClickupLink(e.target.value)}
                    placeholder="https://app.clickup.com/t/..."
                    className="pr-9"
                  />
                  {clickupLink && (
                    <a
                      href={clickupLink}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
                {errors.clickupLink && <p className="text-xs text-red-500">{errors.clickupLink}</p>}
              </div>

              {/* Bloqueado */}
              <div className={`rounded-xl border p-3 transition-colors ${blocked
                ? 'bg-red-50 border-red-300 dark:bg-red-950/60 dark:border-red-700'
                : 'bg-muted border-border'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className={`w-4 h-4 shrink-0 ${blocked ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`} />
                    <div>
                      <div className={`text-sm font-semibold ${blocked ? 'text-red-800 dark:text-red-200' : 'text-foreground'}`}>
                        Bloqueado
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Steps a partir da data de bloqueio ficam em alerta vermelho
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBlocked(b => !b)}
                    className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${blocked ? 'bg-red-500' : 'bg-muted-foreground/30'}`}
                    aria-label="Alternar bloqueio"
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${blocked ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
                {blocked && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[11px] text-red-700 dark:text-red-300 font-medium shrink-0">Data do bloqueio:</span>
                    <Input
                      type="date"
                      value={blockedAt}
                      onChange={e => setBlockedAt(e.target.value)}
                      className="h-7 text-xs w-auto flex-1 bg-white/70 dark:bg-red-900/30 border-red-300 dark:border-red-700"
                    />
                  </div>
                )}
              </div>

              {/* Concluída */}
              <div className={`rounded-xl border p-3 transition-colors ${concludedAt
                ? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/60 dark:border-emerald-700'
                : 'bg-muted border-border'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`w-4 h-4 shrink-0 ${concludedAt ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`} />
                    <div>
                      <div className={`text-sm font-semibold ${concludedAt ? 'text-emerald-800 dark:text-emerald-200' : 'text-foreground'}`}>
                        Concluída
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Demanda finalizada e entregue
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConcludedAt(concludedAt ? undefined : new Date().toISOString())}
                    className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${concludedAt ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`}
                    aria-label="Alternar conclusão"
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${concludedAt ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
                {concludedAt && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium shrink-0">Concluída em:</span>
                    <Input
                      type="date"
                      value={concludedAt.split('T')[0]}
                      onChange={e => setConcludedAt(e.target.value ? e.target.value + 'T00:00:00' : undefined)}
                      className="h-7 text-xs w-auto flex-1 bg-white/70 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700"
                    />
                  </div>
                )}
              </div>

              {/* Steps */}
              <div className="space-y-2">
                {errors.steps && <p className="text-xs text-red-500">{errors.steps}</p>}
                <div className="flex items-center justify-between">
                  <Label>Steps da Demanda</Label>
                  <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {activeCount} ativo{activeCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {steps.map((step) => {
                    const meta = STEP_META[step.type as StepType];
                    if (!meta) return null;
                    return (
                      <div
                        key={step.type}
                        className={`rounded-xl border transition-all ${step.active ? meta.color : 'bg-muted/50 border-border'}`}
                      >
                        {/* Step header — always visible */}
                        <button
                          type="button"
                          onClick={() => toggleStep(step.type)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
                        >
                          {/* Checkbox */}
                          <span className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                            step.active
                              ? 'bg-current border-current'
                              : 'border-muted-foreground/40 bg-transparent'
                          }`}>
                            {step.active && <span className="text-white text-[9px] leading-none font-bold">✓</span>}
                          </span>
                          <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
                          <span className={`text-xs font-semibold flex-1 ${step.active ? '' : 'text-muted-foreground'}`}>
                            {meta.label}
                          </span>
                          {/* Assignee avatars when active */}
                          {step.active && step.assignees.length > 0 && (
                            <div className="flex -space-x-1 shrink-0">
                              {step.assignees.map(aid => {
                                const m = resolvedMembers.find(m => m.id === aid);
                                return m ? (
                                  <div
                                    key={aid}
                                    className="w-5 h-5 rounded-full bg-white/80 dark:bg-black/30 border border-white dark:border-black/20 text-[8px] font-bold flex items-center justify-center text-foreground"
                                    title={m.name}
                                  >{m.avatar}</div>
                                ) : null;
                              })}
                            </div>
                          )}
                        </button>

                        {/* Step details — only when active */}
                        {step.active && (
                          <div className="px-3 pb-3 space-y-3 border-t border-black/10 dark:border-white/10 pt-2.5">

                            {/* Responsáveis */}
                            <div>
                              <span className="text-[10px] opacity-70 font-medium flex items-center gap-1 mb-1.5">
                                <Users className="w-3 h-3" /> Responsáveis
                                <span className="opacity-60">(opcional)</span>
                              </span>
                              <div className="flex gap-1.5 flex-wrap">
                                {resolvedMembers.map(m => {
                                  const sel = step.assignees.includes(m.id);
                                  return (
                                    <button
                                      key={m.id}
                                      type="button"
                                      onClick={() => toggleAssignee(step.type, m.id)}
                                      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium transition-all ${
                                        sel
                                          ? 'border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
                                          : 'border-transparent bg-white/50 dark:bg-white/10 text-inherit hover:bg-white/80 dark:hover:bg-white/20'
                                      }`}
                                    >
                                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                        sel ? 'bg-blue-500 text-white' : 'bg-black/10 dark:bg-white/20 text-inherit'
                                      }`}>
                                        {m.avatar}
                                      </div>
                                      {m.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Datas */}
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <span className="text-[10px] opacity-70">Início</span>
                                <Input
                                  type="date"
                                  value={step.start}
                                  onChange={e => updateStep(step.type, 'start', e.target.value)}
                                  className="h-8 text-xs bg-white/70 dark:bg-black/20 border-0 focus:ring-1"
                                />
                              </div>
                              <div className="space-y-1">
                                <span className="text-[10px] opacity-70">Fim</span>
                                <Input
                                  type="date"
                                  value={step.end}
                                  onChange={e => updateStep(step.type, 'end', e.target.value)}
                                  className="h-8 text-xs bg-white/70 dark:bg-black/20 border-0 focus:ring-1"
                                />
                              </div>
                            </div>
                            {errors[`${step.type}-dates`] && (
                              <p className="text-[10px] text-red-600">{errors[`${step.type}-dates`]}</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-border bg-muted/50 flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-between sm:items-center">
          <Button className="flex-1 sm:flex-none text-xs sm:text-sm" variant="outline" onClick={handleRequestClose} type="button">Cancelar</Button>
          <div className="flex gap-2 flex-1 sm:flex-none justify-end">
            {task && onDelete && (
              <Button
                className="flex-1 sm:flex-none text-xs sm:text-sm text-muted-foreground hover:text-destructive"
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => onDelete(task.id)}
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                <span className="sm:hidden">Apagar</span>
                <span className="hidden sm:inline">Apagar demanda</span>
              </Button>
            )}
            <Button className="flex-1 sm:flex-none text-xs sm:text-sm" type="submit" form="task-form" disabled={!isDirty || submitting}>
              <Save className="w-4 h-4 mr-1.5" />
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
  );
};

export default TaskModal;
