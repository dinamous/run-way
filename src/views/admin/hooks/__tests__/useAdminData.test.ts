import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
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

vi.mock('@/lib/adminApi', () => ({
  adminCreateClient: vi.fn(),
  adminUpdateClient: vi.fn(),
  adminDeleteClient: vi.fn(),
  adminCreateMember: vi.fn(),
  adminUpdateMember: vi.fn(),
  adminDeactivateMember: vi.fn(),
  adminReactivateMember: vi.fn(),
  adminSetMemberAuthId: vi.fn(),
  adminLinkUserToClient: vi.fn(),
  adminUnlinkUserFromClient: vi.fn(),
  adminSetUserRole: vi.fn(),
  adminListAuthUsers: vi.fn().mockResolvedValue([]),
}))

import { useAdminData } from '../useAdminData'
import * as adminApi from '@/lib/adminApi'

describe('useAdminData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('deactivateUser', () => {
    it('desativa o member e retorna true', async () => {
      vi.mocked(adminApi.adminDeactivateMember).mockResolvedValue({ deactivated_at: '2024-01-01T00:00:00Z' })
      const { result } = renderHook(() => useAdminData())

      let ok: boolean | undefined
      await act(async () => {
        ok = await result.current.deactivateUser('member-1')
      })

      expect(ok).toBe(true)
      expect(mockPatchUser).toHaveBeenCalledWith('member-1', { is_active: false, deactivated_at: '2024-01-01T00:00:00Z' })
    })

    it('retorna false quando a desativação falha', async () => {
      vi.mocked(adminApi.adminDeactivateMember).mockRejectedValue(new Error('update failed'))
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
      vi.mocked(adminApi.adminReactivateMember).mockResolvedValue(undefined)
      const { result } = renderHook(() => useAdminData())

      let ok: boolean | undefined
      await act(async () => {
        ok = await result.current.reactivateUser('member-1')
      })

      expect(ok).toBe(true)
      expect(mockPatchUser).toHaveBeenCalledWith('member-1', { is_active: true, deactivated_at: null })
    })

    it('retorna false quando a reativação falha', async () => {
      vi.mocked(adminApi.adminReactivateMember).mockRejectedValue(new Error('update failed'))
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
      vi.mocked(adminApi.adminSetMemberAuthId).mockResolvedValue(undefined)
      const { result } = renderHook(() => useAdminData())

      mockFetchPendingUsers.mockClear()
      await act(async () => {
        await result.current.setUserAuthId('member-1', 'auth-uuid-new', null)
      })

      expect(mockFetchPendingUsers).toHaveBeenCalled()
    })
  })
})
