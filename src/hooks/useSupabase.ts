import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Task, Step } from '@/lib/steps'
import { toast } from 'sonner'
import { logAudit } from '@/lib/audit'
import { useTaskStore } from '@/store/useTaskStore'
import { toSafeUiErrorMessage } from '@/lib/errorSanitizer'
import { queryKeys } from '@/lib/queries'

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
  is_active?: boolean
  created_at?: string | null
  deactivated_at?: string | null
}

interface UseSupabaseOptions {
  memberId?: string
  clientId?: string | null
  isAdmin?: boolean
}

async function createAllSteps(taskId: string, steps: Step[]): Promise<boolean> {
  const { data, error } = await supabase
    .from('task_steps')
    .insert(
      steps.map(step => ({
        task_id: taskId,
        type: step.type,
        step_order: step.order,
        active: step.active,
        start_date: step.start || null,
        end_date: step.end || null,
      }))
    )
    .select('id,type')

  if (error || !data) {
    devLog('[createAllSteps] Erro ao inserir steps:', error?.message)
    return false
  }

  const stepIdByType = new Map(data.map(row => [row.type, row.id]))
  const assigneeRows = steps.flatMap(step => {
    const stepId = stepIdByType.get(step.type)
    if (!stepId || step.assignees.length === 0) return []
    return step.assignees.map(memberId => ({ step_id: stepId, member_id: memberId }))
  })

  if (assigneeRows.length > 0) {
    const { error: assigneeErr } = await supabase.from('step_assignees').insert(assigneeRows)
    if (assigneeErr) {
      devLog('[createAllSteps] Erro ao inserir assignees:', assigneeErr.message)
      return false
    }
  }

  return true
}

function didTaskFieldsChange(prevTask: Task | undefined, nextTask: Task, resolvedClientId: string | null): boolean {
  if (!prevTask) return true

  return (
    prevTask.title !== nextTask.title
    || (prevTask.clickupLink ?? null) !== (nextTask.clickupLink ?? null)
    || prevTask.status.blocked !== nextTask.status.blocked
    || (prevTask.status.blockedAt ?? null) !== (nextTask.status.blockedAt ?? null)
    || (prevTask.concludedAt ?? null) !== (nextTask.concludedAt ?? null)
    || (prevTask.clientId ?? null) !== resolvedClientId
  )
}

export function useSupabase(options: UseSupabaseOptions = {}) {
  const { memberId, clientId, isAdmin } = options
  const queryClient = useQueryClient()

  const invalidateTasks = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks(clientId ?? null, isAdmin ?? false) })
  }, [queryClient, clientId, isAdmin])

  const createTask = useCallback(async (taskData: Omit<Task, 'id' | 'createdAt'>): Promise<boolean> => {
    const resolvedClientId = taskData.clientId ?? clientId ?? null

    const { data: taskRow, error: taskErr } = await supabase
      .from('tasks')
      .insert({
        title: taskData.title,
        clickup_link: taskData.clickupLink ?? null,
        blocked: taskData.status.blocked,
        blocked_at: taskData.status.blockedAt ?? null,
        client_id: resolvedClientId,
      })
      .select('id')
      .single()

    if (taskErr || !taskRow) {
      toast.error(toSafeUiErrorMessage(taskErr?.message))
      return false
    }

    const ok = await createAllSteps(taskRow.id, taskData.steps)
    if (!ok) {
      toast.error('Tarefa criada mas erro ao guardar etapas')
      invalidateTasks()
      return false
    }

    toast.success(`Demanda "${taskData.title}" criada`)
    if (memberId) {
      await logAudit({
        userId: memberId,
        clientId: resolvedClientId,
        entity: 'task',
        entityId: taskRow.id,
        entityName: taskData.title,
        action: 'create',
      })
    }

    invalidateTasks()
    return true
  }, [clientId, memberId, invalidateTasks])

  const updateTask = useCallback(async (taskData: Task): Promise<boolean> => {
    const resolvedClientId = taskData.clientId ?? clientId ?? null

    const cachedTasks = queryClient.getQueryData<Task[]>(
      queryKeys.tasks(clientId ?? null, isAdmin ?? false)
    ) ?? []

    const prevTask = cachedTasks.find(t => t.id === taskData.id)

    if (!prevTask) {
      toast.error('Não foi possível comparar alterações da demanda')
      invalidateTasks()
      return false
    }

    const updatedTasks = cachedTasks.map(t =>
      t.id === taskData.id ? { ...taskData, clientId: resolvedClientId ?? undefined } : t
    )
    queryClient.setQueryData(queryKeys.tasks(clientId ?? null, isAdmin ?? false), updatedTasks)
    useTaskStore.getState().applyOptimisticUpdate(updatedTasks)

    const rollback = () => {
      queryClient.setQueryData(queryKeys.tasks(clientId ?? null, isAdmin ?? false), cachedTasks)
      useTaskStore.getState().clearOptimistic()
    }

    if (didTaskFieldsChange(prevTask, taskData, resolvedClientId)) {
      const { error: taskErr } = await supabase
        .from('tasks')
        .update({
          title: taskData.title,
          clickup_link: taskData.clickupLink ?? null,
          blocked: taskData.status.blocked,
          blocked_at: taskData.status.blockedAt ?? null,
          concluded_at: taskData.concludedAt ?? null,
          concluded_by: taskData.concludedAt ? (taskData.concludedBy ?? null) : null,
          client_id: resolvedClientId,
        })
        .eq('id', taskData.id)

      if (taskErr) {
        rollback()
        toast.error(toSafeUiErrorMessage(taskErr.message))
        return false
      }
    }

    const prevByType = new Map((prevTask?.steps ?? []).map(step => [step.type, step]))
    const updates = taskData.steps
      .map(step => {
        const prevStep = prevByType.get(step.type)
        const stepId = step.id || prevStep?.id || ''

        if (!stepId || !prevStep) return null

        const stepChanged = (
          prevStep.type !== step.type
          || prevStep.order !== step.order
          || prevStep.active !== step.active
          || (prevStep.start || '') !== (step.start || '')
          || (prevStep.end || '') !== (step.end || '')
        )

        if (!stepChanged) return null

        return {
          id: stepId,
          data: {
            type: step.type,
            step_order: step.order,
            active: step.active,
            start_date: step.start || null,
            end_date: step.end || null,
          },
        }
      })
      .filter((item): item is { id: string; data: { type: Step['type']; step_order: number; active: boolean; start_date: string | null; end_date: string | null } } => item !== null)

    for (const update of updates) {
      const { error } = await supabase
        .from('task_steps')
        .update(update.data)
        .eq('id', update.id)

      if (error) {
        rollback()
        toast.error(toSafeUiErrorMessage(error.message))
        return false
      }
    }

    const assigneesToAdd: Array<{ step_id: string; member_id: string }> = []
    const assigneesToRemoveByStep = new Map<string, string[]>()

    for (const step of taskData.steps) {
      const prevStep = prevByType.get(step.type)
      const stepId = step.id || prevStep?.id || ''
      if (!stepId || !prevStep) continue

      const prevAssignees = new Set(prevStep.assignees)
      const nextAssignees = new Set(step.assignees)

      const toAdd = step.assignees.filter(id => !prevAssignees.has(id))
      const toRemove = prevStep.assignees.filter(id => !nextAssignees.has(id))

      if (toAdd.length > 0) {
        assigneesToAdd.push(...toAdd.map(id => ({ step_id: stepId, member_id: id })))
      }
      if (toRemove.length > 0) {
        assigneesToRemoveByStep.set(stepId, toRemove)
      }
    }

    for (const [stepId, memberIds] of assigneesToRemoveByStep.entries()) {
      const { error } = await supabase
        .from('step_assignees')
        .delete()
        .eq('step_id', stepId)
        .in('member_id', memberIds)

      if (error) {
        rollback()
        toast.error(toSafeUiErrorMessage(error.message))
        return false
      }
    }

    if (assigneesToAdd.length > 0) {
      const { error } = await supabase
        .from('step_assignees')
        .insert(assigneesToAdd)

      if (error) {
        rollback()
        toast.error(toSafeUiErrorMessage(error.message))
        return false
      }
    }

    useTaskStore.getState().clearOptimistic()
    toast.success(`Demanda "${taskData.title}" atualizada`)

    if (memberId && prevTask) {
      if (prevTask.status?.blocked !== taskData.status?.blocked) {
        await logAudit({
          userId: memberId,
          clientId: resolvedClientId,
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
          clientId: resolvedClientId,
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
  }, [clientId, isAdmin, memberId, queryClient, invalidateTasks])

  const deleteTask = useCallback(async (id: string): Promise<boolean> => {
    const cachedTasks = queryClient.getQueryData<Task[]>(
      queryKeys.tasks(clientId ?? null, isAdmin ?? false)
    ) ?? []

    const deletedTask = cachedTasks.find(t => t.id === id)

    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) {
      toast.error(toSafeUiErrorMessage(error.message))
      return false
    }

    queryClient.setQueryData(
      queryKeys.tasks(clientId ?? null, isAdmin ?? false),
      cachedTasks.filter(t => t.id !== id)
    )

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
  }, [clientId, isAdmin, memberId, queryClient])

  return { createTask, updateTask, deleteTask }
}
