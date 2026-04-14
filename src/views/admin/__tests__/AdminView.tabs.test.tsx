import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminView } from '../AdminView'
import type { AuthContextValue } from '@/contexts/AuthContext'

const mockContextValue: AuthContextValue = {
  session: null,
  user: null,
  member: { id: 'admin-1', name: 'Admin User' } as never,
  clients: [],
  isAdmin: true,
  impersonatedClientId: null,
  setImpersonatedClientId: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  authError: null,
  loading: false,
  refreshProfile: vi.fn(),
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
    auth: { admin: { listUsers: vi.fn(() => Promise.resolve({ data: { users: [] }, error: null })) } },
  },
}))

vi.mock('./hooks/useAdminData', () => ({
  useAdminData: () => ({
    clients: [{ id: 'c1', name: 'Acme', slug: 'acme' }],
    users: [{ id: 'u1', name: 'Ana', role: 'Designer', avatar: 'AN', auth_user_id: null, access_role: 'user', email: null, avatar_url: null }],
    auditLogs: [],
    loading: false,
    loadingInitial: false,
    error: null,
    userClientsMap: {},
    pendingUsers: [],
    refreshAll: vi.fn(),
    fetchAuditLogs: vi.fn(),
    createClient: vi.fn(),
    updateClient: vi.fn(),
    deleteClient: vi.fn(),
    linkUserToClient: vi.fn(),
    unlinkUserFromClient: vi.fn(),
    setUserRole: vi.fn(),
    createUser: vi.fn(),
    setUserAuthId: vi.fn(),
    updateUser: vi.fn(),
    listGoogleUsers: vi.fn().mockResolvedValue([]),
  }),
}))

vi.mock('@/contexts/AuthContext', async () => {
  const actual = await vi.importActual('@/contexts/AuthContext')
  return {
    ...actual,
    useAuthContext: () => mockContextValue,
  }
})

describe('AdminView — navegação de abas', () => {
  beforeEach(() => {
    mockContextValue.impersonatedClientId = null
    vi.clearAllMocks()
  })

  it('aba Clientes está ativa por padrão', async () => {
    render(<AdminView />)
    const tab = screen.getByRole('tab', { name: /clientes/i })
    expect(tab).toHaveAttribute('aria-selected', 'true')
  })

  it('clicar em Usuários exibe o painel de usuários', async () => {
    const user = userEvent.setup()
    render(<AdminView />)
    await user.click(screen.getByRole('tab', { name: /usuários/i }))
    await waitFor(() => {
      expect(screen.getByRole('tabpanel', { name: /usuários/i })).toBeInTheDocument()
    })
  })

  it('clicar em Audit Log exibe o painel de audit', async () => {
    const user = userEvent.setup()
    render(<AdminView />)
    await user.click(screen.getByRole('tab', { name: /audit log/i }))
    await waitFor(() => {
      expect(screen.getByRole('tabpanel', { name: /audit/i })).toBeInTheDocument()
    })
  })
})

describe('AdminView — impersonation', () => {
  it('exibe banner quando impersonatedClientId está presente', () => {
    mockContextValue.impersonatedClientId = 'client-xyz'
    render(<AdminView />)
    expect(screen.getByText('Visualizando como cliente')).toBeInTheDocument()
  })

  it('botão Sair da visão chama setImpersonatedClientId(null)', async () => {
    mockContextValue.impersonatedClientId = 'client-xyz'
    const user = userEvent.setup()
    render(<AdminView />)
    await user.click(screen.getByRole('button', { name: /sair da visão/i }))
    expect(mockContextValue.setImpersonatedClientId).toHaveBeenCalledWith(null)
  })

  it('não exibe banner quando impersonatedClientId é null', () => {
    mockContextValue.impersonatedClientId = null
    render(<AdminView />)
    expect(screen.queryByText('Visualizando como cliente')).not.toBeInTheDocument()
  })
})