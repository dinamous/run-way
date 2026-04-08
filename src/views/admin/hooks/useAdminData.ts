import { useState, useEffect, useCallback } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import type { DbClientRow, DbAuditLogRow } from '@/types/db'
import type { Member } from '@/hooks/useSupabase'
import { toSafeUiErrorMessage } from '@/lib/errorSanitizer'
import { useTaskStore } from '@/store/useTaskStore'
import { useMemberStore } from '@/store/useMemberStore'
import { useClientStore } from '@/store/useClientStore'

export interface AuditFilters {
  clientId?: string
  entityName?: string
  entity?: string
  userId?: string
  from?: string   // YYYY-MM-DD
  to?: string     // YYYY-MM-DD
}

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

  const [clients, setClients] = useState<DbClientRow[]>([])
  const [users, setUsers] = useState<Member[]>([])
  const [auditLogs, setAuditLogs] = useState<DbAuditLogRow[]>([])
  const [userClientsMap, setUserClientsMap] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClients = useCallback(async () => {
    if (!supabaseAdmin) return
    const { data, error: queryError } = await supabaseAdmin
      .from('clients')
      .select('*')
      .order('name')
    if (queryError) throw new Error(queryError.message)
    setClients(data ?? [])
  }, [])

  const fetchUsers = useCallback(async () => {
    if (!supabaseAdmin) return
    const { data, error: queryError } = await supabaseAdmin
      .from('members')
      .select('id, name, role, avatar, avatar_url, email, auth_user_id, access_role')
      .order('name')
    if (queryError) throw new Error(queryError.message)
    setUsers(data ?? [])
  }, [])

  const fetchUserClientsMap = useCallback(async () => {
    if (!supabaseAdmin) return
    const { data, error: queryError } = await supabaseAdmin
      .from('user_clients')
      .select('user_id, client_id')
    if (queryError) throw new Error(queryError.message)
    const map: Record<string, string[]> = {}
    ;(data ?? []).forEach(({ user_id, client_id }) => {
      if (!map[user_id]) map[user_id] = []
      map[user_id].push(client_id)
    })
    setUserClientsMap(map)
  }, [])

  const fetchAuditLogs = useCallback(async (filters: AuditFilters = {}) => {
    if (!supabaseAdmin) return
    setLoading(true)

    let query = supabaseAdmin
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    if (filters.clientId) query = query.eq('client_id', filters.clientId)
    if (filters.entity)   query = query.eq('entity', filters.entity)
    if (filters.userId)   query = query.eq('user_id', filters.userId)
    if (filters.entityName) query = query.ilike('entity_name', `%${filters.entityName}%`)
    if (filters.from) query = query.gte('created_at', `${filters.from}T00:00:00Z`)
    if (filters.to)   query = query.lte('created_at', `${filters.to}T23:59:59Z`)

    const { data, error: queryError } = await query
    if (queryError) {
      setError(toSafeUiErrorMessage(queryError.message))
      setLoading(false)
      return
    }
    setError(null)
    setAuditLogs(data ?? [])
    setLoading(false)
  }, [])

  const refreshAll = useCallback(async () => {
    if (!supabaseAdmin) {
      setLoadingInitial(false)
      return
    }

    setLoadingInitial(true)
    setError(null)
    try {
      await Promise.all([fetchClients(), fetchUsers(), fetchUserClientsMap()])
    } catch (err) {
      setError(toSafeUiErrorMessage(err instanceof Error ? err.message : null))
    } finally {
      setLoadingInitial(false)
    }
  }, [fetchClients, fetchUsers, fetchUserClientsMap])

  const reloadAppStores = useCallback(async () => {
    invalidateTasks()
    invalidateMembers()

    await Promise.all([
      fetchTasks(selectedClientId, true),
      fetchMembers(selectedClientId),
    ])
  }, [fetchMembers, fetchTasks, invalidateMembers, invalidateTasks, selectedClientId])

  // CRUD clients
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
  }, [fetchClients, reloadAppStores])

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
  }, [fetchClients, reloadAppStores])

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
  }, [actorUserId, clients, fetchClients, reloadAppStores])

  // Vínculo user ↔ client
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
  }, [fetchUsers, fetchUserClientsMap, reloadAppStores])

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
  }, [fetchUsers, fetchUserClientsMap, reloadAppStores])

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
  }, [fetchUsers, reloadAppStores])

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
      setError(null)
      await reloadAppStores()
      return true
    } catch (err) {
      setError(toSafeUiErrorMessage(err instanceof Error ? err.message : null))
      return false
    }
  }, [fetchUsers, fetchUserClientsMap, reloadAppStores])

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
      await reloadAppStores()
      return true
    } catch (err) {
      setError(toSafeUiErrorMessage(err instanceof Error ? err.message : null))
      return false
    }
  }, [fetchUsers, reloadAppStores])

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
  }, [fetchUsers, reloadAppStores])

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

  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  return {
    clients, users, auditLogs, loading, loadingInitial, error, userClientsMap,
    refreshAll,
    fetchAuditLogs, fetchClients, fetchUsers,
    createClient, updateClient, deleteClient,
    linkUserToClient, unlinkUserFromClient, setUserRole,
    createUser, setUserAuthId, updateUser, listGoogleUsers,
  }
}
