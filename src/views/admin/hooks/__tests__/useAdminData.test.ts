import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock do supabaseAdmin antes de importar o hook
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn(),
    auth: {
      admin: {
        deleteUser: vi.fn(),
        listUsers: vi.fn(),
      },
    },
  },
}))

// Mock das stores para evitar erros de contexto
vi.mock('@/store/useTaskStore', () => ({
  useTaskStore: (selector: (s: { invalidate: () => void; fetchTasks: () => Promise<void> }) => unknown) =>
    selector({ invalidate: vi.fn(), fetchTasks: vi.fn() }),
}))
vi.mock('@/store/useMemberStore', () => ({
  useMemberStore: (selector: (s: { invalidate: () => void; fetchMembers: () => Promise<void> }) => unknown) =>
    selector({ invalidate: vi.fn(), fetchMembers: vi.fn() }),
}))
vi.mock('@/store/useClientStore', () => ({
  useClientStore: (selector: (s: { selectedClientId: string | null }) => unknown) =>
    selector({ selectedClientId: null }),
}))

import { useAdminData } from '../useAdminData'
import { supabaseAdmin } from '@/lib/supabase'

// Helper para criar mock de query chain do Supabase
// O objeto retornado é um thenable (Promise-like) para que `await query.select().order()` funcione
function makeQueryMock(returnValue: { data?: unknown; error?: unknown }) {
  const mock: Record<string, unknown> = {}
  const self = () => mock
  mock.select = vi.fn().mockReturnThis()
  mock.order = vi.fn().mockReturnThis()
  mock.eq = vi.fn().mockReturnThis()
  mock.delete = vi.fn().mockReturnThis()
  mock.update = vi.fn().mockReturnThis()
  mock.upsert = vi.fn().mockReturnThis()
  mock.insert = vi.fn().mockReturnThis()
  mock.single = vi.fn().mockResolvedValue(returnValue)
  mock.limit = vi.fn().mockReturnThis()
  mock.gte = vi.fn().mockReturnThis()
  mock.lte = vi.fn().mockReturnThis()
  mock.ilike = vi.fn().mockReturnThis()
  // Thenable: quando o chain é awaited diretamente
  mock.then = (resolve: (v: unknown) => void) => {
    resolve(returnValue)
    return Promise.resolve(returnValue)
  }
  void self
  return mock
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const admin = supabaseAdmin!

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyQuery = any

describe('useAdminData', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup padrão: fetches iniciais retornam listas vazias
    const emptyQuery = makeQueryMock({ data: [], error: null })
    vi.mocked(admin.from).mockReturnValue(emptyQuery as AnyQuery)
    vi.mocked(admin.auth.admin.listUsers).mockResolvedValue({
      data: { users: [], aud: '', nextPage: 0, lastPage: 0, total: 0 },
      error: null,
    } as unknown as Awaited<ReturnType<typeof admin.auth.admin.listUsers>>)
  })

describe('deactivateUser', () => {
  it('desativa o member e retorna true', async () => {
    const updateQuery = makeQueryMock({ data: null, error: null })
    vi.mocked(admin.from).mockReturnValue(updateQuery as AnyQuery)

    const { result } = renderHook(() => useAdminData())

    let ok: boolean | undefined
    await act(async () => {
      ok = await result.current.deactivateUser('member-1')
    })

    expect(ok).toBe(true)
  })

  it('retorna false quando a desativação falha', async () => {
    const errorQuery = makeQueryMock({ data: null, error: { message: 'update failed' } })
    vi.mocked(admin.from).mockReturnValue(errorQuery as AnyQuery)

    const { result } = renderHook(() => useAdminData())

    let ok: boolean | undefined
    await act(async () => {
      ok = await result.current.deactivateUser('member-1')
    })

    expect(ok).toBe(false)
  })
})

describe('reactivateUser', () => {
  it('reativa o member e retorna true', async () => {
    const updateQuery = makeQueryMock({ data: null, error: null })
    vi.mocked(admin.from).mockReturnValue(updateQuery as AnyQuery)

    const { result } = renderHook(() => useAdminData())

    let ok: boolean | undefined
    await act(async () => {
      ok = await result.current.reactivateUser('member-1')
    })

    expect(ok).toBe(true)
  })

  it('retorna false quando a reativação falha', async () => {
    const errorQuery = makeQueryMock({ data: null, error: { message: 'update failed' } })
    vi.mocked(admin.from).mockReturnValue(errorQuery as AnyQuery)

    const { result } = renderHook(() => useAdminData())

    let ok: boolean | undefined
    await act(async () => {
      ok = await result.current.reactivateUser('member-1')
    })

    expect(ok).toBe(false)
  })
})

describe('setUserAuthId — atualiza pendingUsers após vincular', () => {
    it('chama listUsers (fetchPendingUsers) após um setUserAuthId bem-sucedido', async () => {
      const updateQuery = makeQueryMock({ data: null, error: null })
      vi.mocked(admin.from).mockReturnValue(updateQuery as AnyQuery)
      vi.mocked(admin.auth.admin.listUsers).mockResolvedValue({
        data: { users: [], aud: '', nextPage: 0, lastPage: 0, total: 0 },
        error: null,
      } as unknown as Awaited<ReturnType<typeof admin.auth.admin.listUsers>>)

      const { result } = renderHook(() => useAdminData())

      const callsBefore = vi.mocked(admin.auth.admin.listUsers).mock.calls.length

      await act(async () => {
        await result.current.setUserAuthId('member-1', 'auth-uuid-new', null)
      })

      const callsAfter = vi.mocked(admin.auth.admin.listUsers).mock.calls.length
      expect(callsAfter).toBeGreaterThan(callsBefore)
    })
  })
})
