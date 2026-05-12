import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/queries'
import type { SubtaskProgressStatus, Task } from '@/lib/steps'

interface UseSubtaskQuickEditOptions {
  clientId?: string | null
  isAdmin?: boolean
}

export function useSubtaskQuickEdit({ clientId, isAdmin }: UseSubtaskQuickEditOptions = {}) {
  const queryClient = useQueryClient()

  const patchCache = useCallback((taskId: string, subtaskId: string, patch: Partial<Task['subtasks'][number]>) => {
    const key = queryKeys.tasks(clientId ?? null, isAdmin ?? false)
    queryClient.setQueryData<Task[]>(key, prev =>
      prev?.map(t =>
        t.id !== taskId ? t : {
          ...t,
          subtasks: t.subtasks.map(s => s.id !== subtaskId ? s : { ...s, ...patch }),
        }
      ) ?? []
    )
    return () => queryClient.invalidateQueries({ queryKey: ['tasks'] })
  }, [queryClient, clientId, isAdmin])

  const updateSubtaskAssignees = useCallback(async (
    task: Task,
    subtaskId: string,
    assignees: string[],
  ): Promise<boolean> => {
    const rollback = patchCache(task.id, subtaskId, { assignees })

    const prevAssignees = task.subtasks.find(s => s.id === subtaskId)?.assignees ?? []
    const toAdd = assignees.filter(a => !prevAssignees.includes(a))
    const toRemove = prevAssignees.filter(a => !assignees.includes(a))

    if (toRemove.length > 0) {
      const { error } = await supabase
        .from('subtask_assignees')
        .delete()
        .eq('subtask_id', subtaskId)
        .in('member_id', toRemove)
      if (error) { rollback(); toast.error('Erro ao remover responsável'); return false }
    }

    if (toAdd.length > 0) {
      const { error } = await supabase
        .from('subtask_assignees')
        .insert(toAdd.map(member_id => ({ subtask_id: subtaskId, member_id })))
      if (error) { rollback(); toast.error('Erro ao atribuir responsável'); return false }
    }

    return true
  }, [patchCache])

  const updateSubtaskDates = useCallback(async (
    task: Task,
    subtaskId: string,
    start: string,
    end: string,
  ): Promise<boolean> => {
    const rollback = patchCache(task.id, subtaskId, { start, end })

    const { error } = await supabase
      .from('task_subtasks')
      .update({ start_date: start || null, end_date: end || null })
      .eq('id', subtaskId)

    if (error) { rollback(); toast.error('Erro ao atualizar datas'); return false }
    return true
  }, [patchCache])

  const updateSubtaskProgressStatus = useCallback(async (
    task: Task,
    subtaskId: string,
    progressStatus: SubtaskProgressStatus,
  ): Promise<boolean> => {
    const rollback = patchCache(task.id, subtaskId, { progressStatus })

    const { error } = await supabase
      .from('task_subtasks')
      .update({ progress_status: progressStatus })
      .eq('id', subtaskId)

    if (error) { rollback(); toast.error('Erro ao atualizar status'); return false }
    return true
  }, [patchCache])

  return { updateSubtaskAssignees, updateSubtaskDates, updateSubtaskProgressStatus }
}
