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
    concludedAt: row.concluded_at ?? undefined,
    concludedBy: row.concluded_by ?? undefined,
    steps,
  }
}

async function fetchTasksFromDb(
  clientId: string | null,
  isAdmin: boolean
): Promise<Task[]> {
  if (clientId === null) {
    if (!isAdmin) return []
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        id, title, clickup_link, blocked, blocked_at, created_at, client_id, concluded_at, concluded_by,
        task_steps (
          id, type, step_order, active, start_date, end_date,
          step_assignees ( member_id )
        )
      `)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map(dbRowToTask)
  }

  const { data, error } = await supabase
    .from('tasks')
    .select(`
      id, title, clickup_link, blocked, blocked_at, created_at, client_id, concluded_at, concluded_by,
      task_steps (
        id, type, step_order, active, start_date, end_date,
        step_assignees ( member_id )
      )
    `)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map(dbRowToTask)
}

interface TaskState {
  tasks: Task[]
  loading: boolean
  error: string | null
  cacheKey: string | undefined  // `${clientId ?? 'all'}:${isAdmin}`
}

interface TaskActions {
  fetchTasks: (clientId: string | null | undefined, isAdmin: boolean) => Promise<void>
  invalidate: () => void
}

type TaskStore = TaskState & TaskActions

export const useTaskStore = create<TaskStore>()(
  devtools(
    (set, get) => ({
      tasks: [],
      loading: false,
      error: null,
      cacheKey: undefined,

      fetchTasks: async (clientId, isAdmin) => {
        if (clientId === undefined) return

        const state = get()
        if (state.loading) return

        const key = `${clientId ?? 'all'}:${isAdmin}`
        if (state.cacheKey === key && state.tasks.length > 0) return

        set({ loading: true, error: null })
        try {
          const tasks = await fetchTasksFromDb(clientId, isAdmin)
          set({ tasks, cacheKey: key, loading: false })
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Erro ao carregar tarefas',
            loading: false,
          })
        }
      },

      invalidate: () => {
        set({ tasks: [], cacheKey: undefined, error: null })
      },
    }),
    { name: 'app/tasks', enabled: true }
  )
)
