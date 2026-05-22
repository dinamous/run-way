import { describe, expect, it } from 'vitest'
import { buildPersonalWorkload } from '../overviewWorkload'
import type { SubtaskRow } from '../useOverviewData'

const member = {
  id: 'member-1',
  name: 'Ana Silva',
  role: 'Designer',
  avatarUrl: null,
  capacity: 3,
}

function subtask(overrides: Partial<SubtaskRow>): SubtaskRow {
  return {
    id: 'sub-1',
    title: 'Design',
    status: 'design',
    start: '2026-05-01',
    end: '2026-05-22',
    active: true,
    taskId: 'task-1',
    taskTitle: 'Landing page',
    taskBlocked: false,
    clientId: 'client-1',
    clientName: 'Cliente A',
    taskConcludedAt: null,
    ...overrides,
  }
}

describe('buildPersonalWorkload', () => {
  it('calcula carga individual apenas com subtarefas ativas e abertas', () => {
    const result = buildPersonalWorkload(member, [
      subtask({ id: 'sub-1', taskId: 'task-1', taskTitle: 'Landing page' }),
      subtask({ id: 'sub-2', taskId: 'task-1', taskTitle: 'Landing page', end: '2026-05-20' }),
      subtask({ id: 'sub-3', taskId: 'task-2', taskTitle: 'Checkout' }),
      subtask({ id: 'sub-4', taskId: 'task-3', active: false }),
      subtask({ id: 'sub-5', taskId: 'task-4', taskConcludedAt: '2026-05-21' }),
    ], '2026-05-22')

    expect(result.member).toMatchObject({
      id: 'member-1',
      subtaskCount: 3,
      lateCount: 1,
    })
    expect(result.insights[0]).toBe('Você está acima da capacidade: 3/3 subtarefas ativas.')
    expect(result.insights[1]).toBe('Landing page e Checkout ocupam 3 subtarefas da sua capacidade.')
    expect(result.insights[2]).toBe('1 subtarefa da sua carga está atrasada.')
  })

  it('mostra insight vazio quando não há carga ativa', () => {
    const result = buildPersonalWorkload(member, [], '2026-05-22')

    expect(result.member?.subtaskCount).toBe(0)
    expect(result.insights).toEqual(['Você está sem subtarefas ativas atribuídas agora.'])
  })
})
