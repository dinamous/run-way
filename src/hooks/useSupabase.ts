import { useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Task, Step } from '@/lib/steps'
import { toast } from 'sonner'
import { logAudit } from '@/lib/audit'
import { useTaskStore } from '@/store/useTaskStore'

const devLog = import.meta.env.DEV
  ? (...args: unknown[]) => console.warn(...args)
  : () => undefined

export interface Member {
  id: string
  name: string
  role: string
  avatar: string
  avatar_url?: string | null
  email?: string | null
  auth_user_id?: string | null
  access_role?: 'admin' | 'user'
}

interface UseSupabaseOptions {
  memberId?: string
  clientId?: string | null
  isAdmin?: boolean
}

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

export function useSupabase(options: UseSupabaseOptions = {}) {
  const { memberId, clientId, isAdmin } = options

  const refresh = useCallback(async () => {
    useTaskStore.getState().invalidate()
    await useTaskStore.getState().fetchTasks(clientId, isAdmin ?? false)
  }, [clientId, isAdmin])

  const createTask = useCallback(async (taskData: Omit<Task, 'id' | 'createdAt'>): Promise<boolean> => {
    const { data: taskRow, error: taskErr } = await supabase
      .from('tasks')
      .insert({
        title: taskData.title,
        clickup_link: taskData.clickupLink ?? null,
        blocked: taskData.status.blocked,
        blocked_at: taskData.status.blockedAt ?? null,
        client_id: taskData.clientId ?? null,
      })
      .select('id')
      .single()

    if (taskErr || !taskRow) {
      toast.error(taskErr?.message ?? 'Erro ao criar tarefa')
      return false
    }

    const ok = await upsertSteps(taskRow.id, taskData.steps)
    if (!ok) {
      toast.error('Tarefa criada mas erro ao guardar etapas')
      await refresh()
      return false
    }

    toast.success(`Demanda "${taskData.title}" criada`)
    if (memberId) {
      await logAudit({
        userId: memberId,
        clientId: taskData.clientId ?? null,
        entity: 'task',
        entityId: taskRow.id,
        entityName: taskData.title,
        action: 'create',
      })
    }

    await refresh()
    return true
  }, [memberId, refresh])

  const updateTask = useCallback(async (taskData: Task): Promise<boolean> => {
    const previousTasks = useTaskStore.getState().tasks
    const prevTask = previousTasks.find(t => t.id === taskData.id)

    useTaskStore.setState(s => ({
      tasks: s.tasks.map(t => t.id === taskData.id ? taskData : t)
    }))

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
      useTaskStore.setState({ tasks: previousTasks })
      toast.error(taskErr.message)
      return false
    }

    const keptIds = taskData.steps.map(s => s.id).filter(Boolean)
    if (keptIds.length > 0) {
      const { error: deleteErr } = await supabase
        .from('task_steps')
        .delete()
        .eq('task_id', taskData.id)
        .not('id', 'in', `(${keptIds.join(',')})`)

      if (deleteErr) {
        useTaskStore.setState({ tasks: previousTasks })
        toast.error(deleteErr.message)
        return false
      }
    } else {
      const { error: deleteErr } = await supabase
        .from('task_steps')
        .delete()
        .eq('task_id', taskData.id)

      if (deleteErr) {
        useTaskStore.setState({ tasks: previousTasks })
        toast.error(deleteErr.message)
        return false
      }
    }

    const ok = await upsertSteps(taskData.id, taskData.steps)
    if (!ok) {
      toast.error('Tarefa atualizada mas erro ao guardar etapas')
      await refresh()
      return false
    }

    toast.success(`Demanda "${taskData.title}" atualizada`)
    if (memberId && prevTask) {
      if (prevTask.status?.blocked !== taskData.status?.blocked) {
        await logAudit({
          userId: memberId,
          clientId: taskData.clientId ?? null,
          entity: 'task',
          entityId: taskData.id,
          entityName: taskData.title,
          action: 'update',
          field: 'blocked',
          fromValue: String(prevTask.status?.blocked ?? false),
          toValue: String(taskData.status?.blocked ?? false),
        })
      }
      if (prevTask.title !== taskData.title) {
        await logAudit({
          userId: memberId,
          clientId: taskData.clientId ?? null,
          entity: 'task',
          entityId: taskData.id,
          entityName: taskData.title,
          action: 'update',
          field: 'title',
          fromValue: prevTask.title,
          toValue: taskData.title,
        })
      }
    }

    return true
  }, [memberId, refresh])

  const deleteTask = useCallback(async (id: string): Promise<boolean> => {
    const deletedTask = useTaskStore.getState().tasks.find(t => t.id === id)

    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) {
      toast.error(error.message)
      return false
    }

    useTaskStore.setState(s => ({ tasks: s.tasks.filter(t => t.id !== id) }))
    toast.success(`Demanda "${deletedTask?.title ?? id}" eliminada`)

    if (memberId && deletedTask) {
      await logAudit({
        userId: memberId,
        clientId: deletedTask.clientId ?? null,
        entity: 'task',
        entityId: id,
        entityName: deletedTask.title,
        action: 'delete',
      })
    }

    return true
  }, [memberId])

  return { createTask, updateTask, deleteTask }
}
