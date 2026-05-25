import React from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import {
  X, MoreHorizontal, CheckSquare, Plus, ChevronRight, FileText, Calendar,
  Users, AlertCircle, CheckCircle2, Link as LinkIcon, CircleDot,
} from 'lucide-react';
import { useMembersQuery } from '@/hooks/members/useMembersQuery';
import { useClients } from '@/hooks/clients/useClients';
import { Badge, Button, ConfirmModal } from '../ui';
import { type Subtask, type TaskStatus } from '../../lib/steps';
import type { TaskModalProps, TaskModalPayload } from '../../types/props';
import { useFormState } from '@/hooks/ui/useFormState';
import { useSubtasks } from './hooks/useSubtasks';
import { useTaskForm, buildWeekendConfirmMessage, postponeSubtasks } from './hooks/useTaskForm';
import TaskSidebar from './components/TaskSidebar';
import SubtaskList from './components/SubtaskList';
import TaskFooter from './components/TaskFooter';
import { getCurrentSubtask, STEP_META, SUBTASK_PROGRESS_META } from '@/lib/steps';
import type { Member } from '@/hooks/infra/useSupabase';

function SpringProgressBar({ value }: { value: number }) {
  const spring = useSpring(value, { stiffness: 120, damping: 18, mass: 0.8 });
  React.useEffect(() => { spring.set(value); }, [value, spring]);
  const width = useTransform(spring, (v) => `${v}%`);

  return (
    <div className="w-full h-[3px] bg-border rounded-full overflow-hidden">
      <motion.div className="h-full bg-primary rounded-full" style={{ width }} />
    </div>
  );
}

function formatDateLabel(date?: string) {
  if (!date) return 'Sem data';
  const [year, month, day] = date.split('-');
  if (!year || !month || !day) return date;
  return `${day}/${month}/${year}`;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();
}

function TeamStack({ members }: { members: Member[] }) {
  if (members.length === 0) {
    return <span className="text-xs text-muted-foreground">Sem responsáveis</span>;
  }

  return (
    <div className="flex items-center">
      {members.slice(0, 4).map(member => (
        <div
          key={member.id}
          title={member.name}
          className="-ml-1 first:ml-0 size-7 overflow-hidden rounded-full border-2 border-card bg-muted"
        >
          {member.avatar_url ? (
            <img src={member.avatar_url} alt={member.name} className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-[10px] font-semibold text-foreground">
              {member.avatar || getInitials(member.name)}
            </span>
          )}
        </div>
      ))}
      {members.length > 4 && (
        <span className="-ml-1 flex size-7 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-semibold text-muted-foreground">
          +{members.length - 4}
        </span>
      )}
    </div>
  );
}

const TaskModal: React.FC<TaskModalProps> = ({ task, members: propMembers, onClose, onSave, onDelete, holidays }) => {
  const [isExiting, setIsExiting] = React.useState(false);

  const triggerClose = React.useCallback(() => setIsExiting(true), []);
  const handleExitComplete = () => onClose();

  const { effectiveClientId } = useClients();
  const { data: storeMembers = [] } = useMembersQuery(effectiveClientId);
  const resolvedMembers = storeMembers.length > 0 ? storeMembers : propMembers;

  const {
    title, setTitle,
    description, setDescription,
    clickupLink, setClickupLink,
    blocked, setBlocked,
    blockedAt, setBlockedAt,
    concludedAt, setConcludedAt,
    expectedHours, setExpectedHours,
    complexity, setComplexity,
    taskType, setTaskType,
    dueDate, setDueDate,
    errors, setErrors,
    pendingSubmitData, setPendingSubmitData,
    confirmMessage, setConfirmMessage,
    showDirtyCloseConfirm, setShowDirtyCloseConfirm,
    initialSubtasks,
  } = useTaskForm(task);

  const { subtasks, addSubtask, removeSubtask, updateSubtask, toggleAssignee } = useSubtasks(initialSubtasks);

  const formSnapshot = { title, description, clickupLink, blocked, blockedAt, subtasks, concludedAt, expectedHours, complexity, taskType, dueDate };
  const { isDirty, submitting, withSubmit } = useFormState(formSnapshot, !task, title.length >= 3);

  const handleRequestClose = () => {
    if (!isDirty) { triggerClose(); return; }
    setShowDirtyCloseConfirm(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    const activeSubtasks = subtasks.filter(s => s.active);
    if (!title || title.length < 3) e.title = 'Título obrigatório (mín. 3 caracteres).';
    if (description.length > 2000) e.description = 'Descrição muito longa (máx. 2000 caracteres).';
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
    return { ...task, title, description, clickupLink, status, subtasks: finalSubtasks, concludedAt, expectedHours, complexity, taskType, dueDate } as TaskModalPayload;
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

  const completed = subtasks.filter(s => s.progressStatus === 'done').length;
  const progress = subtasks.length > 0 ? Math.round((completed / subtasks.length) * 100) : 0;
  const activeSubtasks = subtasks.filter(s => s.active);
  const today = new Date().toISOString().split('T')[0];
  const currentSubtask = getCurrentSubtask(activeSubtasks, today);
  const currentMeta = currentSubtask ? STEP_META[currentSubtask.status] : null;
  const currentProgress = currentSubtask ? SUBTASK_PROGRESS_META[currentSubtask.progressStatus] : null;
  const uniqueAssignees = [...new Set(activeSubtasks.flatMap(s => s.assignees))]
    .map(id => resolvedMembers.find(member => member.id === id))
    .filter((member): member is Member => Boolean(member));
  const datedSubtasks = activeSubtasks.filter(s => s.start || s.end);
  const firstStart = datedSubtasks
    .map(s => s.start)
    .filter(Boolean)
    .sort()[0];
  const lastEnd = datedSubtasks
    .map(s => s.end)
    .filter(Boolean)
    .sort()
    .at(-1);
  const demandStatus = concludedAt
    ? 'Concluída'
    : blocked
      ? 'Bloqueada'
      : currentProgress?.label ?? 'Em planejamento';
  const demandStatusIcon = concludedAt ? CheckCircle2 : blocked ? AlertCircle : CircleDot;
  const DemandStatusIcon = demandStatusIcon;

  return (
    <>
      <motion.div
          animate={isExiting ? { opacity: 0 } : { opacity: 1 }}
          initial={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onAnimationComplete={() => { if (isExiting) handleExitComplete(); }}
          onClick={handleRequestClose}
          className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-[6px]"
        />

        <motion.div
          animate={isExiting ? { opacity: 0, scale: 0.97, y: 8 } : { opacity: 1, scale: 1, y: 0 }}
          initial={{ opacity: 0, scale: 0.97, y: 8 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28, mass: 0.9 }}
          onClick={e => e.stopPropagation()}
          className="fixed z-[90] inset-3 sm:inset-6 md:inset-[4vh_auto] md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-6xl md:max-h-[92vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
          style={{ transformOrigin: 'center center' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-border bg-muted/20 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {task?.id && (
                <span className="text-[11px] font-mono text-muted-foreground border border-border rounded-md bg-card px-1.5 py-0.5">
                  #{task.id}
                </span>
              )}
              {!task?.id && (
                <span className="text-[11px] font-medium text-muted-foreground border border-border rounded-md bg-card px-1.5 py-0.5">
                  Nova
                </span>
              )}
              <ChevronRight className="size-3.5 text-muted-foreground/50" />
              <span className="hidden sm:inline text-[13px] text-muted-foreground">
                Planejamento
              </span>
              <ChevronRight className="hidden sm:block size-3.5 text-muted-foreground/50" />
              <span className="truncate text-[13px] font-medium text-foreground">
                {task ? 'Editar demanda' : 'Criar demanda'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {clickupLink && (
                <a
                  href={clickupLink}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden sm:flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
                >
                  <LinkIcon className="size-3.5" />
                  ClickUp
                </a>
              )}
              <button className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-border mx-1" />
              <button
                onClick={handleRequestClose}
                className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
            {/* Left — main form */}
            <form
              id="task-form"
              onSubmit={handleSubmit}
              noValidate
              className="flex-1 overflow-y-auto p-5 sm:p-7 lg:p-8 space-y-8"
            >
              {/* Title */}
              <div className="space-y-5">
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  autoFocus
                  placeholder="Nome da demanda..."
                  className="w-full bg-transparent text-2xl sm:text-[2rem] leading-[1.15] font-semibold text-foreground focus:outline-none border-none p-0 placeholder:text-muted-foreground/40"
                />
                {errors.title && <p className="text-xs text-destructive mt-1.5">{errors.title}</p>}

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border border-border bg-muted/20 px-3 py-3">
                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                      <DemandStatusIcon className="size-3.5" /> Estado
                    </span>
                    <p className="mt-1 text-sm font-semibold text-foreground">{demandStatus}</p>
                    {currentMeta && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{currentMeta.label}</p>
                    )}
                  </div>

                  <div className="rounded-lg border border-border bg-muted/20 px-3 py-3">
                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                      <CheckSquare className="size-3.5" /> Substasks
                    </span>
                    <p className="mt-1 text-sm font-semibold text-foreground">{completed}/{subtasks.length} concluídas</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{progress}% da demanda</p>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/20 px-3 py-3">
                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                      <Users className="size-3.5" /> Equipe
                    </span>
                    <div className="mt-2">
                      <TeamStack members={uniqueAssignees} />
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/20 px-3 py-3">
                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                      <Calendar className="size-3.5" /> Cronograma
                    </span>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {firstStart || lastEnd ? `${formatDateLabel(firstStart)} - ${formatDateLabel(lastEnd)}` : 'Sem datas'}
                    </p>
                    {currentSubtask && (
                      <p className="mt-0.5 text-xs text-muted-foreground truncate">{currentSubtask.title || currentMeta?.label}</p>
                    )}
                  </div>
                </div>
              </div>

              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="size-4" />
                    <h3 className="text-[12px] font-medium uppercase tracking-wider">Contexto</h3>
                  </div>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {description.length}/2000
                  </span>
                </div>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Descreva objetivo, escopo, restrições e critérios de aceite desta demanda."
                  className="min-h-28 w-full resize-y rounded-lg border border-border bg-background px-3.5 py-3 text-sm leading-relaxed text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-ring focus:ring-1 focus:ring-ring"
                />
                {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
              </section>

              {/* Subtasks */}
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CheckSquare className="w-3.5 h-3.5" />
                      <h3 className="text-[12px] font-medium uppercase tracking-wider">Substasks</h3>
                    </div>
                    <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[11px] font-medium text-muted-foreground">
                      {completed}/{subtasks.length}
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    onClick={addSubtask}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="w-3 h-3" /> Adicionar Subtask
                  </Button>
                </div>

                <SpringProgressBar value={progress} />

                {errors.subtasks && <p className="text-xs text-destructive">{errors.subtasks}</p>}

                <SubtaskList
                  subtasks={subtasks}
                  members={resolvedMembers}
                  errors={errors}
                  addSubtask={addSubtask}
                  updateSubtask={updateSubtask}
                  toggleAssignee={toggleAssignee}
                  removeSubtask={removeSubtask}
                />
              </div>
            </form>

            {/* Right — properties sidebar */}
            <TaskSidebar
              task={task}
              subtasks={subtasks}
              members={resolvedMembers}
              clickupLink={clickupLink}
              setClickupLink={setClickupLink}
              blocked={blocked}
              setBlocked={setBlocked}
              blockedAt={blockedAt}
              setBlockedAt={setBlockedAt}
              concludedAt={concludedAt}
              setConcludedAt={setConcludedAt}
              expectedHours={expectedHours}
              setExpectedHours={setExpectedHours}
              complexity={complexity}
              setComplexity={setComplexity}
              taskType={taskType}
              setTaskType={setTaskType}
              dueDate={dueDate}
              setDueDate={setDueDate}
              errors={errors}
            />
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
              onConfirm={() => { setShowDirtyCloseConfirm(false); triggerClose(); }}
              onCancel={() => setShowDirtyCloseConfirm(false)}
            />
          )}
        </motion.div>
    </>
  );
};

export default TaskModal;
