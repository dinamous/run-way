import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useThrottledMutation } from '@/hooks/infra/useThrottledMutation'
import type { Task } from '@/lib/steps'

const THROTTLE_MS = 500

/**
 * Quick in-place mutations shared by ListView and TasksView.
 * Full edits (all fields + steps) go through useSupabase.updateTask.
 */
export function useTaskQuickActions(memberId?: string | null) {
  const queryClient = useQueryClient()

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
  }, [queryClient])

  const concludeTask = useCallback(async (task: Task) => {
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('tasks')
      .update({ concluded_at: now, concluded_by: memberId ?? null })
      .eq('id', task.id)

    if (error) { toast.error('Erro ao concluir demanda'); return false }
    toast.success(`"${task.title}" concluída`)
    invalidate()
    return true
  }, [memberId, invalidate])

  const toggleBlock = useCallback(async (task: Task) => {
    const newBlocked = !task.status.blocked
    const now = new Date().toISOString().split('T')[0]
    const { error } = await supabase
      .from('tasks')
      .update({ blocked: newBlocked, blocked_at: newBlocked ? now : null })
      .eq('id', task.id)

    if (error) { toast.error('Erro ao alterar bloqueio'); return false }
    toast.success(newBlocked ? `"${task.title}" bloqueada` : `"${task.title}" desbloqueada`)
    invalidate()
    return true
  }, [invalidate])

  const concludeTasks = useCallback(async (tasks: Task[]) => {
    const pendingTasks = tasks.filter(task => !task.concludedAt)
    if (pendingTasks.length === 0) {
      toast.info('As demandas selecionadas já estão concluídas')
      return false
    }

    const now = new Date().toISOString()
    const { error } = await supabase
      .from('tasks')
      .update({ concluded_at: now, concluded_by: memberId ?? null })
      .in('id', pendingTasks.map(task => task.id))

    if (error) { toast.error('Erro ao concluir demandas'); return false }
    toast.success(`${pendingTasks.length} demanda${pendingTasks.length !== 1 ? 's' : ''} concluída${pendingTasks.length !== 1 ? 's' : ''}`)
    invalidate()
    return true
  }, [memberId, invalidate])

  const blockTasks = useCallback(async (tasks: Task[]) => {
    const unblockedTasks = tasks.filter(task => !task.status.blocked)
    if (unblockedTasks.length === 0) {
      toast.info('As demandas selecionadas já estão bloqueadas')
      return false
    }

    const now = new Date().toISOString().split('T')[0]
    const { error } = await supabase
      .from('tasks')
      .update({ blocked: true, blocked_at: now })
      .in('id', unblockedTasks.map(task => task.id))

    if (error) { toast.error('Erro ao bloquear demandas'); return false }
    toast.success(`${unblockedTasks.length} demanda${unblockedTasks.length !== 1 ? 's' : ''} bloqueada${unblockedTasks.length !== 1 ? 's' : ''}`)
    invalidate()
    return true
  }, [invalidate])

  return {
    concludeTask: useThrottledMutation(concludeTask, THROTTLE_MS),
    toggleBlock: useThrottledMutation(toggleBlock, THROTTLE_MS),
    concludeTasks,
    blockTasks,
  }
}
