import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useProfile } from '../hooks/useProfile'

const mockMember = {
  id: 'member-1',
  name: 'João Silva',
  email: 'joao@example.com',
  role: 'Developer',
  access_role: 'user' as const,
  avatar: 'JS',
  avatar_url: null,
  auth_user_id: 'auth-1',
  created_at: '2024-01-01T00:00:00Z',
}

const mockRefreshProfile = vi.fn().mockResolvedValue(undefined)

vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({ member: mockMember, refreshProfile: mockRefreshProfile }),
}))

const mockPrefsData = {
  id: 'pref-1',
  user_id: 'member-1',
  theme: 'system' as const,
  language: 'pt-BR' as const,
  notifications_enabled: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

// Build a fluent Supabase query mock that resolves at terminal methods
function buildQuery(terminal: Record<string, unknown>) {
  const q: Record<string, unknown> = {}
  const chain = () => q
  q['select'] = vi.fn(chain)
  q['eq'] = vi.fn(chain)
  q['update'] = vi.fn(chain)
  q['insert'] = vi.fn(chain)
  Object.entries(terminal).forEach(([k, v]) => {
    q[k] = vi.fn(() => Promise.resolve(v))
  })
  return q
}

const mockSupabaseFrom = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockSupabaseFrom(...args) },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useProfile', () => {
  it('carrega preferências existentes', async () => {
    mockSupabaseFrom.mockReturnValue(
      buildQuery({ maybeSingle: { data: mockPrefsData, error: null } })
    )

    const { result } = renderHook(() => useProfile())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.member?.id).toBe('member-1')
    expect(result.current.preferences?.theme).toBe('system')
  })

  it('cria preferências quando não existem', async () => {
    const insertQuery = buildQuery({ single: { data: mockPrefsData, error: null } })
    const selectQuery = buildQuery({ maybeSingle: { data: null, error: null } })
    // After maybeSingle returns null, insert is called on a new from('user_preferences')
    let call = 0
    mockSupabaseFrom.mockImplementation(() => {
      call++
      return call === 1 ? selectQuery : insertQuery
    })

    const { result } = renderHook(() => useProfile())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(insertQuery['insert']).toHaveBeenCalled()
    expect(result.current.preferences?.id).toBe('pref-1')
  })

  it('updateProfile chama supabase update e refreshProfile', async () => {
    const selectQuery = buildQuery({ maybeSingle: { data: mockPrefsData, error: null } })
    const updateQuery = buildQuery({ eq: { error: null } })
    let call = 0
    mockSupabaseFrom.mockImplementation(() => {
      call++
      return call === 1 ? selectQuery : updateQuery
    })

    const { result } = renderHook(() => useProfile())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let ok: boolean | undefined
    await act(async () => {
      ok = await result.current.updateProfile({ name: 'Novo Nome', avatar_url: '' })
    })

    expect(ok).toBe(true)
    expect(mockRefreshProfile).toHaveBeenCalled()
  })

  it('updateProfile retorna false em erro', async () => {
    const selectQuery = buildQuery({ maybeSingle: { data: mockPrefsData, error: null } })
    const updateQuery = buildQuery({ eq: { error: { message: 'fail' } } })
    let call = 0
    mockSupabaseFrom.mockImplementation(() => {
      call++
      return call === 1 ? selectQuery : updateQuery
    })

    const { result } = renderHook(() => useProfile())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let ok: boolean | undefined
    await act(async () => {
      ok = await result.current.updateProfile({ name: 'X', avatar_url: '' })
    })

    expect(ok).toBe(false)
    expect(result.current.error).toBeTruthy()
  })

  it('updatePreferences atualiza estado local', async () => {
    const selectQuery = buildQuery({ maybeSingle: { data: mockPrefsData, error: null } })
    const updateQuery = buildQuery({ eq: { error: null } })
    let call = 0
    mockSupabaseFrom.mockImplementation(() => {
      call++
      return call === 1 ? selectQuery : updateQuery
    })

    const { result } = renderHook(() => useProfile())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.updatePreferences({ theme: 'dark' })
    })

    expect(result.current.preferences?.theme).toBe('dark')
  })
})
