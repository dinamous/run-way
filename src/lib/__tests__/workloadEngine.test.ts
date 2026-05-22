import { describe, it, expect } from 'vitest';
import { computeMemberWorkload } from '../workloadEngine';
import type { Task } from '../steps';

const TODAY = '2026-05-22';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Task',
    priorityOrder: 0,
    status: { blocked: false },
    subtasks: [],
    createdAt: '2026-05-01T00:00:00Z',
    ...overrides,
  };
}

describe('computeMemberWorkload', () => {
  it('returns available when no tasks', () => {
    const result = computeMemberWorkload({
      memberId: 'm1',
      capacity: 6,
      activeTasks: [],
      concludedTasks: [],
      today: TODAY,
    });
    expect(result.status).toBe('available');
    expect(result.pressureScore).toBe(0);
    expect(result.tasksInProgress).toBe(0);
  });

  it('counts active subtasks assigned to member', () => {
    const task = makeTask({
      subtasks: [
        { id: 's1', title: 'A', status: 'design', progressStatus: 'in-progress', start: TODAY, end: TODAY, assignees: ['m1'], active: true, order: 0 },
        { id: 's2', title: 'B', status: 'qa', progressStatus: 'todo', start: TODAY, end: TODAY, assignees: ['m2'], active: true, order: 1 },
        { id: 's3', title: 'C', status: 'desenvolvimento', progressStatus: 'todo', start: TODAY, end: TODAY, assignees: ['m1'], active: false, order: 2 },
      ],
    });
    const result = computeMemberWorkload({
      memberId: 'm1',
      capacity: 6,
      activeTasks: [task],
      concludedTasks: [],
      today: TODAY,
    });
    expect(result.totalActiveSubtasks).toBe(1); // only active=true AND assignees includes m1
  });

  it('detects late tasks', () => {
    const lateTask = makeTask({ id: 'late', dueDate: '2026-05-10' });
    const result = computeMemberWorkload({
      memberId: 'm1',
      capacity: 6,
      activeTasks: [lateTask],
      concludedTasks: [],
      today: TODAY,
    });
    expect(result.lateCount).toBe(1);
  });

  it('does not count future due dates as late', () => {
    const futureTask = makeTask({ dueDate: '2026-06-01' });
    const result = computeMemberWorkload({
      memberId: 'm1',
      capacity: 6,
      activeTasks: [futureTask],
      concludedTasks: [],
      today: TODAY,
    });
    expect(result.lateCount).toBe(0);
  });

  it('detects stuck tasks', () => {
    // startedAt 100h ago, expectedHours=20 → ageHours > 20*1.5=30 → stuck
    const startedAt = new Date(TODAY + 'T00:00:00');
    startedAt.setHours(startedAt.getHours() - 100);
    const stuckTask = makeTask({
      startedAt: startedAt.toISOString(),
      expectedHours: 20,
    });
    const result = computeMemberWorkload({
      memberId: 'm1',
      capacity: 6,
      activeTasks: [stuckTask],
      concludedTasks: [],
      today: TODAY,
    });
    expect(result.stuckTasksCount).toBe(1);
  });

  it('does not flag task as stuck without startedAt', () => {
    const task = makeTask({ expectedHours: 5 });
    const result = computeMemberWorkload({
      memberId: 'm1',
      capacity: 6,
      activeTasks: [task],
      concludedTasks: [],
      today: TODAY,
    });
    expect(result.stuckTasksCount).toBe(0);
  });

  it('computes throughput from concluded tasks within window', () => {
    const recent = makeTask({ id: 't1', concludedAt: '2026-05-20', expectedHours: 8 });
    const old = makeTask({ id: 't2', concludedAt: '2026-05-01', expectedHours: 16 });
    const result = computeMemberWorkload({
      memberId: 'm1',
      capacity: 6,
      activeTasks: [],
      concludedTasks: [recent, old],
      today: TODAY,
    });
    expect(result.throughput7dHours).toBe(8);
    expect(result.throughput14dHours).toBe(8);
  });

  it('uses 1h fallback for concluded tasks without expectedHours', () => {
    const task = makeTask({ concludedAt: '2026-05-20', expectedHours: undefined });
    const result = computeMemberWorkload({
      memberId: 'm1',
      capacity: 6,
      activeTasks: [],
      concludedTasks: [task],
      today: TODAY,
    });
    expect(result.throughput7dHours).toBe(1);
  });

  it('returns overloaded status when pressureScore >= 0.8', () => {
    // loadRatio alone: 10 subtasks / 6 capacity = 1.67 → clamped contribution = 0.5
    // need additional factors; inject late + stuck tasks
    const startedAt = new Date(TODAY + 'T00:00:00');
    startedAt.setHours(startedAt.getHours() - 200);
    const tasks = Array.from({ length: 6 }, (_, i) =>
      makeTask({
        id: `t${i}`,
        dueDate: '2026-05-01',
        startedAt: startedAt.toISOString(),
        expectedHours: 5,
        subtasks: [
          { id: `s${i}`, title: 'X', status: 'design', progressStatus: 'in-progress', start: TODAY, end: TODAY, assignees: ['m1'], active: true, order: 0 },
        ],
      }),
    );
    const result = computeMemberWorkload({
      memberId: 'm1',
      capacity: 6,
      activeTasks: tasks,
      concludedTasks: [],
      today: TODAY,
    });
    expect(result.status).toBe('overloaded');
  });

  it('returns null estimatedCompletionDate when throughput is zero', () => {
    const result = computeMemberWorkload({
      memberId: 'm1',
      capacity: 6,
      activeTasks: [makeTask({ expectedHours: 10 })],
      concludedTasks: [],
      today: TODAY,
    });
    expect(result.estimatedCompletionDate).toBeNull();
  });

  it('computes estimatedCompletionDate when throughput > 0', () => {
    const concluded = makeTask({ concludedAt: '2026-05-20', expectedHours: 7 });
    const active = makeTask({ expectedHours: 7 });
    const result = computeMemberWorkload({
      memberId: 'm1',
      capacity: 6,
      activeTasks: [active],
      concludedTasks: [concluded],
      today: TODAY,
    });
    expect(result.estimatedCompletionDate).not.toBeNull();
    expect(result.estimatedCompletionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('generates insight for critical pressure', () => {
    const startedAt = new Date(TODAY + 'T00:00:00');
    startedAt.setHours(startedAt.getHours() - 200);
    const tasks = Array.from({ length: 6 }, (_, i) =>
      makeTask({
        id: `t${i}`,
        dueDate: '2026-05-01',
        startedAt: startedAt.toISOString(),
        expectedHours: 5,
        subtasks: [
          { id: `s${i}`, title: 'X', status: 'design', progressStatus: 'in-progress', start: TODAY, end: TODAY, assignees: ['m1'], active: true, order: 0 },
        ],
      }),
    );
    const result = computeMemberWorkload({
      memberId: 'm1',
      capacity: 6,
      activeTasks: tasks,
      concludedTasks: [],
      today: TODAY,
    });
    expect(result.insights).toContain('Carga crítica — risco de entrega comprometida.');
  });

  it('generates insight for no deliveries in 7 days', () => {
    const result = computeMemberWorkload({
      memberId: 'm1',
      capacity: 6,
      activeTasks: [makeTask()],
      concludedTasks: [],
      today: TODAY,
    });
    expect(result.insights).toContain('Nenhuma entrega nos últimos 7 dias.');
  });
});
