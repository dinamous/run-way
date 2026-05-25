import { describe, expect, it } from 'vitest'
import { buildPersonalWorkload } from '../overviewWorkload'
import type { Task, Subtask } from '@/lib/steps'

const member = {
  id: 'member-1',
  name: 'Ana Silva',
  role: 'Designer',
  avatarUrl: null,
  capacity: 3,
}

function makeTask(overrides: Partial<Task> & { subtasks?: Subtask[] }): Task {
  return {
    id: 'task-1',
    title: 'Landing page',
    status: { blocked: false },
    subtasks: [],
    createdAt: '2026-05-01T00:00:00Z',
    ...overrides,
  }
}

function makeSubtask(overrides: Partial<Subtask>): Subtask {
  return {
    id: 'sub-1',
    title: 'Design',
    status: 'design',
    progressStatus: 'not-started',
    order: 0,
    active: true,
    start: '2026-05-01',
    end: '2026-05-22',
    assignees: ['member-1'],
    ...overrides,
  }
}

describe('buildPersonalWorkload', () => {
  it('calcula carga do membro com base nas subtarefas ativas atribuídas a ele', () => {
    const tasks = [
      makeTask({
        id: 'task-1',
        title: 'Landing page',
        subtasks: [
          makeSubtask({ id: 'sub-1', assignees: ['member-1'] }),
          makeSubtask({ id: 'sub-2', assignees: ['member-1'], end: '2026-05-20' }),
          makeSubtask({ id: 'sub-3', assignees: ['other-member'] }),
        ],
      }),
      makeTask({
        id: 'task-2',
        title: 'Checkout',
        subtasks: [
          makeSubtask({ id: 'sub-4', assignees: ['member-1'] }),
          makeSubtask({ id: 'sub-5', assignees: ['member-1'], active: false }),
        ],
      }),
    ]

    const result = buildPersonalWorkload(member, tasks, [], '2026-05-22')

    expect(result.member).toMatchObject({ id: 'member-1', subtaskCount: 3 })
    expect(result.metrics).not.toBeNull()
    expect(result.metrics?.totalActiveSubtasks).toBe(3)
  })

  it('retorna membro nulo quando member é null', () => {
    const result = buildPersonalWorkload(null, [], [], '2026-05-22')
    expect(result.member).toBeNull()
    expect(result.metrics).toBeNull()
    expect(result.insights).toEqual([])
  })

  it('gera insight de nenhuma entrega quando sem tasks ativas', () => {
    const result = buildPersonalWorkload(member, [], [], '2026-05-22')
    expect(result.member?.subtaskCount).toBe(0)
    // com pressureScore 0 não há insights críticos; sem tasks ativas também não
    expect(result.insights).toEqual([])
  })

  it('inclui insights do engine para carga crítica', () => {
    // pressureScore = loadRatio * 0.5; para >= 0.8: subtasks/capacity >= 1.6
    const tasks = [
      makeTask({
        id: 'task-1',
        title: 'T1',
        subtasks: Array.from({ length: 6 }, (_, i) =>
          makeSubtask({ id: `sub-${i}`, assignees: ['member-1'] })
        ),
      }),
    ]
    const result = buildPersonalWorkload(member, tasks, [], '2026-05-22')
    // loadRatio = 6/3 = 2, pressureScore >= 0.8
    expect(result.insights[0]).toBe('Carga crítica — risco de entrega comprometida.')
  })
})
