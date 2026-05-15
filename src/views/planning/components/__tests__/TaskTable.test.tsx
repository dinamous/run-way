import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TaskTable } from '../TaskTable'
import type { SubtaskProgressStatus, Task } from '@/lib/steps'

const baseTask: Omit<Task, 'id' | 'title' | 'priorityOrder'> = {
  clickupLink: undefined,
  clientId: 'client-1',
  status: { blocked: false },
  subtasks: [],
  createdAt: '2026-05-12T00:00:00Z',
  concludedAt: undefined,
  concludedBy: undefined,
}

function makeTask(id: string, title: string, priorityOrder: number): Task {
  return {
    ...baseTask,
    id,
    title,
    priorityOrder,
  }
}

function makeTaskWithSubtask(progressStatus: SubtaskProgressStatus = 'todo'): Task {
  return {
    ...makeTask('task-1', 'Demanda A', 0),
    subtasks: [{
      id: 'subtask-1',
      title: 'Subtask A',
      status: 'design',
      progressStatus,
      start: '2026-05-12',
      end: '2026-05-15',
      assignees: [],
      active: true,
      order: 0,
    }],
  }
}

describe('TaskTable', () => {
  it('chama onReorder com demandas na nova ordem ao arrastar uma linha-pai', async () => {
    const tasks = [
      makeTask('task-1', 'Demanda A', 0),
      makeTask('task-2', 'Demanda B', 1),
      makeTask('task-3', 'Demanda C', 2),
    ]
    const onReorder = vi.fn().mockResolvedValue(true)

    render(
      <TaskTable
        tasks={tasks}
        members={[]}
        onToggleBlock={vi.fn()}
        onConclude={vi.fn()}
        onEdit={vi.fn()}
        onReorder={onReorder}
      />,
    )

    fireEvent.dragStart(screen.getByRole('button', { name: 'Reordenar demanda Demanda C' }))
    fireEvent.dragOver(screen.getByText('Demanda A'))
    fireEvent.drop(screen.getByText('Demanda A'))

    await waitFor(() => expect(onReorder).toHaveBeenCalledTimes(1))
    expect(onReorder.mock.calls[0][0].map((task: Task) => task.id)).toEqual([
      'task-3',
      'task-1',
      'task-2',
    ])
  })

  it('atualiza o status de andamento da subtask pelo popover', async () => {
    const task = makeTaskWithSubtask('todo')
    const onUpdateSubtaskProgressStatus = vi.fn().mockResolvedValue(true)

    render(
      <TaskTable
        tasks={[task]}
        members={[]}
        onToggleBlock={vi.fn()}
        onConclude={vi.fn()}
        onEdit={vi.fn()}
        onUpdateSubtaskProgressStatus={onUpdateSubtaskProgressStatus}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'A fazer' }))
    fireEvent.click(screen.getByRole('button', { name: /Em andamento/ }))

    await waitFor(() => expect(onUpdateSubtaskProgressStatus).toHaveBeenCalledWith(
      task,
      'subtask-1',
      'in-progress',
    ))
  })
})
