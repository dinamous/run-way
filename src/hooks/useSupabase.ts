import { useState, useEffect, useCallback } from 'react'
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

  // ── Fetch all tasks with nested steps + assignees ──────────────────────────
  const fetchTasks = useCallback(async () => {
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

    if (error) { setError(error.message); return }
    setTasks((data ?? []).map(dbRowToTask))
  }, [])

  // ── Fetch members ──────────────────────────────────────────────────────────
  const fetchMembers = useCallback(async () => {
    const { data, error } = await supabase
      .from('members')
      .select('id, name, role, avatar')
      .order('name')

    if (error) { setError(error.message); return }
    setMembers(data ?? [])
  }, [])

  useEffect(() => {
    Promise.all([fetchTasks(), fetchMembers()]).finally(() => setLoading(false))
  }, [fetchTasks, fetchMembers])

  // ── Migrate localStorage data (one-time) ───────────────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem('capacity-tasks')
    if (!raw || members.length === 0) return

    let parsed: any[]
    try { parsed = JSON.parse(raw) } catch { return }
    if (!Array.isArray(parsed) || parsed.length === 0) return

    // Map old string IDs ("1", "2") to Supabase UUIDs by avatar initials
    const idMap: Record<string, string> = {}
    members.forEach(m => {
      if (m.avatar === 'AD') idMap['1'] = m.id
      if (m.avatar === 'MT') idMap['2'] = m.id
    })

    const migrate = async () => {
      for (const raw of parsed) {
        // Skip if already looks like a UUID
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
    }

    migrate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members])

  // ── Create task ────────────────────────────────────────────────────────────
  const createTask = async (taskData: Omit<Task, 'id' | 'createdAt'>) => {
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

    if (taskErr || !taskRow) { setError(taskErr?.message ?? 'Erro ao criar'); return }

    await insertSteps(taskRow.id, taskData.steps)
    await fetchTasks()
  }

  // ── Update task ────────────────────────────────────────────────────────────
  const updateTask = async (taskData: Task) => {
    const { error: taskErr } = await supabase
      .from('tasks')
      .update({
        title: taskData.title,
        clickup_link: taskData.clickupLink ?? null,
        blocked: taskData.status.blocked,
        blocked_at: taskData.status.blockedAt ?? null,
      })
      .eq('id', taskData.id)

    if (taskErr) { setError(taskErr.message); return }

    // Delete and re-insert steps (upsert-by-delete)
    await supabase.from('task_steps').delete().eq('task_id', taskData.id)
    await insertSteps(taskData.id, taskData.steps)
    await fetchTasks()
  }

  // ── Delete task ────────────────────────────────────────────────────────────
  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) { setError(error.message); return }
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  // ── Insert steps helper ────────────────────────────────────────────────────
  async function insertSteps(taskId: string, steps: Step[]) {
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

      if (stepErr || !stepRow) continue

      if (step.assignees.length > 0) {
        await supabase.from('step_assignees').insert(
          step.assignees.map(mid => ({ step_id: stepRow.id, member_id: mid }))
        )
      }
    }
  }

  return { tasks, members, loading, error, createTask, updateTask, deleteTask }
}
