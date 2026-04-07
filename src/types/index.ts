/**
 * Barrel de tipos da aplicação.
 *
 * Importar a partir de `src/types` dá acesso a todos os tipos públicos:
 *
 * ```ts
 * import type { Task, Member, DashboardViewProps } from '../types';
 * ```
 *
 * Tipos de baixo nível (DB rows, legacy) são importados diretamente dos
 * seus módulos quando necessário.
 */

export type { Task, Step, StepType, TaskStatus, LegacyTask } from './task';
export type { Member } from './member';
export type {
  TaskModalProps,
  DashboardViewProps,
  CalendarViewProps,
  TimelineViewProps,
} from './props';
