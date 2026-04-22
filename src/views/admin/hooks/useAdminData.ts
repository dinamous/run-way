import { useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toSafeUiErrorMessage } from '@/lib/errorSanitizer'
import { useAdminStore } from '@/store/useAdminStore'
import {
  adminCreateClient,
  adminUpdateClient,
  adminDeleteClient,
  adminCreateMember,
  adminUpdateMember,
  adminDeactivateMember,
  adminReactivateMember,
  adminSetMemberAuthId,
  adminLinkUserToClient,
  adminUnlinkUserFromClient,
  adminSetUserRole,
  adminListAuthUsers,
  type CreateMemberPayload,
  type GoogleUser,
} from '@/lib/adminApi'
import type { AuditFilters } from '@/store/useAdminStore'

export type { AuditFilters }
export type PendingAuthUser = import('@/lib/adminApi').PendingAuthUser

interface UseAdminDataOptions {
  actorUserId?: string | null
}

export function useAdminData(options: UseAdminDataOptions = {}) {
  const { actorUserId } = options
  const queryClient = useQueryClient()

  const {
    clients, users, auditLogs, loading, loadingInitial, error,
    userClientsMap, pendingUsers, initialized,
    fetchClients, fetchUsers, fetchUserClientsMap, fetchPendingUsers,
    fetchAuditLogs, refreshAll, patchUser, setError,
  } = useAdminStore()

  useEffect(() => {
    if (!initialized && !loadingInitial && !error) {
      refreshAll()
    }
  }, [initialized, loadingInitial, error, refreshAll])

  const reloadAppStores = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
    queryClient.invalidateQueries({ queryKey: ['members'] })
  }, [queryClient])

  // ── CRUD clients ────────────────────────────────────────────────────────────

  const createClient = useCallback(async (name: string, slug: string) => {
    try {
      await adminCreateClient(name, slug)
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
    try {
      await adminUpdateClient(id, name, slug)
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
    try {
      await adminDeleteClient(id, name, actorUserId ?? undefined)
      setError(null)
      await fetchClients()
      await reloadAppStores()
      return true
    } catch (err) {
      setError(toSafeUiErrorMessage(err instanceof Error ? err.message : null))
      return false
    }
  }, [actorUserId, fetchClients, reloadAppStores, setError])

  // ── Vínculo user ↔ client ────────────────────────────────────────────────────

  const linkUserToClient = useCallback(async (userId: string, clientId: string) => {
    try {
      await adminLinkUserToClient(userId, clientId)
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
    try {
      await adminUnlinkUserFromClient(userId, clientId)
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
    try {
      await adminSetUserRole(userId, role)
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
    avatarUrl?: string | null,
  ) => {
    const payload: CreateMemberPayload = { name, role, authUserId, accessRole, clientIds, email, avatarUrl }
    try {
      await adminCreateMember(payload)
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
    try {
      await adminSetMemberAuthId(userId, authUserId, avatarUrl)
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

  const updateUser = useCallback(async (userId: string, name: string, role: string, email?: string | null) => {
    try {
      await adminUpdateMember(userId, name, role, email)
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
    try {
      const { deactivated_at } = await adminDeactivateMember(userId)
      patchUser(userId, { is_active: false, deactivated_at })
      return true
    } catch (err) {
      console.error('[deactivateUser] error:', err)
      return false
    }
  }, [patchUser])

  const reactivateUser = useCallback(async (userId: string) => {
    try {
      await adminReactivateMember(userId)
      patchUser(userId, { is_active: true, deactivated_at: null })
      return true
    } catch (err) {
      console.error('[reactivateUser] error:', err)
      return false
    }
  }, [patchUser])

  const listGoogleUsers = useCallback(async (search?: string): Promise<GoogleUser[]> => {
    try {
      return await adminListAuthUsers(search)
    } catch {
      return []
    }
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
