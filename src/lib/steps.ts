export const STEP_TYPES_ORDER = [
  'analise-ux',
  'analise-dev',
  'design',
  'aprovacao-design',
  'desenvolvimento',
  'homologacao',
  'qa',
  'publicacao',
] as const;

/** Status possíveis de uma subtask (ex-StepType) */
export type SubtaskStatus = typeof STEP_TYPES_ORDER[number];

export const SUBTASK_PROGRESS_STATUS_ORDER = [
  'todo',
  'ready',
  'in-progress',
  'in-review',
  'waiting',
  'blocked',
  'needs-changes',
  'paused',
  'done',
  'canceled',
] as const;

export type SubtaskProgressStatus = typeof SUBTASK_PROGRESS_STATUS_ORDER[number];

/** @deprecated use SubtaskStatus */
export type StepType = SubtaskStatus;

export interface Subtask {
  id: string;
  title: string;          // nome livre obrigatório
  status: SubtaskStatus;  // ex-type
  progressStatus: SubtaskProgressStatus;
  start: string;          // YYYY-MM-DD, empty if not set
  end: string;            // YYYY-MM-DD, empty if not set
  assignees: string[];
  active: boolean;
  order: number;
}

/** @deprecated use Subtask */
export type Step = Subtask & { type: SubtaskStatus };

export interface TaskStatus {
  blocked: boolean;
  blockedAt?: string; // YYYY-MM-DD — the date when blocked was set
}

export const TASK_COMPLEXITY_VALUES = ['baixa', 'media', 'alta', 'avancada', 'extrema'] as const;
export type TaskComplexity = typeof TASK_COMPLEXITY_VALUES[number];

export const TASK_TYPE_VALUES = ['feature', 'bug', 'support', 'meeting'] as const;
export type TaskType = typeof TASK_TYPE_VALUES[number];

export interface Task {
  id: string;
  title: string;
  description?: string;
  clickupLink?: string;
  clientId?: string;
  clientName?: string;
  priorityOrder: number;
  status: TaskStatus;
  subtasks: Subtask[];
  createdAt: string;
  concludedAt?: string;
  concludedBy?: string;
  expectedHours?: number;
  complexity?: TaskComplexity;
  taskType?: TaskType;
  dueDate?: string;
  startedAt?: string;
}

export const STEP_META: Record<SubtaskStatus, {
  label: string;
  tag: string;
  color: string;      // card bg/text/border in modal
  dot: string;        // dot color
  bar: string;        // bar style in calendar/timeline
  handle: string;     // drag handle
  tagBg: string;      // tag pill bg
  barBlocked: string; // bar style when task is blocked
}> = {
  'analise-ux': {
    label: 'Análise UX',
    tag: 'UX',
    color: 'bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-950 dark:text-pink-200 dark:border-pink-700',
    dot: 'bg-pink-500',
    bar: 'bg-pink-100 text-pink-900 border border-pink-300 dark:bg-pink-950 dark:text-pink-200 dark:border-pink-700',
    handle: 'bg-pink-400 dark:bg-pink-600',
    tagBg: 'bg-pink-500 text-white',
    barBlocked: 'bg-red-500 text-white border border-red-600 dark:bg-red-600 dark:border-red-700',
  },
  'analise-dev': {
    label: 'Análise Dev',
    tag: 'AD',
    color: 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950 dark:text-cyan-200 dark:border-cyan-700',
    dot: 'bg-cyan-500',
    bar: 'bg-cyan-100 text-cyan-900 border border-cyan-300 dark:bg-cyan-950 dark:text-cyan-200 dark:border-cyan-700',
    handle: 'bg-cyan-400 dark:bg-cyan-600',
    tagBg: 'bg-cyan-600 text-white',
    barBlocked: 'bg-red-500 text-white border border-red-600 dark:bg-red-600 dark:border-red-700',
  },
  'design': {
    label: 'Design',
    tag: 'DES',
    color: 'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-950 dark:text-violet-200 dark:border-violet-700',
    dot: 'bg-violet-500',
    bar: 'bg-violet-100 text-violet-900 border border-violet-300 dark:bg-violet-950 dark:text-violet-200 dark:border-violet-700',
    handle: 'bg-violet-400 dark:bg-violet-600',
    tagBg: 'bg-violet-600 text-white',
    barBlocked: 'bg-red-500 text-white border border-red-600 dark:bg-red-600 dark:border-red-700',
  },
  'aprovacao-design': {
    label: 'Aprovação Design',
    tag: 'APR',
    color: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-200 dark:border-orange-700',
    dot: 'bg-orange-500',
    bar: 'bg-orange-100 text-orange-900 border border-orange-300 dark:bg-orange-950 dark:text-orange-200 dark:border-orange-700',
    handle: 'bg-orange-400 dark:bg-orange-600',
    tagBg: 'bg-orange-500 text-white',
    barBlocked: 'bg-red-500 text-white border border-red-600 dark:bg-red-600 dark:border-red-700',
  },
  'desenvolvimento': {
    label: 'Desenvolvimento',
    tag: 'DEV',
    color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-700',
    dot: 'bg-blue-500',
    bar: 'bg-blue-100 text-blue-900 border border-blue-300 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-700',
    handle: 'bg-blue-400 dark:bg-blue-600',
    tagBg: 'bg-blue-600 text-white',
    barBlocked: 'bg-red-500 text-white border border-red-600 dark:bg-red-600 dark:border-red-700',
  },
  'homologacao': {
    label: 'Homologação',
    tag: 'HOM',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-200 dark:border-indigo-700',
    dot: 'bg-indigo-500',
    bar: 'bg-indigo-100 text-indigo-900 border border-indigo-300 dark:bg-indigo-950 dark:text-indigo-200 dark:border-indigo-700',
    handle: 'bg-indigo-400 dark:bg-indigo-600',
    tagBg: 'bg-indigo-600 text-white',
    barBlocked: 'bg-red-500 text-white border border-red-600 dark:bg-red-600 dark:border-red-700',
  },
  'qa': {
    label: 'QA',
    tag: 'QA',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-700',
    dot: 'bg-emerald-500',
    bar: 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-700',
    handle: 'bg-emerald-400 dark:bg-emerald-600',
    tagBg: 'bg-emerald-600 text-white',
    barBlocked: 'bg-red-500 text-white border border-red-600 dark:bg-red-600 dark:border-red-700',
  },
  'publicacao': {
    label: 'Publicação',
    tag: 'PUB',
    color: 'bg-lime-100 text-lime-800 border-lime-300 dark:bg-lime-950 dark:text-lime-200 dark:border-lime-700',
    dot: 'bg-lime-500',
    bar: 'bg-lime-100 text-lime-900 border border-lime-300 dark:bg-lime-950 dark:text-lime-200 dark:border-lime-700',
    handle: 'bg-lime-400 dark:bg-lime-600',
    tagBg: 'bg-lime-600 text-white',
    barBlocked: 'bg-red-500 text-white border border-red-600 dark:bg-red-600 dark:border-red-700',
  },
};

export const SUBTASK_PROGRESS_META: Record<SubtaskProgressStatus, {
  label: string;
  description: string;
  className: string;
}> = {
  todo: {
    label: 'A fazer',
    description: 'Ainda nao iniciada',
    className: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700',
  },
  ready: {
    label: 'Pronta',
    description: 'Liberada para começar',
    className: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800',
  },
  'in-progress': {
    label: 'Em andamento',
    description: 'Trabalho ativo',
    className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  },
  'in-review': {
    label: 'Em revisão',
    description: 'Aguardando validação interna',
    className: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800',
  },
  waiting: {
    label: 'Aguardando',
    description: 'Dependência externa ou retorno',
    className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  },
  blocked: {
    label: 'Bloqueada',
    description: 'Impeditivo claro',
    className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
  },
  'needs-changes': {
    label: 'Precisa de ajustes',
    description: 'Retornou com correções',
    className: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800',
  },
  paused: {
    label: 'Pausada',
    description: 'Interrompida temporariamente',
    className: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-700',
  },
  done: {
    label: 'Concluída',
    description: 'Finalizada',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  },
  canceled: {
    label: 'Cancelada',
    description: 'Não será executada',
    className: 'bg-neutral-100 text-neutral-600 border-neutral-200 line-through dark:bg-neutral-900 dark:text-neutral-400 dark:border-neutral-700',
  },
};

/** Returns the subtask that should be highlighted as "current" based on today's date */
export function getCurrentSubtask(subtasks: Subtask[], today: string): Subtask | null {
  const active = subtasks.filter(s => s.active && s.start && s.end);
  if (active.length === 0) return null;

  const current = active.find(s => s.start <= today && s.end >= today);
  if (current) return current;

  const upcoming = active.filter(s => s.start > today).sort((a, b) => a.start.localeCompare(b.start));
  if (upcoming.length > 0) return upcoming[0];

  return active.sort((a, b) => b.end.localeCompare(a.end))[0];
}

/** @deprecated use getCurrentSubtask */
export function getCurrentStep(subtasks: Subtask[], today: string): Subtask | null {
  return getCurrentSubtask(subtasks, today);
}

/** Returns label like "Em Design · Bloqueado" or "Análise UX · Em andamento" */
export function getStatusLabel(task: { status: TaskStatus; subtasks: Subtask[] }, today: string): string {
  const subtask = getCurrentSubtask(task.subtasks, today);
  const stepLabel = subtask ? (STEP_META[subtask.status]?.label ?? subtask.status) : 'Sem subtasks';
  const stateLabel = task.status.blocked ? 'Bloqueado' : 'Em andamento';
  return `${stepLabel} · ${stateLabel}`;
}

/** Returns true if a given subtask bar should be shown as blocked (red) */
export function isStepBlocked(task: { status: TaskStatus }, stepStart: string): boolean {
  if (!task.status.blocked || !task.status.blockedAt) return false;
  return stepStart >= task.status.blockedAt;
}

/**
 * Formato legado de tarefa (localStorage / Google Drive antigo).
 * Pode conter `steps`/`subtasks` já migrados ou apenas `phases` + `assignee`.
 */
export interface LegacyTask {
  id?: string;
  title?: string;
  description?: string;
  clickupLink?: string;
  assignee?: string;
  status?: string | TaskStatus;
  createdAt?: string;
  phases?: {
    design?: { start: string; end: string };
    approval?: { start: string; end: string };
    dev?: { start: string; end: string };
    qa?: { start: string; end: string };
  };
  phaseAssignees?: Record<string, string>;
  /** Suporte a ambos os formatos durante a transição */
  steps?: Array<{ type?: string; status?: string; progressStatus?: SubtaskProgressStatus; title?: string; id?: string; start?: string; end?: string; assignees?: string[]; active?: boolean; order?: number }>;
  subtasks?: Subtask[];
}

/** Migrates a legacy task to the subtasks format */
export function migrateLegacyTask(task: LegacyTask): { status: TaskStatus; subtasks: Subtask[] } {
  if (task.subtasks) {
    const existingStatus = task.status;
    const status: TaskStatus =
      existingStatus && typeof existingStatus === 'object'
        ? existingStatus
        : { blocked: false };
    return {
      status,
      subtasks: task.subtasks.map(s => ({
        ...s,
        progressStatus: s.progressStatus ?? 'todo',
      })),
    };
  }

  if (task.steps) {
    const existingStatus = task.status;
    const status: TaskStatus =
      existingStatus && typeof existingStatus === 'object'
        ? existingStatus
        : { blocked: false };

    const subtasks: Subtask[] = task.steps.map((s, i) => ({
      id: s.id ?? '',
      title: s.title ?? s.type ?? s.status ?? '',
      status: (s.status ?? s.type ?? 'design') as SubtaskStatus,
      progressStatus: s.progressStatus ?? 'todo',
      start: s.start ?? '',
      end: s.end ?? '',
      assignees: s.assignees ?? [],
      active: s.active ?? false,
      order: s.order ?? i,
    }));

    return { status, subtasks };
  }

  const legacyMap: Record<string, SubtaskStatus> = {
    design: 'design',
    approval: 'aprovacao-design',
    dev: 'desenvolvimento',
    qa: 'qa',
  };

  const subtasks: Subtask[] = Object.entries(legacyMap).reduce<Subtask[]>((acc, [legacyKey, statusVal], i) => {
    const legacyPhase = task.phases?.[legacyKey as keyof NonNullable<LegacyTask['phases']>];
    if (!legacyPhase) return acc;
    const legacyAssignee = task.phaseAssignees?.[legacyKey] || task.assignee;
    acc.push({
      id: '',
      title: statusVal,
      status: statusVal,
      progressStatus: 'todo',
      start: legacyPhase.start,
      end: legacyPhase.end,
      assignees: legacyAssignee ? [legacyAssignee] : [],
      active: true,
      order: i,
    });
    return acc;
  }, []);

  const oldStatus = typeof task.status === 'string' ? task.status : undefined;
  const blocked = oldStatus === 'bloqueado';
  const status: TaskStatus = {
    blocked,
    blockedAt: blocked ? (task.createdAt?.split('T')[0] ?? undefined) : undefined,
  };

  return { status, subtasks };
}
