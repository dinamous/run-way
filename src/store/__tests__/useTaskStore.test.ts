import { describe, it, expect, beforeEach } from 'vitest'
import { useTaskStore } from '../useTaskStore'

describe('useTaskStore', () => {
  beforeEach(() => {
    useTaskStore.setState({ optimisticTasks: null })
  })

  it('inicia com optimisticTasks null', () => {
    expect(useTaskStore.getState().optimisticTasks).toBeNull()
  })

  it('applyOptimisticUpdate define tasks', () => {
    const tasks = [{ id: '1', steps: [] }] as never
    useTaskStore.getState().applyOptimisticUpdate(tasks)
    expect(useTaskStore.getState().optimisticTasks).toHaveLength(1)
    expect(useTaskStore.getState().optimisticTasks?.[0].id).toBe('1')
  })

  it('clearOptimistic limpa tasks', () => {
    useTaskStore.setState({ optimisticTasks: [{ id: '1' }] as never })
    useTaskStore.getState().clearOptimistic()
    expect(useTaskStore.getState().optimisticTasks).toBeNull()
  })
})