/**
 * Tipos do domínio de tarefas (demandas).
 *
 * Os tipos canónicos (`Task`, `Step`, `StepType`, `TaskStatus`) vivem em
 * `src/lib/steps.ts` porque são co-localizados com a lógica de steps.
 * Este ficheiro re-exporta-os para consumo via `src/types` e define tipos
 * auxiliares que não pertencem à lib.
 */

export type {
  Task,
  Step,
  StepType,
  TaskStatus,
} from '../lib/steps';

/**
 * Representa uma tarefa no formato legado (localStorage / Google Drive antigo),
 * antes da migração para o modelo de steps.
 *
 * Usado exclusivamente em `migrateLegacyTask`.
 */
export interface LegacyTask {
  id?: string;
  title?: string;
  clickupLink?: string;
  assignee?: string;
  /** Status como string ('bloqueado', 'em andamento', …) */
  status?: string;
  createdAt?: string;
  phases?: {
    design?: { start: string; end: string };
    approval?: { start: string; end: string };
    dev?: { start: string; end: string };
    qa?: { start: string; end: string };
  };
  phaseAssignees?: Record<string, string>;
  /** Presença de `steps` indica tarefa já migrada */
  steps?: unknown;
}
