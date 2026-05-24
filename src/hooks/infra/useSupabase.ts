import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useThrottledMutation } from '@/hooks/infra/useThrottledMutation'
import { supabase } from '@/lib/supabase'
import type { Task, Subtask } from '@/lib/steps'
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
  capacity?: number | null
}

interface UseSupabaseOptions {
  memberId?: string
  clientId?: string | null
  isAdmin?: boolean
}

async function createAllSubtasks(taskId: string, subtasks: Subtask[]): Promise<boolean> {
  if (subtasks.length === 0) return true

  const { data, error } = await supabase
    .from('task_subtasks')
    .insert(
      subtasks.map(s => ({
        task_id: taskId,
        title: s.title,
        status: s.status,
        progress_status: s.progressStatus,
        subtask_order: s.order,
        active: s.active,
        start_date: s.start || null,
        end_date: s.end || null,
      }))
    )
    .select('id,title,status,subtask_order')

  if (error || !data) {
    devLog('[createAllSubtasks] Erro ao inserir subtasks:', error?.message)
    return false
  }

  // Map inserted rows back by order (title+status combo can repeat, order is unique per task)
  const idByOrder = new Map(data.map(row => [row.subtask_order, row.id]))
  const assigneeRows = subtasks.flatMap(s => {
    const subtaskId = idByOrder.get(s.order)
    if (!subtaskId || s.assignees.length === 0) return []
    return s.assignees.map(memberId => ({ subtask_id: subtaskId, member_id: memberId }))
  })

  if (assigneeRows.length > 0) {
    const { error: assigneeErr } = await supabase.from('subtask_assignees').insert(assigneeRows)
    if (assigneeErr) {
      devLog('[createAllSubtasks] Erro ao inserir assignees:', assigneeErr.message)
      return false
    }
  }

  return true
}

function didTaskFieldsChange(prevTask: Task | undefined, nextTask: Task, resolvedClientId: string | null): boolean {
  if (!prevTask) return true

  return (
    prevTask.title !== nextTask.title
    || (prevTask.description ?? null) !== (nextTask.description ?? null)
    || (prevTask.clickupLink ?? null) !== (nextTask.clickupLink ?? null)
    || prevTask.priorityOrder !== nextTask.priorityOrder
    || prevTask.status.blocked !== nextTask.status.blocked
    || (prevTask.status.blockedAt ?? null) !== (nextTask.status.blockedAt ?? null)
    || (prevTask.concludedAt ?? null) !== (nextTask.concludedAt ?? null)
    || (prevTask.clientId ?? null) !== resolvedClientId
  )
}

const MUTATION_THROTTLE_MS = 500

export function useSupabase(options: UseSupabaseOptions = {}) {
  const { memberId, clientId, isAdmin } = options
  const queryClient = useQueryClient()

  const invalidateTasks = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks(clientId ?? null, isAdmin ?? false) })
  }, [queryClient, clientId, isAdmin])

  const createTask = useCallback(async (taskData: Omit<Task, 'id' | 'createdAt' | 'priorityOrder'>): Promise<boolean> => {
    const resolvedClientId = taskData.clientId ?? clientId ?? null
    devLog('[createTask] iniciando criação, clientId:', resolvedClientId, 'title:', taskData.title)

    const priorityQuery = supabase
      .from('tasks')
      .select('priority_order')
      .order('priority_order', { ascending: false })
      .limit(1)

    devLog('[createTask] buscando priority_order...')
    const priorityResult = resolvedClientId === null
      ? await priorityQuery.is('client_id', null)
      : await priorityQuery.eq('client_id', resolvedClientId)
    devLog('[createTask] priority_order respondeu:', priorityResult.error?.message ?? 'ok')
    const priorityOrder = (priorityResult.data?.[0]?.priority_order ?? -1) + 1

    devLog('[createTask] iniciando insert...')
    const { data: taskRow, error: taskErr } = await supabase
      .from('tasks')
      .insert({
        title: taskData.title,
        description: taskData.description ?? null,
        clickup_link: taskData.clickupLink ?? null,
        priority_order: priorityOrder,
        blocked: taskData.status.blocked,
        blocked_at: taskData.status.blockedAt ?? null,
        concluded_at: taskData.concludedAt ?? null,
        expected_hours: taskData.expectedHours ?? null,
        complexity: taskData.complexity ?? null,
        task_type: taskData.taskType ?? null,
        due_date: taskData.dueDate ?? null,
        client_id: resolvedClientId,
      })
      .select('id')
      .single()

    devLog('[createTask] insert tasks respondeu, taskRow:', taskRow, 'taskErr:', taskErr)
    if (taskErr || !taskRow) {
      toast.error(toSafeUiErrorMessage(taskErr?.message))
      return false
    }

    const ok = await createAllSubtasks(taskRow.id, taskData.subtasks)
    if (!ok) {
      toast.error('Tarefa criada mas erro ao guardar subtasks')
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
          description: taskData.description ?? null,
          clickup_link: taskData.clickupLink ?? null,
          priority_order: taskData.priorityOrder,
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

    const prevById = new Map((prevTask?.subtasks ?? []).map(s => [s.id, s]))
    const nextIds = new Set(taskData.subtasks.filter(s => s.id).map(s => s.id))

    // DELETE subtasks removed by the user
    const removedIds = [...prevById.keys()].filter(id => !nextIds.has(id))
    if (removedIds.length > 0) {
      const { error } = await supabase
        .from('task_subtasks')
        .delete()
        .in('id', removedIds)
      if (error) {
        rollback()
        toast.error(toSafeUiErrorMessage(error.message))
        return false
      }
    }

    // INSERT new subtasks (id is empty string)
    const newSubtasks = taskData.subtasks.filter(s => !s.id)
    if (newSubtasks.length > 0) {
      const ok = await createAllSubtasks(taskData.id, newSubtasks)
      if (!ok) {
        rollback()
        toast.error('Erro ao guardar novas subtasks')
        return false
      }
    }

    // UPDATE existing subtasks that changed
    const assigneesToAdd: Array<{ subtask_id: string; member_id: string }> = []
    const assigneesToRemoveBySubtask = new Map<string, string[]>()

    for (const subtask of taskData.subtasks) {
      if (!subtask.id) continue
      const prev = prevById.get(subtask.id)
      if (!prev) continue

      const changed = (
        prev.title !== subtask.title
        || prev.status !== subtask.status
        || prev.progressStatus !== subtask.progressStatus
        || prev.order !== subtask.order
        || prev.active !== subtask.active
        || (prev.start || '') !== (subtask.start || '')
        || (prev.end || '') !== (subtask.end || '')
      )

      if (changed) {
        const { error } = await supabase
          .from('task_subtasks')
          .update({
            title: subtask.title,
            status: subtask.status,
            progress_status: subtask.progressStatus,
            subtask_order: subtask.order,
            active: subtask.active,
            start_date: subtask.start || null,
            end_date: subtask.end || null,
          })
          .eq('id', subtask.id)

        if (error) {
          rollback()
          toast.error(toSafeUiErrorMessage(error.message))
          return false
        }
      }

      const prevAssignees = new Set(prev.assignees)
      const nextAssignees = new Set(subtask.assignees)
      const toAdd = subtask.assignees.filter(id => !prevAssignees.has(id))
      const toRemove = prev.assignees.filter(id => !nextAssignees.has(id))

      if (toAdd.length > 0) {
        assigneesToAdd.push(...toAdd.map(id => ({ subtask_id: subtask.id, member_id: id })))
      }
      if (toRemove.length > 0) {
        assigneesToRemoveBySubtask.set(subtask.id, toRemove)
      }
    }

    for (const [subtaskId, memberIds] of assigneesToRemoveBySubtask.entries()) {
      const { error } = await supabase
        .from('subtask_assignees')
        .delete()
        .eq('subtask_id', subtaskId)
        .in('member_id', memberIds)

      if (error) {
        rollback()
        toast.error(toSafeUiErrorMessage(error.message))
        return false
      }
    }

    if (assigneesToAdd.length > 0) {
      const { error } = await supabase
        .from('subtask_assignees')
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

  const throttledCreateTask = useThrottledMutation(createTask, MUTATION_THROTTLE_MS)
  const throttledDeleteTask = useThrottledMutation(deleteTask, MUTATION_THROTTLE_MS)

  return { createTask: throttledCreateTask, updateTask, deleteTask: throttledDeleteTask }
}
