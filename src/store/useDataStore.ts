import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import type { Task, Step, StepType } from '@/lib/steps'
import type { DbTaskRow } from '@/types/db'
import type { Member } from '@/hooks/useSupabase'

// ─── Mappers ──────────────────────────────────────────────────────────────────

function dbRowToTask(row: DbTaskRow): Task {
  const steps: Step[] = (row.task_steps ?? [])
    .sort((a, b) => a.step_order - b.step_order)
    .map(s => ({
      id: s.id,
      type: s.type as StepType,
      order: s.step_order,
      active: s.active,
      start: s.start_date ?? '',
      end: s.end_date ?? '',
      assignees: (s.step_assignees ?? []).map((a: { member_id: string }) => a.member_id),
    }))

  return {
    id: row.id,
    title: row.title,
    clickupLink: row.clickup_link ?? undefined,
    clientId: row.client_id ?? undefined,
    status: {
      blocked: row.blocked,
      blockedAt: row.blocked_at ?? undefined,
    },
    createdAt: row.created_at,
    steps,
  }
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchTasksFromDb(
  clientId: string | null,
  isAdmin: boolean
): Promise<Task[]> {
  let query = supabase
    .from('tasks')
    .select(`
      id, title, clickup_link, blocked, blocked_at, created_at, client_id,
      task_steps (
        id, type, step_order, active, start_date, end_date,
        step_assignees ( member_id )
      )
    `)
    .order('created_at', { ascending: false })

  if (!isAdmin || clientId) {
    const ids = clientId ? [clientId] : []
    if (ids.length > 0) {
      query = query.in('client_id', ids)
    } else if (!isAdmin) {
      return []
    }
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map(dbRowToTask)
}

async function fetchMembersFromDb(): Promise<Member[]> {
  const { data, error } = await supabase
    .from('members')
    .select('id, name, role, avatar, avatar_url, email, auth_user_id, access_role')
    .order('name')

  if (error) throw new Error(error.message)
  return data ?? []
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface DataState {
  tasks: Task[]
  members: Member[]
  loading: boolean
  error: string | null
  cachedClientId: string | null | undefined

  fetchData: (clientId: string | null | undefined, isAdmin: boolean) => Promise<void>
  invalidate: () => void
}

export const useDataStore = create<DataState>()(devtools((set, get) => ({
  tasks: [],
  members: [],
  loading: false,
  error: null,
  cachedClientId: undefined,

  fetchData: async (clientId, isAdmin) => {
    // Guard: não fetcha se clientId ainda não está resolvido
    if (clientId === undefined) return

    // Cache hit: já temos dados deste cliente
    const state = get()
    if (
      clientId === state.cachedClientId &&
      state.tasks.length > 0 &&
      !state.loading
    ) return

    set({ loading: true, error: null })

    try {
      const [tasks, members] = await Promise.all([
        fetchTasksFromDb(clientId, isAdmin),
        fetchMembersFromDb(),
      ])
      set({ tasks, members, cachedClientId: clientId, loading: false })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Erro ao carregar dados',
        loading: false,
      })
    }
  },

  invalidate: () => {
    set({ tasks: [], members: [], cachedClientId: undefined, error: null })
  },
}), { name: 'DataStore' }))
