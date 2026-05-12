import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queries'
import { useTaskStore } from '@/store/useTaskStore'
import type { Task } from '@/lib/steps'

interface UseTaskPriorityOrderOptions {
  clientId?: string | null
  isAdmin?: boolean
}

export function useTaskPriorityOrder({ clientId, isAdmin }: UseTaskPriorityOrderOptions = {}) {
  const queryClient = useQueryClient()

  return useCallback(async (orderedTasks: Task[]): Promise<boolean> => {
    const key = queryKeys.tasks(clientId ?? null, isAdmin ?? false)
    const cachedTasks = queryClient.getQueryData<Task[]>(key) ?? []
    const orderedIds = new Set(orderedTasks.map(task => task.id))
    const hiddenTasks = cachedTasks
      .filter(task => !orderedIds.has(task.id))
      .sort((a, b) => a.priorityOrder - b.priorityOrder || b.createdAt.localeCompare(a.createdAt))
    const allTasksInNextOrder = [...orderedTasks, ...hiddenTasks]
    const orderById = new Map(allTasksInNextOrder.map((task, index) => [task.id, index]))

    const nextTasks = cachedTasks
      .map(task => {
        const nextOrder = orderById.get(task.id)
        return nextOrder === undefined ? task : { ...task, priorityOrder: nextOrder }
      })
      .sort((a, b) => a.priorityOrder - b.priorityOrder || b.createdAt.localeCompare(a.createdAt))

    queryClient.setQueryData(key, nextTasks)
    useTaskStore.getState().applyOptimisticUpdate(nextTasks)

    const updates = await Promise.all(
      allTasksInNextOrder.map((task, index) =>
        supabase
          .from('tasks')
          .update({ priority_order: index })
          .eq('id', task.id),
      ),
    )
    const error = updates.find(result => result.error)?.error

    if (error) {
      queryClient.setQueryData(key, cachedTasks)
      useTaskStore.getState().clearOptimistic()
      toast.error('Erro ao reordenar demandas')
      return false
    }

    useTaskStore.getState().clearOptimistic()
    toast.success('Prioridade das demandas atualizada')
    return true
  }, [clientId, isAdmin, queryClient])
}
