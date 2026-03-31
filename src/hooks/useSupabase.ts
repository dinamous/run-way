import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Task, Step, StepType } from '../lib/steps'

export interface Member {
  id: string
  name: string
  role: string
  avatar: string
}

// ─── Mappers ────────────────────────────────────────────────────────────────

function dbRowToTask(row: any): Task {
  const steps: Step[] = (row.task_steps ?? [])
    .sort((a: any, b: any) => a.step_order - b.step_order)
    .map((s: any) => ({
      id: s.id,
      type: s.type as StepType,
      order: s.step_order,
      active: s.active,
      start: s.start_date ?? '',
      end: s.end_date ?? '',
      assignees: (s.step_assignees ?? []).map((a: any) => a.member_id),
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

    let parsed: any[]
    try { parsed = JSON.parse(raw) } catch { return }
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
          if (/^[0-9a-f-]{36}$/.test(raw.id)) continue

          const { data: taskRow, error: taskErr } = await supabase
            .from('tasks')
            .insert({
              title: raw.title ?? 'Sem título',
              clickup_link: raw.clickupLink ?? null,
              blocked: raw.status?.blocked ?? false,
              blocked_at: raw.status?.blockedAt ?? null,
              created_at: raw.createdAt ?? new Date().toISOString(),
            })
            .select('id')
            .single()

          if (taskErr || !taskRow) continue

          const steps: any[] = raw.steps ?? []
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
        console.error('[migration] Erro ao migrar dados do localStorage:', err)
      }
    }

    migrate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members])

  // ── Insert steps helper ────────────────────────────────────────────────────
  async function insertSteps(taskId: string, steps: Step[]): Promise<boolean> {
    for (const step of steps) {
      const { data: stepRow, error: stepErr } = await supabase
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

      if (stepErr || !stepRow) {
        console.error('[insertSteps] Erro ao inserir step:', stepErr?.message)
        return false
      }

      if (step.assignees.length > 0) {
        const { error: assigneeErr } = await supabase.from('step_assignees').insert(
          step.assignees.map(mid => ({ step_id: stepRow.id, member_id: mid }))
        )
        if (assigneeErr) {
          console.error('[insertSteps] Erro ao inserir assignees:', assigneeErr.message)
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

    const ok = await insertSteps(taskRow.id, taskData.steps)
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
      return false
    }

    const { error: deleteErr } = await supabase
      .from('task_steps')
      .delete()
      .eq('task_id', taskData.id)

    if (deleteErr) {
      setError(deleteErr.message)
      await fetchTasks()
      return false
    }

    const ok = await insertSteps(taskData.id, taskData.steps)
    if (!ok) {
      setError('Tarefa atualizada mas erro ao guardar etapas')
      await fetchTasks()
      return false
    }

    setError(null)
    await fetchTasks()
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
