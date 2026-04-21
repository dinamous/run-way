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

// Mock do queryClient (TanStack Query)
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: vi.fn(),
    }),
  }
})
vi.mock('@/store/useClientStore', () => ({
  useClientStore: (selector: (s: { selectedClientId: string | null }) => unknown) =>
    selector({ selectedClientId: null }),
}))

const mockPatchUser = vi.fn()
const mockSetError = vi.fn()
const mockRefreshAll = vi.fn().mockResolvedValue(undefined)
const mockFetchClients = vi.fn().mockResolvedValue(undefined)
const mockFetchUsers = vi.fn().mockResolvedValue(undefined)
const mockFetchUserClientsMap = vi.fn().mockResolvedValue(undefined)
const mockFetchPendingUsers = vi.fn().mockResolvedValue(undefined)
const mockFetchAuditLogs = vi.fn().mockResolvedValue(undefined)

vi.mock('@/store/useAdminStore', () => ({
  useAdminStore: () => ({
    clients: [],
    users: [],
    auditLogs: [],
    userClientsMap: {},
    pendingUsers: [],
    loading: false,
    loadingInitial: false,
    error: null,
    initialized: true,
    fetchClients: mockFetchClients,
    fetchUsers: mockFetchUsers,
    fetchUserClientsMap: mockFetchUserClientsMap,
    fetchPendingUsers: mockFetchPendingUsers,
    fetchAuditLogs: mockFetchAuditLogs,
    refreshAll: mockRefreshAll,
    patchUser: mockPatchUser,
    setError: mockSetError,
  }),
}))

import { useAdminData } from '../useAdminData'
import { supabaseAdmin } from '@/lib/supabase'

// Helper para criar mock de query chain do Supabase.
// Todos os métodos retornam `this` para permitir encadeamento, EXCETO `.single()` que resolve.
// O objeto mock em si é uma Promise resolvida (via Promise.resolve) para que `await chain` funcione
// sem expor `.then` diretamente no objeto (o que causaria loop infinito).
function makeQueryMock(returnValue: { data?: unknown; error?: unknown }): Promise<typeof returnValue> & Record<string, unknown> {
  const base = Promise.resolve(returnValue) as Promise<typeof returnValue> & Record<string, unknown>
  const chainMethods = ['select', 'order', 'limit', 'gte', 'lte', 'ilike', 'eq', 'match', 'delete', 'update', 'upsert', 'insert']
  for (const method of chainMethods) {
    base[method] = vi.fn().mockReturnValue(base)
  }
  base['single'] = vi.fn().mockResolvedValue(returnValue)
  return base
}

 
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
    it('chama fetchPendingUsers após um setUserAuthId bem-sucedido', async () => {
      const updateQuery = makeQueryMock({ data: null, error: null })
      vi.mocked(admin.from).mockReturnValue(updateQuery as AnyQuery)

      const { result } = renderHook(() => useAdminData())

      mockFetchPendingUsers.mockClear()

      await act(async () => {
        await result.current.setUserAuthId('member-1', 'auth-uuid-new', null)
      })

      expect(mockFetchPendingUsers).toHaveBeenCalled()
    })
  })
})
