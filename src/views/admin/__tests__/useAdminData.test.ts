import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useAdminData } from '../hooks/useAdminData'

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
      delete: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
      update: vi.fn(() => Promise.resolve({ error: null })),
      upsert: vi.fn(() => Promise.resolve({ error: null })),
    })),
    auth: { 
      admin: { 
        listUsers: vi.fn(() => Promise.resolve({ data: { users: [] }, error: null })),
        deleteUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null }))
      } 
    }
  },
}))

vi.mock('@/store/useTaskStore', () => ({
  useTaskStore: vi.fn((sel: (s: object) => unknown) => sel({ invalidate: vi.fn(), fetchTasks: vi.fn() })),
}))

vi.mock('@/store/useMemberStore', () => ({
  useMemberStore: vi.fn((sel: (s: object) => unknown) => sel({ invalidate: vi.fn(), fetchMembers: vi.fn() })),
}))

vi.mock('@/store/useClientStore', () => ({
  useClientStore: vi.fn((sel: (s: object) => unknown) => sel({ selectedClientId: null })),
}))

describe('useAdminData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('inicia com loadingInitial true', () => {
    const { result } = renderHook(() => useAdminData())
    expect(result.current.loadingInitial).toBe(true)
  })

  it('carrega dados quando supabaseAdmin disponível', async () => {
    const { result } = renderHook(() => useAdminData())
    await waitFor(() => expect(result.current.loadingInitial).toBe(false))
    expect(result.current.clients).toEqual([])
    expect(result.current.users).toEqual([])
  })

  it('retorna funções de CRUD definidas', async () => {
    const { result } = renderHook(() => useAdminData())
    await waitFor(() => expect(result.current.loadingInitial).toBe(false))
    
    expect(typeof result.current.createClient).toBe('function')
    expect(typeof result.current.deleteClient).toBe('function')
    expect(typeof result.current.createUser).toBe('function')
    expect(typeof result.current.listGoogleUsers).toBe('function')
    expect(typeof result.current.fetchAuditLogs).toBe('function')
  })
})

function makeFromMock(updateEqResult: { error: null | { message: string } }) {
  const eqMock = vi.fn().mockResolvedValue(updateEqResult)
  const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
  const selectMock = vi.fn().mockReturnValue({
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
    eq: vi.fn().mockResolvedValue({ data: [], error: null }),
  })
  const fromMock = vi.fn().mockReturnValue({
    select: selectMock,
    update: updateMock,
    delete: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
    insert: vi.fn(() => Promise.resolve({ error: null })),
    upsert: vi.fn(() => Promise.resolve({ error: null })),
  })
  return { fromMock, updateMock, eqMock }
}

describe('deactivateUser', () => {
  it('chama update com is_active: false e retorna true', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase')
    const { fromMock, updateMock, eqMock } = makeFromMock({ error: null })
    vi.mocked(supabaseAdmin!.from).mockImplementation(fromMock)

    const { result } = renderHook(() => useAdminData())
    await waitFor(() => expect(result.current.loadingInitial).toBe(false))

    let ok: boolean | undefined
    await act(async () => {
      ok = await result.current.deactivateUser('member-1')
    })

    expect(ok).toBe(true)
    expect(updateMock).toHaveBeenCalledWith({ is_active: false })
    expect(eqMock).toHaveBeenCalledWith('id', 'member-1')
  })

  it('retorna false quando Supabase falha', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase')
    const { fromMock } = makeFromMock({ error: { message: 'fail' } })
    vi.mocked(supabaseAdmin!.from).mockImplementation(fromMock)

    const { result } = renderHook(() => useAdminData())
    await waitFor(() => expect(result.current.loadingInitial).toBe(false))

    let ok: boolean | undefined
    await act(async () => {
      ok = await result.current.deactivateUser('member-1')
    })

    expect(ok).toBe(false)
  })
})

describe('reactivateUser', () => {
  it('chama update com is_active: true e retorna true', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase')
    const { fromMock, updateMock, eqMock } = makeFromMock({ error: null })
    vi.mocked(supabaseAdmin!.from).mockImplementation(fromMock)

    const { result } = renderHook(() => useAdminData())
    await waitFor(() => expect(result.current.loadingInitial).toBe(false))

    let ok: boolean | undefined
    await act(async () => {
      ok = await result.current.reactivateUser('member-1')
    })

    expect(ok).toBe(true)
    expect(updateMock).toHaveBeenCalledWith({ is_active: true })
    expect(eqMock).toHaveBeenCalledWith('id', 'member-1')
  })
})
