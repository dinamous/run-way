import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Task, Step, StepType } from '@/lib/steps'
import type { DbTaskRow, LocalStorageTaskEntry } from '@/types/db'

const devLog = import.meta.env.DEV
  ? (...args: unknown[]) => console.warn(...args)
  : () => undefined

export interface Member {
  id: string
  name: string
  role: string
  avatar: string
  auth_user_id?: string | null
  access_role?: 'admin' | 'user'
}

// ─── Mappers ────────────────────────────────────────────────────────────────

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
      assignees: (s.step_assignees ?? []).map(a => a.member_id),
    }))

  return {
    id: row.id,
    title: row.title,
    clickupLink: row.clickup_link ?? undefined,
    status: {
      blocked: row.blocked,
      blockedAt: row.blocked_at ?? undefined,
    },
    createdAt: row.created_at,
    steps,
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSupabase() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const migrationRan = useRef(false)

  // ── Fetch all tasks with nested steps + assignees ──────────────────────────
  const fetchTasks = useCallback(async (): Promise<boolean> => {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        id, title, clickup_link, blocked, blocked_at, created_at,
        task_steps (
          id, type, step_order, active, start_date, end_date,
          step_assignees ( member_id )
        )
      `)
      .order('created_at', { ascending: false })

    if (error) { setError(error.message); return false }
    setTasks((data ?? []).map(dbRowToTask))
    setError(null)
    return true
  }, [])

  // ── Fetch members ──────────────────────────────────────────────────────────
  const fetchMembers = useCallback(async (): Promise<boolean> => {
    const { data, error } = await supabase
      .from('members')
      .select('id, name, role, avatar')
      .order('name')

    if (error) { setError(error.message); return false }
    setMembers(data ?? [])
    setError(null)
    return true
  }, [])

  useEffect(() => {
    Promise.all([fetchTasks(), fetchMembers()]).finally(() => setLoading(false))
  }, [fetchTasks, fetchMembers])

  // ── Migrate localStorage data (one-time) ───────────────────────────────────
  useEffect(() => {
    if (migrationRan.current || members.length === 0) return

    const raw = localStorage.getItem('capacity-tasks')
    if (!raw) return

    let parsed: LocalStorageTaskEntry[]
    try { parsed = JSON.parse(raw) as LocalStorageTaskEntry[] } catch { return }
    if (!Array.isArray(parsed) || parsed.length === 0) return

    migrationRan.current = true

    const idMap: Record<string, string> = {}
    members.forEach(m => {
      if (m.avatar === 'AD') idMap['1'] = m.id
      if (m.avatar === 'MT') idMap['2'] = m.id
    })

    const migrate = async () => {
      try {
        for (const raw of parsed) {
          if (/^[0-9a-f-]{36}$/.test(raw.id ?? '')) continue

          const statusObj = typeof raw.status === 'object' ? raw.status : undefined
          const { data: taskRow, error: taskErr } = await supabase
            .from('tasks')
            .insert({
              title: raw.title ?? 'Sem título',
              clickup_link: raw.clickupLink ?? null,
              blocked: statusObj?.blocked ?? false,
              blocked_at: statusObj?.blockedAt ?? null,
              created_at: raw.createdAt ?? new Date().toISOString(),
            })
            .select('id')
            .single()

          if (taskErr || !taskRow) continue

          const steps = raw.steps ?? []
          for (const step of steps) {
            const { data: stepRow, error: stepErr } = await supabase
              .from('task_steps')
              .insert({
                task_id: taskRow.id,
                type: step.type,
                step_order: step.order,
                active: step.active,
                start_date: step.start || null,
                end_date: step.end || null,
              })
              .select('id')
              .single()

            if (stepErr || !stepRow) continue

            const assignees = (step.assignees ?? []).map(
              (aid: string) => idMap[aid] ?? aid
            )
            if (assignees.length > 0) {
              await supabase.from('step_assignees').insert(
                assignees.map((mid: string) => ({ step_id: stepRow.id, member_id: mid }))
              )
            }
          }
        }

        localStorage.removeItem('capacity-tasks')
        await fetchTasks()
      } catch (err) {
        devLog('[migration] Erro ao migrar dados do localStorage:', err)
      }
    }

    migrate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members])

  // ── Upsert steps helper ───────────────────────────────────────────────────
  async function upsertSteps(taskId: string, steps: Step[]): Promise<boolean> {
    for (const step of steps) {
      const isNew = !step.id

      let stepId: string

      if (isNew) {
        const { data, error } = await supabase
          .from('task_steps')
          .insert({
            task_id: taskId,
            type: step.type,
            step_order: step.order,
            active: step.active,
            start_date: step.start || null,
            end_date: step.end || null,
          })
          .select('id')
          .single()

        if (error || !data) {
          devLog('[upsertSteps] Erro ao inserir step:', error?.message)
          return false
        }
        stepId = data.id
      } else {
        const { error } = await supabase
          .from('task_steps')
          .update({
            type: step.type,
            step_order: step.order,
            active: step.active,
            start_date: step.start || null,
            end_date: step.end || null,
          })
          .eq('id', step.id)

        if (error) {
          devLog('[upsertSteps] Erro ao atualizar step:', error.message)
          return false
        }
        stepId = step.id
      }

      await supabase.from('step_assignees').delete().eq('step_id', stepId)
      if (step.assignees.length > 0) {
        const { error: assigneeErr } = await supabase.from('step_assignees').insert(
          step.assignees.map(mid => ({ step_id: stepId, member_id: mid }))
        )
        if (assigneeErr) {
          devLog('[upsertSteps] Erro ao inserir assignees:', assigneeErr.message)
          return false
        }
      }
    }
    return true
  }

  // ── Create task ────────────────────────────────────────────────────────────
  const createTask = async (taskData: Omit<Task, 'id' | 'createdAt'>): Promise<boolean> => {
    const { data: taskRow, error: taskErr } = await supabase
      .from('tasks')
      .insert({
        title: taskData.title,
        clickup_link: taskData.clickupLink ?? null,
        blocked: taskData.status.blocked,
        blocked_at: taskData.status.blockedAt ?? null,
      })
      .select('id')
      .single()

    if (taskErr || !taskRow) {
      setError(taskErr?.message ?? 'Erro ao criar tarefa')
      return false
    }

    const ok = await upsertSteps(taskRow.id, taskData.steps)
    if (!ok) {
      setError('Tarefa criada mas erro ao guardar etapas')
      await fetchTasks()
      return false
    }

    setError(null)
    await fetchTasks()
    return true
  }

  // ── Update task ────────────────────────────────────────────────────────────
  const updateTask = async (taskData: Task): Promise<boolean> => {
    // Optimistic update: apply locally first, sync in background
    const previousTasks = tasks
    setTasks(prev => prev.map(t => t.id === taskData.id ? taskData : t))

    const { error: taskErr } = await supabase
      .from('tasks')
      .update({
        title: taskData.title,
        clickup_link: taskData.clickupLink ?? null,
        blocked: taskData.status.blocked,
        blocked_at: taskData.status.blockedAt ?? null,
      })
      .eq('id', taskData.id)

    if (taskErr) {
      setError(taskErr.message)
      setTasks(previousTasks)
      return false
    }

    // Delete only steps that were removed by the user
    const keptIds = taskData.steps.map(s => s.id).filter(Boolean)
    if (keptIds.length > 0) {
      const { error: deleteErr } = await supabase
        .from('task_steps')
        .delete()
        .eq('task_id', taskData.id)
        .not('id', 'in', `(${keptIds.join(',')})`)

      if (deleteErr) {
        setError(deleteErr.message)
        setTasks(previousTasks)
        return false
      }
    } else {
      // No steps kept — delete all
      const { error: deleteErr } = await supabase
        .from('task_steps')
        .delete()
        .eq('task_id', taskData.id)

      if (deleteErr) {
        setError(deleteErr.message)
        setTasks(previousTasks)
        return false
      }
    }

    const ok = await upsertSteps(taskData.id, taskData.steps)
    if (!ok) {
      setError('Tarefa atualizada mas erro ao guardar etapas')
      await fetchTasks()
      return false
    }

    setError(null)
    return true
  }

  // ── Delete task ────────────────────────────────────────────────────────────
  const deleteTask = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) {
      setError(error.message)
      return false
    }
    setError(null)
    setTasks(prev => prev.filter(t => t.id !== id))
    return true
  }

  return { tasks, members, loading, error, createTask, updateTask, deleteTask }
}
