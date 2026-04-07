import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import type { Task, Step, StepType } from '@/lib/steps'
import type { DbTaskRow } from '@/types/db'

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

interface TaskState {
  tasks: Task[]
  loading: boolean
  error: string | null
  cachedClientId: string | null | undefined

  fetchTasks(clientId: string | null | undefined, isAdmin: boolean): Promise<void>
  invalidate(): void
}

export const useTaskStore = create<TaskState>()(devtools((set, get) => ({
  tasks: [],
  loading: false,
  error: null,
  cachedClientId: undefined,

  fetchTasks: async (clientId, isAdmin) => {
    if (clientId === undefined) return

    const state = get()
    if (
      clientId === state.cachedClientId &&
      state.tasks.length > 0 &&
      !state.loading
    ) return

    set({ loading: true, error: null })

    try {
      const tasks = await fetchTasksFromDb(clientId, isAdmin)
      set({ tasks, cachedClientId: clientId, loading: false })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Erro ao carregar tarefas',
        loading: false,
      })
    }
  },

  invalidate: () => {
    set({ tasks: [], cachedClientId: undefined, error: null })
  },
}), { name: 'TaskStore' }))
