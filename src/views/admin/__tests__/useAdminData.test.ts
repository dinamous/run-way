import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
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
