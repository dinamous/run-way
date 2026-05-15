/**
 * Interfaces de props dos componentes e views principais.
 *
 * Centralizar aqui evita duplicação e garante que todos os consumidores
 * usam a mesma assinatura.
 */

import type { Task } from '../lib/steps';
import type { ViewType } from '@/store/useUIStore';
import type { Member } from '@/hooks/infra/useSupabase';
import type { Holiday } from '../utils/holidayUtils';

export type TaskModalPayload = Omit<Task, 'id' | 'createdAt' | 'priorityOrder'> & Partial<Pick<Task, 'priorityOrder'>>;

// ─── TaskModal ────────────────────────────────────────────────────────────────

export interface TaskModalProps {
  /** Tarefa a editar; `null` para criar nova. */
  task: Task | null;
  members: Member[];
  onClose: () => void;
  /** Chamado com os dados prontos a guardar (sem `id` / `createdAt` se nova). */
  onSave: (taskData: TaskModalPayload) => Promise<void>;
  /** Chamado com o id da tarefa a eliminar; omitido no modal de criação. */
  onDelete?: (id: string) => void;
  holidays: Holiday[];
}

// ─── PlanningView ─────────────────────────────────────────────────────────────

export interface PlanningViewProps {
  subview: 'calendar' | 'timeline' | 'list' | 'demandas' | 'kanban';
  onViewChange: (view: ViewType) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onUpdateTask: (task: Task) => void;
  onOpenNew: () => void;
  onExport: () => void;
  holidays: Holiday[];
}

// ─── CalendarView ─────────────────────────────────────────────────────────────

export interface CalendarViewProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  holidays: Holiday[];
}

// ─── TimelineView ─────────────────────────────────────────────────────────────

export interface TimelineViewProps {
  tasks: Task[];
  members: Member[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onUpdateTask: (task: Task) => void;
  holidays: Holiday[];
}

// ─── MembersView ─────────────────────────────────────────────────────────────

export type MembersViewProps = object
