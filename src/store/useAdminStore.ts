import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { DbClientRow, DbAuditLogRow } from '@/types/db'
import type { Member } from '@/hooks/useSupabase'
import {
  adminFetchClients,
  adminFetchMembers,
  adminFetchUserClientsMap,
  adminListPendingUsers,
  adminFetchAuditLogs,
  type PendingAuthUser,
} from '@/lib/adminApi'
import { toSafeUiErrorMessage } from '@/lib/errorSanitizer'
import { DbClientRowSchema, DbMemberRowSchema, DbUserClientMapRowSchema } from '@/lib/validators'

export type { PendingAuthUser }

export interface AuditFilters {
  clientId?: string
  entityName?: string
  entity?: string
  userId?: string
  from?: string
  to?: string
}

interface AdminState {
  clients: DbClientRow[]
  users: Member[]
  auditLogs: DbAuditLogRow[]
  userClientsMap: Record<string, string[]>
  pendingUsers: PendingAuthUser[]
  loading: boolean
  loadingInitial: boolean
  error: string | null
  initialized: boolean
}

interface AdminActions {
  fetchClients: () => Promise<void>
  fetchUsers: () => Promise<void>
  fetchUserClientsMap: () => Promise<void>
  fetchPendingUsers: () => Promise<void>
  fetchAuditLogs: (filters?: AuditFilters) => Promise<void>
  refreshAll: () => Promise<void>
  patchUser: (userId: string, patch: Partial<Member>) => void
  patchUserClientsMap: (userId: string, clientId: string, action: 'add' | 'remove') => void
  setError: (error: string | null) => void
  invalidate: () => void
}

type AdminStore = AdminState & AdminActions

export const useAdminStore = create<AdminStore>()(
  devtools(
    (set, get) => ({
      clients: [],
      users: [],
      auditLogs: [],
      userClientsMap: {},
      pendingUsers: [],
      loading: false,
      loadingInitial: false,
      error: null,
      initialized: false,

      patchUser: (userId, patch) =>
        set((state) => ({
          users: state.users.map((u) => u.id === userId ? { ...u, ...patch } : u),
        })),

      patchUserClientsMap: (userId, clientId, action) =>
        set((state) => {
          const current = state.userClientsMap[userId] ?? []
          const updated = action === 'add'
            ? current.includes(clientId) ? current : [...current, clientId]
            : current.filter(id => id !== clientId)
          return { userClientsMap: { ...state.userClientsMap, [userId]: updated } }
        }),

      setError: (error) => set({ error }),

      invalidate: () => set({
        clients: [],
        users: [],
        auditLogs: [],
        userClientsMap: {},
        pendingUsers: [],
        initialized: false,
        error: null,
      }),

      fetchClients: async () => {
        const data = await adminFetchClients()
        set({ clients: data.map(r => DbClientRowSchema.parse(r)) })
      },

      fetchUsers: async () => {
        const data = await adminFetchMembers()
        set({ users: data.map(r => DbMemberRowSchema.parse(r)) as Member[] })
      },

      fetchUserClientsMap: async () => {
        const raw = await adminFetchUserClientsMap()
        const map: Record<string, string[]> = {}
        for (const [userId, clientIds] of Object.entries(raw)) {
          map[userId] = clientIds
        }
        // re-validate via existing schema if needed
        set({ userClientsMap: map })
      },

      fetchPendingUsers: async () => {
        const pending = await adminListPendingUsers()
        set({ pendingUsers: pending })
      },

      fetchAuditLogs: async (filters: AuditFilters = {}) => {
        set({ loading: true })
        try {
          const data = await adminFetchAuditLogs(filters)
          set({ auditLogs: data ?? [], loading: false, error: null })
        } catch (err) {
          set({ error: toSafeUiErrorMessage(err instanceof Error ? err.message : null), loading: false })
        }
      },

      refreshAll: async () => {
        if (get().loadingInitial) return
        set({ loadingInitial: true, error: null })
        try {
          const { fetchClients, fetchUsers, fetchUserClientsMap, fetchPendingUsers } = get()
          await Promise.all([fetchClients(), fetchUsers(), fetchUserClientsMap(), fetchPendingUsers()])
          set({ initialized: true })
        } catch (err) {
          set({ error: toSafeUiErrorMessage(err instanceof Error ? err.message : null) })
        } finally {
          set({ loadingInitial: false })
        }
      },
    }),
    { name: 'app/admin', enabled: true }
  )
)
