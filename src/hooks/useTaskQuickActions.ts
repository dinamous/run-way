import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useThrottledMutation } from '@/hooks/useThrottledMutation'
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

  return {
    concludeTask: useThrottledMutation(concludeTask, THROTTLE_MS),
    toggleBlock: useThrottledMutation(toggleBlock, THROTTLE_MS),
  }
}
