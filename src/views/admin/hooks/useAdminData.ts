import { useEffect, useCallback } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { toSafeUiErrorMessage } from '@/lib/errorSanitizer'
import { useTaskStore } from '@/store/useTaskStore'
import { useMemberStore } from '@/store/useMemberStore'
import { useClientStore } from '@/store/useClientStore'
import { useAdminStore } from '@/store/useAdminStore'
import type { PendingAuthUser, AuditFilters } from '@/store/useAdminStore'

export type { PendingAuthUser, AuditFilters }

interface UseAdminDataOptions {
  actorUserId?: string | null
}

export function useAdminData(options: UseAdminDataOptions = {}) {
  const { actorUserId } = options

  const selectedClientId = useClientStore((state) => state.selectedClientId)
  const invalidateTasks = useTaskStore((state) => state.invalidate)
  const fetchTasks = useTaskStore((state) => state.fetchTasks)
  const invalidateMembers = useMemberStore((state) => state.invalidate)
  const fetchMembers = useMemberStore((state) => state.fetchMembers)

  const {
    clients, users, auditLogs, loading, loadingInitial, error,
    userClientsMap, pendingUsers, initialized,
    fetchClients, fetchUsers, fetchUserClientsMap, fetchPendingUsers,
    fetchAuditLogs, refreshAll, patchUser, setError,
  } = useAdminStore()

  // Carrega os dados apenas na primeira vez que o AdminView montar
  useEffect(() => {
    if (!initialized && !loadingInitial) {
      refreshAll()
    }
  }, [initialized, loadingInitial, refreshAll])

  const reloadAppStores = useCallback(async () => {
    invalidateTasks()
    invalidateMembers()
    await Promise.all([
      fetchTasks(selectedClientId, true),
      fetchMembers(selectedClientId),
    ])
  }, [fetchMembers, fetchTasks, invalidateMembers, invalidateTasks, selectedClientId])

  // ── CRUD clients ────────────────────────────────────────────────────────────

  const createClient = useCallback(async (name: string, slug: string) => {
    if (!supabaseAdmin) return false
    const { error } = await supabaseAdmin.from('clients').insert({ name, slug })
    if (error) return false
    try {
      setError(null)
      await fetchClients()
      await reloadAppStores()
      return true
    } catch (err) {
      setError(toSafeUiErrorMessage(err instanceof Error ? err.message : null))
      return false
    }
  }, [fetchClients, reloadAppStores, setError])

  const updateClient = useCallback(async (id: string, name: string, slug: string) => {
    if (!supabaseAdmin) return false
    const { error } = await supabaseAdmin.from('clients').update({ name, slug }).eq('id', id)
    if (error) return false
    try {
      setError(null)
      await fetchClients()
      await reloadAppStores()
      return true
    } catch (err) {
      setError(toSafeUiErrorMessage(err instanceof Error ? err.message : null))
      return false
    }
  }, [fetchClients, reloadAppStores, setError])

  const deleteClient = useCallback(async (id: string, name: string) => {
    if (!supabaseAdmin) return false
    const deletedClient = clients.find(client => client.id === id)
    const { error } = await supabaseAdmin.from('clients').delete().eq('id', id)
    if (error) return false

    if (actorUserId) {
      await supabaseAdmin.from('audit_logs').insert({
        user_id: actorUserId,
        client_id: deletedClient?.id ?? id,
        entity: 'client',
        entity_id: id,
        entity_name: deletedClient?.name ?? name,
        action: 'delete',
        field: null,
        from_value: null,
        to_value: null,
      })
    }

    try {
      setError(null)
      await fetchClients()
      await reloadAppStores()
      return true
    } catch (err) {
      setError(toSafeUiErrorMessage(err instanceof Error ? err.message : null))
      return false
    }
  }, [actorUserId, clients, fetchClients, reloadAppStores, setError])

  // ── Vínculo user ↔ client ────────────────────────────────────────────────────

  const linkUserToClient = useCallback(async (userId: string, clientId: string) => {
    if (!supabaseAdmin) return false
    const { error } = await supabaseAdmin
      .from('user_clients')
      .upsert({ user_id: userId, client_id: clientId })
    if (error) return false
    try {
      setError(null)
      await fetchUsers()
      await fetchUserClientsMap()
      await reloadAppStores()
      return true
    } catch (err) {
      setError(toSafeUiErrorMessage(err instanceof Error ? err.message : null))
      return false
    }
  }, [fetchUsers, fetchUserClientsMap, reloadAppStores, setError])

  const unlinkUserFromClient = useCallback(async (userId: string, clientId: string) => {
    if (!supabaseAdmin) return false
    const { error } = await supabaseAdmin
      .from('user_clients')
      .delete()
      .match({ user_id: userId, client_id: clientId })
    if (error) return false
    try {
      setError(null)
      await fetchUsers()
      await fetchUserClientsMap()
      await reloadAppStores()
      return true
    } catch (err) {
      setError(toSafeUiErrorMessage(err instanceof Error ? err.message : null))
      return false
    }
  }, [fetchUsers, fetchUserClientsMap, reloadAppStores, setError])

  // ── CRUD users ───────────────────────────────────────────────────────────────

  const setUserRole = useCallback(async (userId: string, role: 'admin' | 'user') => {
    if (!supabaseAdmin) return false
    const { error } = await supabaseAdmin
      .from('members')
      .update({ access_role: role })
      .eq('id', userId)
    if (error) return false
    try {
      setError(null)
      await fetchUsers()
      await reloadAppStores()
      return true
    } catch (err) {
      setError(toSafeUiErrorMessage(err instanceof Error ? err.message : null))
      return false
    }
  }, [fetchUsers, reloadAppStores, setError])

  const createUser = useCallback(async (
    name: string,
    role: string,
    authUserId?: string | null,
    accessRole?: 'admin' | 'user',
    clientIds?: string[],
    email?: string | null,
    avatarUrl?: string | null
  ) => {
    if (!supabaseAdmin) return false
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    const { data: member, error: memberErr } = await supabaseAdmin.from('members').insert({
      name,
      role,
      avatar: initials,
      auth_user_id: authUserId ?? null,
      access_role: accessRole ?? 'user',
      email: email ?? null,
      avatar_url: avatarUrl ?? null,
    }).select().single()

    if (memberErr || !member) return false

    if (clientIds && clientIds.length > 0) {
      const userClientRows = clientIds.map(cid => ({ user_id: member.id, client_id: cid }))
      await supabaseAdmin.from('user_clients').insert(userClientRows)
    }

    try {
      await fetchUsers()
      await fetchUserClientsMap()
      if (authUserId) await fetchPendingUsers()
      setError(null)
      await reloadAppStores()
      return true
    } catch (err) {
      setError(toSafeUiErrorMessage(err instanceof Error ? err.message : null))
      return false
    }
  }, [fetchUsers, fetchUserClientsMap, fetchPendingUsers, reloadAppStores, setError])

  const setUserAuthId = useCallback(async (userId: string, authUserId: string | null, avatarUrl?: string | null) => {
    if (!supabaseAdmin) return false
    const { error } = await supabaseAdmin
      .from('members')
      .update({ auth_user_id: authUserId, avatar_url: avatarUrl ?? null })
      .eq('id', userId)
    if (error) return false
    try {
      setError(null)
      await fetchUsers()
      await fetchPendingUsers()
      await reloadAppStores()
      return true
    } catch (err) {
      setError(toSafeUiErrorMessage(err instanceof Error ? err.message : null))
      return false
    }
  }, [fetchUsers, fetchPendingUsers, reloadAppStores, setError])

  const updateUser = useCallback(async (
    userId: string,
    name: string,
    role: string,
    email?: string | null
  ) => {
    if (!supabaseAdmin) return false
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    const { error } = await supabaseAdmin
      .from('members')
      .update({ name, role, email: email ?? null, avatar: initials })
      .eq('id', userId)
    if (error) return false
    try {
      setError(null)
      await fetchUsers()
      await reloadAppStores()
      return true
    } catch (err) {
      setError(toSafeUiErrorMessage(err instanceof Error ? err.message : null))
      return false
    }
  }, [fetchUsers, reloadAppStores, setError])

  const deactivateUser = useCallback(async (userId: string) => {
    if (!supabaseAdmin) return false
    const deactivated_at = new Date().toISOString()
    const { error } = await supabaseAdmin
      .from('members')
      .update({ is_active: false, deactivated_at })
      .eq('id', userId)
    if (error) {
      console.error('[deactivateUser] error:', error)
      return false
    }
    patchUser(userId, { is_active: false, deactivated_at })
    return true
  }, [patchUser])

  const reactivateUser = useCallback(async (userId: string) => {
    if (!supabaseAdmin) return false
    const { error } = await supabaseAdmin
      .from('members')
      .update({ is_active: true, deactivated_at: null })
      .eq('id', userId)
    if (error) {
      console.error('[reactivateUser] error:', error)
      return false
    }
    patchUser(userId, { is_active: true, deactivated_at: null })
    return true
  }, [patchUser])

  const listGoogleUsers = useCallback(async (search?: string) => {
    if (!supabaseAdmin) return []
    const { data, error } = await supabaseAdmin.auth.admin.listUsers()
    if (error || !data) return []
    let users = data.users.filter(u => u.email)
    if (search) {
      const lower = search.toLowerCase()
      users = users.filter(u =>
        u.email?.toLowerCase().includes(lower) ||
        u.user_metadata?.full_name?.toLowerCase().includes(lower)
      )
    }
    return users.slice(0, 20).map(u => ({
      id: u.id,
      email: u.email!,
      avatarUrl: u.user_metadata?.avatar_url ?? null,
      name: u.user_metadata?.full_name ?? u.email!.split('@')[0],
    }))
  }, [])

  return {
    clients, users, auditLogs, loading, loadingInitial, error, userClientsMap, pendingUsers,
    refreshAll,
    fetchAuditLogs, fetchClients, fetchUsers,
    createClient, updateClient, deleteClient,
    linkUserToClient, unlinkUserFromClient, setUserRole,
    createUser, setUserAuthId, updateUser, deactivateUser, reactivateUser, listGoogleUsers,
  }
}

