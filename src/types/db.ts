/**
 * Tipos que representam linhas cruas devolvidas pelo Supabase,
 * antes de qualquer mapeamento para o modelo de domínio.
 *
 * Estes tipos são usados apenas nos mappers em `useSupabase.ts`
 * e na migração de dados do localStorage.
 */

// ─── Supabase rows ────────────────────────────────────────────────────────────

export interface DbStepAssigneeRow {
  member_id: string;
}

export interface DbStepRow {
  id: string;
  type: string;
  step_order: number;
  active: boolean;
  start_date: string | null;
  end_date: string | null;
  step_assignees: DbStepAssigneeRow[];
}

export interface DbTaskRow {
  id: string;
  title: string;
  clickup_link: string | null;
  blocked: boolean;
  blocked_at: string | null;
  created_at: string;
  client_id: string | null;
  task_steps: DbStepRow[];
}

// ─── RBAC / Multi-tenant rows ─────────────────────────────────────────────────

export interface DbClientRow {
  id: string
  name: string
  slug: string
  created_at: string
}

export interface DbUserClientRow {
  user_id: string
  client_id: string
}

export interface DbAuditLogRow {
  id: string
  user_id: string | null
  client_id: string | null
  entity: 'task' | 'step'
  entity_id: string
  entity_name: string | null
  action: 'create' | 'update' | 'delete'
  field: string | null
  from_value: string | null
  to_value: string | null
  created_at: string
}

// ─── localStorage migration ───────────────────────────────────────────────────

/**
 * Formato de uma entrada de tarefa guardada no localStorage (versão antiga).
 * Pode ter steps já migrados ou apenas fases legadas.
 */
export interface LocalStorageTaskEntry {
  id?: string;
  title?: string;
  clickupLink?: string | null;
  status?: { blocked?: boolean; blockedAt?: string } | string;
  createdAt?: string;
  steps?: Array<{
    type?: string;
    order?: number;
    active?: boolean;
    start?: string;
    end?: string;
    assignees?: string[];
  }>;
}
