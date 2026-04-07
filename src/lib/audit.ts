import { supabase } from '@/lib/supabase'

export interface AuditPayload {
  userId: string
  clientId: string | null
  entity: 'task' | 'step'
  entityId: string
  entityName?: string
  action: 'create' | 'update' | 'delete'
  field?: string
  fromValue?: string | null
  toValue?: string | null
}

/**
 * Grava uma entrada no audit_logs.
 * Falhas são silenciosas — nunca bloquear a ação principal.
 */
export async function logAudit(payload: AuditPayload): Promise<void> {
  const { error } = await supabase.from('audit_logs').insert({
    user_id: payload.userId,
    client_id: payload.clientId,
    entity: payload.entity,
    entity_id: payload.entityId,
    entity_name: payload.entityName ?? null,
    action: payload.action,
    field: payload.field ?? null,
    from_value: payload.fromValue ?? null,
    to_value: payload.toValue ?? null,
  })
  if (error) console.warn('[audit] Erro ao registrar log:', error.message)
}
