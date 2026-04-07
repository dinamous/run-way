/**
 * Interfaces de props dos componentes e views principais.
 *
 * Centralizar aqui evita duplicação e garante que todos os consumidores
 * usam a mesma assinatura.
 */

import type { Task } from '../lib/steps';
import type { Member } from '../hooks/useSupabase';
import type { Holiday } from '../utils/holidayUtils';
import type { CalendarViewMode } from '../utils/dashboardUtils';

// ─── TaskModal ────────────────────────────────────────────────────────────────

export interface TaskModalProps {
  /** Tarefa a editar; `null` para criar nova. */
  task: Task | null;
  members: Member[];
  onClose: () => void;
  /** Chamado com os dados prontos a guardar (sem `id` / `createdAt` se nova). */
  onSave: (taskData: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
  /** Chamado com o id da tarefa a eliminar; omitido no modal de criação. */
  onDelete?: (id: string) => void;
  holidays: Holiday[];
}

// ─── DashboardView ────────────────────────────────────────────────────────────

export interface DashboardViewProps {
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
  members: Member[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onUpdateTask: (task: Task) => void;
  holidays: Holiday[];
  viewMode?: CalendarViewMode;
}

// ─── TimelineView ─────────────────────────────────────────────────────────────

export interface TimelineViewProps {
  tasks: Task[];
  members: Member[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onUpdateTask: (task: Task) => void;
  holidays: Holiday[];
  daysRange: number;
}

// ─── MembersView ─────────────────────────────────────────────────────────────

export interface MembersViewProps {}
