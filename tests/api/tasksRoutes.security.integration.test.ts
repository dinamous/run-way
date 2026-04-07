import { beforeEach, describe, expect, it } from 'vitest'
import {
  createTasksApi,
  type AuthClaims,
  type RateLimiter,
  type TaskRecord,
  type TaskRepository,
  type TokenVerifier,
} from '@/api/tasksRoutes'

const USER_A = '11111111-1111-4111-8111-111111111111'
const USER_B = '22222222-2222-4222-8222-222222222222'
const TASK_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const TASK_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

class InMemoryTaskRepository implements TaskRepository {
  private tasks: TaskRecord[] = [
    {
      id: TASK_A,
      ownerId: USER_A,
      title: 'Task do usuario A',
      clickupLink: 'https://app.clickup.com/t/123',
      clientId: null,
    },
    {
      id: TASK_B,
      ownerId: USER_B,
      title: 'Task do usuario B',
      clickupLink: 'https://app.clickup.com/t/999',
      clientId: null,
    },
  ]

  async findById(id: string): Promise<TaskRecord | null> {
    return this.tasks.find(task => task.id === id) ?? null
  }

  async create(input: {
    ownerId: string
    title: string
    clickupLink: string | null
    clientId: string | null
  }): Promise<TaskRecord> {
    const task: TaskRecord = {
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      ownerId: input.ownerId,
      title: input.title,
      clickupLink: input.clickupLink,
      clientId: input.clientId,
    }
    this.tasks.push(task)
    return task
  }

  async update(id: string, input: { title?: string; clickupLink?: string | null; clientId?: string | null }): Promise<TaskRecord> {
    const index = this.tasks.findIndex(task => task.id === id)
    if (index === -1) {
      throw new Error('Task not found')
    }

    this.tasks[index] = {
      ...this.tasks[index],
      ...input,
      clickupLink: input.clickupLink ?? this.tasks[index].clickupLink,
      clientId: input.clientId ?? this.tasks[index].clientId,
    }

    return this.tasks[index]
  }

  async remove(id: string): Promise<void> {
    this.tasks = this.tasks.filter(task => task.id !== id)
  }
}

class InMemoryTokenVerifier implements TokenVerifier {
  constructor(private claimsMap: Record<string, AuthClaims>) {}

  async verify(token: string): Promise<AuthClaims | null> {
    return this.claimsMap[token] ?? null
  }
}

class SlidingWindowLimiter implements RateLimiter {
  private counters = new Map<string, number>()

  constructor(private limit: number) {}

  consume(key: string): boolean {
    const current = this.counters.get(key) ?? 0
    if (current >= this.limit) return false
    this.counters.set(key, current + 1)
    return true
  }
}

describe('Tasks API security integration', () => {
  const now = 1_700_000_000
  let api: ReturnType<typeof createTasksApi>

  beforeEach(() => {
    api = createTasksApi({
      repository: new InMemoryTaskRepository(),
      tokenVerifier: new InMemoryTokenVerifier({
        'valid-user-a': { userId: USER_A, exp: now + 3600 },
        'valid-user-b': { userId: USER_B, exp: now + 3600 },
        'expired-user-a': { userId: USER_A, exp: now - 1 },
      }),
      rateLimiter: new SlidingWindowLimiter(3),
      now: () => now,
    })
  })

  it('retorna 401 para rota protegida sem autenticacao', async () => {
    const response = await api.handle({
      method: 'GET',
      path: `/api/tasks/${TASK_A}`,
    })

    expect(response.status).toBe(401)
  })

  it('rejeita token expirado com 401', async () => {
    const response = await api.handle({
      method: 'GET',
      path: `/api/tasks/${TASK_A}`,
      headers: { authorization: 'Bearer expired-user-a' },
    })

    expect(response.status).toBe(401)
  })

  it('bloqueia IDOR quando usuario A tenta acessar recurso de B', async () => {
    const response = await api.handle({
      method: 'GET',
      path: `/api/tasks/${TASK_B}`,
      headers: { authorization: 'Bearer valid-user-a' },
    })

    expect(response.status).toBe(403)
  })

  it('aplica rate limit para usuario autenticado', async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const okResponse = await api.handle({
        method: 'GET',
        path: `/api/tasks/${TASK_A}`,
        headers: { authorization: 'Bearer valid-user-a' },
      })
      expect(okResponse.status).toBe(200)
    }

    const blockedResponse = await api.handle({
      method: 'GET',
      path: `/api/tasks/${TASK_A}`,
      headers: { authorization: 'Bearer valid-user-a' },
    })

    expect(blockedResponse.status).toBe(429)
  })

  it('rejeita tentativa de SQL injection na URL com 400', async () => {
    const response = await api.handle({
      method: 'GET',
      path: "/api/tasks/aaaa' OR 1=1 --",
      headers: { authorization: 'Bearer valid-user-a' },
    })

    expect(response.status).toBe(400)
  })

  it('rejeita SQL injection em campo de payload com 400', async () => {
    const response = await api.handle({
      method: 'POST',
      path: '/api/tasks',
      headers: { authorization: 'Bearer valid-user-a' },
      body: {
        title: "Novo'; DROP TABLE tasks; --",
      },
    })

    expect(response.status).toBe(400)
  })
})
