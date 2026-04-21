import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { supabaseAdmin } from '@/lib/supabase'
import type { DbClientRow, DbAuditLogRow } from '@/types/db'
import type { Member } from '@/hooks/useSupabase'
export interface PendingAuthUser {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  lastSignInAt: string | null
}

export interface AuditFilters {
  clientId?: string
  entityName?: string
  entity?: string
  userId?: string
  from?: string   // YYYY-MM-DD
  to?: string     // YYYY-MM-DD
}
import { toSafeUiErrorMessage } from '@/lib/errorSanitizer'
import { DbClientRowSchema, DbMemberRowSchema, DbUserClientMapRowSchema } from '@/lib/validators'

const ALLOWED_DOMAIN = import.meta.env.VITE_ALLOWED_DOMAIN as string | undefined

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
        if (!supabaseAdmin) return
        const { data, error } = await supabaseAdmin
          .from('clients')
          .select('*')
          .order('name')
        if (error) throw new Error(error.message)
        set({ clients: (data ?? []).map(r => DbClientRowSchema.parse(r)) })
      },

      fetchUsers: async () => {
        if (!supabaseAdmin) return
        const { data, error } = await supabaseAdmin
          .from('members')
          .select('id, name, role, avatar, avatar_url, email, auth_user_id, access_role, is_active, created_at, deactivated_at')
          .order('name')
        if (error) throw new Error(error.message)
        set({ users: (data ?? []).map(r => DbMemberRowSchema.parse(r)) as Member[] })
      },

      fetchUserClientsMap: async () => {
        if (!supabaseAdmin) return
        const { data, error } = await supabaseAdmin
          .from('user_clients')
          .select('user_id, client_id')
        if (error) throw new Error(error.message)
        const map: Record<string, string[]> = {}
        ;(data ?? []).map(r => DbUserClientMapRowSchema.parse(r)).forEach(({ user_id, client_id }) => {
          if (!map[user_id]) map[user_id] = []
          map[user_id].push(client_id)
        })
        set({ userClientsMap: map })
      },

      fetchPendingUsers: async () => {
        if (!supabaseAdmin) return
        const { data, error } = await supabaseAdmin.auth.admin.listUsers()
        if (error || !data) return

        const { data: members } = await supabaseAdmin
          .from('members')
          .select('auth_user_id')
        const linkedAuthIds = new Set((members ?? []).map(m => m.auth_user_id).filter(Boolean))

        const pending: PendingAuthUser[] = []
        for (const u of data.users) {
          if (!u.email) continue
          const domain = u.email.split('@')[1]
          if (ALLOWED_DOMAIN && domain !== ALLOWED_DOMAIN) continue
          if (linkedAuthIds.has(u.id)) continue
          pending.push({
            id: u.id,
            email: u.email,
            name: u.user_metadata?.full_name ?? u.email.split('@')[0],
            avatarUrl: u.user_metadata?.avatar_url ?? null,
            lastSignInAt: u.last_sign_in_at ?? null,
          })
        }
        set({ pendingUsers: pending })
      },

      fetchAuditLogs: async (filters: AuditFilters = {}) => {
        if (!supabaseAdmin) return
        set({ loading: true })

        let query = supabaseAdmin
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200)

        if (filters.clientId)    query = query.eq('client_id', filters.clientId)
        if (filters.entity)      query = query.eq('entity', filters.entity)
        if (filters.userId)      query = query.eq('user_id', filters.userId)
        if (filters.entityName)  query = query.ilike('entity_name', `%${filters.entityName}%`)
        if (filters.from)        query = query.gte('created_at', `${filters.from}T00:00:00Z`)
        if (filters.to)          query = query.lte('created_at', `${filters.to}T23:59:59Z`)

        const { data, error } = await query
        if (error) {
          set({ error: toSafeUiErrorMessage(error.message), loading: false })
          return
        }
        set({ auditLogs: data ?? [], loading: false, error: null })
      },

      refreshAll: async () => {
        if (!supabaseAdmin) {
          set({ loadingInitial: false })
          return
        }
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
